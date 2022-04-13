import { createHash } from 'crypto';
import { MerkleNode, MerkleRow } from '../crypto/merkle';
import { equalBuffers } from '../helpers/arrayBufferHelper';

export default class ContentValidator {
    initialize(trackData, chunkData) {
        // 1. Locate an assertion and corresponding markle row by uniqueId and locaId
        this.trackMerkleRow = trackData.contentBindingAssertion.merkle.find(x => x.localId === chunkData.localId && x.uniqueId === chunkData.uniqueId);
        this.chunkMerkleRow = chunkData;
        this.hashAlgorithm = this.trackMerkleRow.alg || this.trackData.contentBindingAssertion.alg;
        this.exclusions = trackData.contentBindingAssertion.exclusions;
    }

    validateInitSegmentHash(initSegmentMP4Container, initSegmentBytes, trackName) {
        // 2. Create the hash using alg and exclusions[]
        let initSegmentBytesToHash = this.getArrayBufferToHash(initSegmentMP4Container, initSegmentBytes, this.exclusions);

        let actualHash = createHash(this.hashAlgorithm).update(initSegmentBytesToHash).digest();
        let expectedHash = this.trackMerkleRow.initHash;

        console.debug(`[C2PA] [${trackName}] The init segment hash was caclulated.`, { actualHash, expectedHash });

        return equalBuffers(actualHash, expectedHash);
    }

    validateDataSegmentHash(chunkMP4Container, chunkBytes, trackName) {
        // 3. Hash chunk bytes using alg and exclusions[]
        let chunkBytesToHash = this.getArrayBufferToHash(chunkMP4Container, chunkBytes, this.exclusions);
        let chunkHash = createHash(this.hashAlgorithm).update(chunkBytesToHash).digest();

        console.debug(`[C2PA] [${trackName}] The chunk data hash was caclulated.`, { chunkHash });

        // 4. Validate part of Merkle tree
        let merkleNode = new MerkleNode(chunkHash, this.chunkMerkleRow.location, this.trackMerkleRow.count);
        let merkleRow = new MerkleRow(this.trackMerkleRow.hashes, this.hashAlgorithm);
        return merkleRow.validate(merkleNode, this.chunkMerkleRow.hashes);
    }

    getArrayBufferToHash(inputContainer, inputBytes, exclusions) {
        let inputBoxes = inputContainer.boxes;

        let exclusionsMap = [];
        for (let exclusion of exclusions) {
            let path = exclusion.xpath.split("/").filter(x => x);
            let box = this.resolveMP4BoxByPath(inputBoxes, path);

            if (box !== null) {
                exclusionsMap.push({ exclusion, box });
            }
        }

        exclusionsMap = exclusionsMap.sort((x, y) => x.box.start - y.box.start);

        let offset = 0;
        let includeRanges = [];
        let boxOffset;
        let boxLength;

        for (let exclusionEntry of exclusionsMap) {
            boxOffset = exclusionEntry.box.start;
            boxLength = exclusionEntry.box.size;

            // Include all bytes from previous exclusion till start of new exclusion
            includeRanges = includeRanges.concat(inputBytes.slice(offset, boxOffset));
            offset = boxOffset;

            // Check 'exact' and 'flags' fields to verify whether the exclusion match segment box
            if (exclusionEntry.exclusion.flags) {
                let flagsFromBox = exclusionEntry.box.flags;
                let flagsFromExclusion = this.readUint24(new DataView(exclusionEntry.exclusion.flags.buffer), exclusionEntry.exclusion.flags.byteOffset);
                let exact = exclusionEntry.exclusion.exact;

                if (exact !== false && flagsFromBox !== flagsFromExclusion) {
                    continue;
                }

                if (exact === false && !(flagsFromBox & flagsFromExclusion)) {
                    continue;
                }
            }

            if (exclusionEntry.exclusion.subset) {
                let includeFrom = boxOffset;

                // Include everything except specified by subset { offset, length }
                // TODO: Check data field to UUID boxes
                exclusionEntry.exclusion.subset.forEach(subset => {
                    const excludeFrom = boxOffset + subset.offset;

                    if (excludeFrom > includeFrom) {
                        includeRanges = includeRanges.concat(inputBytes.slice(includeFrom, excludeFrom));
                    }

                    if (subset.length === 0) {
                        includeFrom = boxOffset + boxLength;
                    } else {
                        includeFrom = excludeFrom + subset.length;
                    }
                });

                if (includeFrom < boxOffset + boxLength) {
                    includeRanges = includeRanges.concat(inputBytes.slice(includeFrom, boxOffset + boxLength));
                }
            }

            offset = boxOffset + boxLength;
        };

        // Include the rest of file after the last exclusion
        includeRanges = includeRanges.concat(inputBytes.slice(offset, inputBytes.length));

        includeRanges = includeRanges.filter(a => a.length > 0);
        let resultArrayLength = includeRanges.reduce((sum, elem) => sum + elem.length, 0);
        let resultBytes = new Uint8Array(resultArrayLength);

        // TODO: Simplify via reduce
        let currentOffset = 0;
        includeRanges.forEach(h => {
            resultBytes.set(h, currentOffset);
            currentOffset += h.length;
        });

        return resultBytes;
    }

    readUint24(dataView, position) {
        let result = 0;

        result = dataView.getUint8(position) << 16;
        result |= dataView.getUint8(position + 1) << 8;
        result |= dataView.getUint8(position + 2);

        return result;
    }

    // TODO: Add error handling, for resolved box type mismatch, e.g. object instead of array
    resolveMP4BoxByPath(contentBoxes, path) {
        let pathToResolve = path[0];
        let resolvedBox = null;

        for (let i = 0; i < contentBoxes.length; i++) {
            const box = contentBoxes[i];
            if (box.type == pathToResolve) {
                resolvedBox = box;
                break;
            }

        }

        if (resolvedBox === null || path.length === 1) {
            return resolvedBox;
        }

        return this.resolveMP4BoxByPath(resolvedBox.boxes, path.slice(1));
    }
}