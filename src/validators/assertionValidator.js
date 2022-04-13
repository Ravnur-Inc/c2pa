import { encodeOne } from 'cbor';
import { createHash } from 'crypto';
import C2PAValidationError from '../errors/C2PAValidationError';

import { equalBuffers } from '../helpers/arrayBufferHelper';

export const ManifestType = {
    standard: "c2ma",
    update: "c2um",
}

export const HardBindingAssertions = [
    "c2pa.hash.data",
    "c2pa.hash.bmff",
]

const IngredientAssetion = "c2pa.ingredient";

export default class AssertionValidator {
    validate(manifestStore, manifest, trackName) {
        let claim = manifest.resolveClaim();

        if (manifest.manifestType === ManifestType.standard) {
            let assertionNames = claim.assertions.map(a => a.url.split("/").pop());

            if (!assertionNames.find(a => HardBindingAssertions.includes(a))) {
                throw new C2PAValidationError(`[${trackName}] Standard manifest doesn't contain hard binding to content assertions.`);
            }

            // TODO: Validate assertion relations
            if (assertionNames.filter(a => a === IngredientAssetion).length > 1) {
                throw new C2PAValidationError(`[${trackName}] Standard manifest contains more than one ingredient assertions.`);
            }
        } else if (manifest.manifestType === ManifestType.update) {
            // TODO: Validate assertion relations
            if (assertionNames.length !== 1 || assertionNames[0] !== IngredientAssetion) {
                throw new C2PAValidationError(`[${trackName}] Update manifest should contain exactly one ingredient assertion.`);
            }
        } else {
            throw new C2PAValidationError(`[${trackName}] Unexpected manifest type.`, manifest.manifestType);
        }

        // TODO: Validate redacted assertions list

        for (const claimAssertion of claim.assertions) {
            let assertion = manifestStore.resolveBox(claimAssertion.url);

            if (!assertion) {
                throw new C2PAValidationError(`[${trackName}] Unable to locate claim assertion.`, claimAssertion.url);
            }

            let hashAlg = claimAssertion.alg || claim.alg;

            if (!hashAlg) {
                throw new C2PAValidationError(`[${trackName}] Unable to identify hash algorithm for claim assertion.`, claimAssertion);
            }

            let expectedHash = claimAssertion.hash;

            let assertionBytes = manifestStore.resolveBoxBytes(claimAssertion.url);
            let actualHash = createHash(hashAlg).update(assertionBytes).digest();

            if (!equalBuffers(actualHash, expectedHash)) {
                throw new C2PAValidationError(`[${trackName}] The hash value mismatch for claim assertion.`, claimAssertion);
            }

            console.debug(`[C2PA] [${trackName}] Successfully verified claim assertion.`, claimAssertion);
        }

        // TODO: Validate external data

        console.debug(`[C2PA] [${trackName}] Successfully verified all claim assertions.`, claim);
        return true;
    }
}