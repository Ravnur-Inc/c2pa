import { createHash } from 'crypto';
import { ec, eddsa } from 'elliptic';
import NodeRSA from 'node-rsa';

// C2PA Digital Signatures allowed list as per C2PA Specification 12.2 Digital Signatures.
// https://c2pa.org/public-draft/C2PA_Specification.html#_digital_signatures
export const allowedAlgorithms = {
    ES256: 'ES256',
    ES384: 'ES384',
    ES512: 'ES512',
    PS256: 'PS256',
    PS384: 'PS384',
    PS512: 'PS512',
    EdDSA: 'EdDSA', // Note: only ed25519 is supported
};

// COSE Algorithms registry. The key from the registry provided as value of 'alg' protected header in COSE.
// https://www.iana.org/assignments/cose/cose.xhtml#algorithms
export const coseAlgorithms = {};
coseAlgorithms[-7] = allowedAlgorithms.ES256;
coseAlgorithms[-35] = allowedAlgorithms.ES384;
coseAlgorithms[-36] = allowedAlgorithms.ES512;
coseAlgorithms[-37] = allowedAlgorithms.PS256;
coseAlgorithms[-38] = allowedAlgorithms.PS384;
coseAlgorithms[-39] = allowedAlgorithms.PS512;
coseAlgorithms[-8] = allowedAlgorithms.EdDSA;

// Mapping between algorithm and crypto library parameters. 
export const algorithmParameters = {};
algorithmParameters[allowedAlgorithms.ES256] = { sign: 'p256', digest: 'sha256' };
algorithmParameters[allowedAlgorithms.ES384] = { sign: 'p384', digest: 'sha384' };
algorithmParameters[allowedAlgorithms.ES512] = { sign: 'p521', digest: 'sha512' };
algorithmParameters[allowedAlgorithms.PS256] = { scheme: 'pss', hash: 'sha256', saltLength: 32 };
algorithmParameters[allowedAlgorithms.PS384] = { scheme: 'pss', hash: 'sha384', saltLength: 48 };
algorithmParameters[allowedAlgorithms.PS512] = { scheme: 'pss', hash: 'sha512', saltLength: 64 };
algorithmParameters[allowedAlgorithms.EdDSA] = { curve: 'ed25519' };

export class DigitalSignature {
    constructor(algorithm) {
        this.algorithm = algorithm;
    }

    verify(payloadBytes, signatureBytes, certPublicKey) {
        let algParameters = algorithmParameters[this.algorithm];

        if (this.algorithm.startsWith('ES')) {
            let key = new ec(algParameters.sign).keyFromPublic({
                x: Buffer.from(certPublicKey.parsedKey.x).toString('hex'),
                y: Buffer.from(certPublicKey.parsedKey.y).toString('hex')
            }, 'hex');

            let signature = { r: signatureBytes.slice(0, signatureBytes.length / 2), s: signatureBytes.slice(signatureBytes.length / 2) };
            let payloadHash = createHash(algParameters.digest).update(payloadBytes).digest();

            return key.verify(payloadHash, signature);
        }

        if (this.algorithm.startsWith('PS')) {
            let key = new NodeRSA().importKey({
                n: Buffer.from(certPublicKey.parsedKey.modulus.valueBlock.valueHex),
                e: certPublicKey.parsedKey.publicExponent.valueBlock.valueDec
            }, 'components-public');

            key.setOptions({ signingScheme: algParameters });

            return key.verify(payloadBytes, signatureBytes, 'buffer', 'buffer');
        }

        if (this.algorithm === allowedAlgorithms.EdDSA) {
            let keyBuffer = Buffer.from(certPublicKey.subjectPublicKey.valueBlock.valueHex);
            let key = new eddsa(algParameters.curve).keyFromPublic([...keyBuffer]);

            return key.verify(Buffer.from(payloadBytes), [...Buffer.from(signatureBytes)]);
        }

        return false;
    }
}
