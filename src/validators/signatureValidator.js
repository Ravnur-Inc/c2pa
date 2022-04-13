import { decodeFirstSync, encodeOne } from 'cbor';
import C2PAValidationError from '../errors/C2PAValidationError';
import X509Chain from '../crypto/x509';
import { coseAlgorithms, DigitalSignature } from '../crypto/signatures';

export default class SignatureValidator {
    validate(manifestStore, manifest, trackName) {
        return new Promise((resolve, reject) => {
            let claim = manifest.resolveClaim();
            let claimSignatureUri = claim.signature;

            let claimSignature = manifestStore.resolveBox(claimSignatureUri);
            if (!claimSignature) {
                return reject(new C2PAValidationError(`[${trackName}] Unable to resolve a claim signature from the claim.`, claim));
            } else {
                console.debug(`[C2PA] [${trackName}] Successfully extracted manifest claim signature.`, claimSignature);
            }

            let [pHeaders, uHeaders, , signature] = claimSignature.value;
            if (!uHeaders.x5chain) {
                return reject(new C2PAValidationError(`[${trackName}] Unable to locate x5chain unprotected header in the claim signature.`, claimSignature.value));
            } else {
                console.debug(`[C2PA] [${trackName}] Successfully extracted x.509 certificate chain.`, uHeaders.x5chain.map(x => x.toString('hex')));
            }

            let x5chain;
            try {
                x5chain = new X509Chain(uHeaders.x5chain);
            } catch (error) {
                return reject(new C2PAValidationError(`[${trackName}] Unable to parse x.509 certificate chain from the claim signature unprotected headers.`, uHeaders, error));
            }

            console.debug(`[C2PA] [${trackName}] Successfully parsed x.509 certificate chain.`, x5chain.certChain.map(x => x.toJSON()));

            x5chain.validate().then(validationResult => {
                if (!validationResult) {
                    return reject(new C2PAValidationError(`[${trackName}] The certificate chain verification has failed.`, validationResult));
                }

                let decodedPrivateHeaders = decodeFirstSync(pHeaders);

                let signatureAgorithm = coseAlgorithms[decodedPrivateHeaders.get(1)];
                if (!signatureAgorithm) {
                    return reject(new C2PAValidationError(`[${trackName}] Unsupported algorithm specified in the claim signature.`, claimSignature));
                }

                let certPublicKey = x5chain.getSubjectPublicKeyInfo();
                let sigStructure = ["Signature1", pHeaders, new ArrayBuffer(0), encodeOne(claim)];
                let toBeSigned = encodeOne(sigStructure);

                let digitalSignature = new DigitalSignature(signatureAgorithm);
                let result = digitalSignature.verify(toBeSigned, signature, certPublicKey);

                if (!result) {
                    return reject(new C2PAValidationError(`[${trackName}] The claim signature verification has failed.`, {
                        payload: toBeSigned.toString('hex'),
                        signature: signature.toString('hex'),
                        key: certPublicKey
                    }));
                }

                console.debug(`[C2PA] [${trackName}] The claim signature was successfully verified.`);
                return resolve(result);
            });
        });
    }
}