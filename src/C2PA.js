import {c2paBoxUuid, C2PAValidationState, TrackData} from "./c2paValidationState";
import {parseMP4Buffer} from "./helpers/mp4Helper";
import {equalBuffers} from "./helpers/arrayBufferHelper";
import C2PAValidationError from "./errors/C2PAValidationError";
import ManifestStore from "./manifestStore";
import SignatureValidator from "./validators/signatureValidator";
import AssertionValidator from "./validators/assertionValidator";
import {parse as cborParse} from "../lib/jumbf-tool/box/cbor";
import ContentValidator from "./validators/contentValidator";

export class C2PA {

    constructor(bus) {
        this.c2paState = new C2PAValidationState(bus);
    }

    initSegment(data) {
        if (!this.c2paState.shouldRunValidation()) {
            return;
        }

        for (let trackName in data.tracks) {
            // TODO: Temporary skipping audio tracks. Related ticket https://ravnur.atlassian.net/browse/RMP-715
            // Potential solutions may be accepted when https://ravnur.atlassian.net/browse/RMP-744 will be done
            if (trackName === 'audio') return;

            try {
                let initSegmentBytes = data.tracks[trackName].initSegment;
                let initSegmentMP4Container = parseMP4Buffer(initSegmentBytes.buffer);

                let c2paBox = initSegmentMP4Container[c2paBoxUuid];
                if (c2paBox === undefined) {
                    this.c2paState.setNoData(trackName);
                    return;
                }

                let trackData = this.c2paState.tracks.get(trackName);
                if (trackData !== undefined && !equalBuffers(c2paBox.data, trackData.manifestBytes)) {
                    throw new C2PAValidationError(`[${trackName}] The manifest bytes are different for the current and the first init segments.`);
                }

                trackData = new TrackData(initSegmentBytes, initSegmentMP4Container, c2paBox.data);
                this.c2paState.tracks.set(trackName, trackData);

                let manifestStore = new ManifestStore(c2paBox.data);
                let manifest = manifestStore.resolveManifests()[0];

                if (!manifest) {
                    throw new C2PAValidationError(`[${trackName}] Unable to resolve a manifest from the c2pa box data.`, c2paBox.data);
                } else {
                    console.debug(`[C2PA] [${trackName}] Successfully extracted manifest.`, manifest);
                }

                let claim = manifest.resolveClaim();
                if (!claim) {
                    throw new C2PAValidationError(`[${trackName}] Unable to resolve a claim from the manifest.`, manifest);
                } else {
                    console.debug(`[C2PA] [${trackName}] Successfully extracted manifest claim.`, claim);
                }

                trackData.initSegmentValidationTask = new Promise((resolve) => {
                    let signatureValidator = new SignatureValidator();
                    let assertionValidator = new AssertionValidator();

                    signatureValidator.validate(manifestStore, manifest, trackName)
                        .then(() => assertionValidator.validate(manifestStore, manifest, trackName))
                        .then(() => {
                            let hardBindingAssertion = manifest.resolveContentAssertion(trackName);
                            trackData.contentBindingAssertion = hardBindingAssertion;
                            console.debug(`[C2PA] [${trackName}] Successfully resolved hard-binding assertion from init segment.`, hardBindingAssertion);
                        })
                        .then(() => {
                            const claims = [
                                {
                                    name: claim.claim_generator,
                                    date: null, // FIXME: Add real data
                                    thumbnail: null // FIXME: Add real data
                                }
                            ]

                            this.c2paState.setSucceed(claims);
                            resolve(true);
                        })
                        .catch(error => {
                            this.c2paState.setFailed(error);
                        });
                });
            } catch (error) {
                this.c2paState.setFailed(error);
            }
        }
    }

    validateSegment(data, handleResult) {
        if (!this.c2paState.shouldRunValidation()) {
            return;
        }

        let validationResult = {
            track: data.type,
            start: data.frag.start,
            duration: data.frag.duration,
            valid: false
        }

        try {
            let trackName = data.type;

            // TODO: Temporary skipping audio tracks. Related ticket https://ravnur.atlassian.net/browse/RMP-715
            // Potential solutions may be accepted when https://ravnur.atlassian.net/browse/RMP-744 will be done
            if (trackName === 'audio') return;

            let trackData = this.c2paState.tracks.get(trackName);

            trackData.initSegmentValidationTask.then(() => {
                let chunkBytes = data.data1;
                let chunkMP4Container = parseMP4Buffer(data.data1.buffer);

                let c2paBox = chunkMP4Container[c2paBoxUuid];
                let chunkData = cborParse(c2paBox.data);
                console.debug(`[C2PA] [${trackName}] Successfully extracted video chunk data: `, {
                    chunk: {
                        name: data.frag.relurl,
                        url: data.frag.url
                    }, data: chunkData
                })

                let contentValidator = new ContentValidator();
                contentValidator.initialize(trackData, chunkData);

                if (!contentValidator.validateInitSegmentHash(trackData.initSegmentMP4Container, trackData.initSegmentBytes, trackName)) {
                    console.warn(`[C2PA] [${trackName}] The calculated hash value mismatch value from the init segment.`, data.frag.relurl);

                    validationResult.valid = false;
                    handleResult(validationResult);

                    return;
                }

                console.debug(`[C2PA] [${trackName}] Successfully verified init segment hash for the video chunk: `, data.frag.relurl);

                validationResult.valid = contentValidator.validateDataSegmentHash(chunkMP4Container, chunkBytes, trackName);

                if (!validationResult.valid) {
                    console.warn(`[C2PA] [${trackName}] The calculated hash value mismatch value from expected Merkle tree node.`, data.frag.relurl);
                } else {
                    console.debug(`[C2PA] [${trackName}] Successfully verified data hash for the video chunk: `, data.frag.relurl);
                }

                handleResult(validationResult);
            }).catch(error => {
                this.c2paState.setFailed(error);
            });
        } catch (error) {
            this.c2paState.setFailed(error);
        }
    }
}
