import { Certificate, CertificateChainValidationEngine } from 'pkijs';
import { fromBER } from 'asn1js';
import { toArrayBuffer } from '../helpers/arrayBufferHelper'

const publicKeyAlgorithms = {
    ecPublicKey: "1.2.840.10045.2.1",
    rsaEncryption: "1.2.840.113549.1.1.1",
    rsaPss: "1.2.840.113549.1.1.10",
}

const signatureAlgorithms = {
    ecdsaWithSha256: "1.2.840.10045.4.3.2",
    ecdsaWithSha384: "1.2.840.10045.4.3.3",
    ecdsaWithSha512: "1.2.840.10045.4.3.4",
    sha256WithRsaEncryption: "1.2.840.113549.1.1.11",
    sha384WithRsaEncryption: "1.2.840.113549.1.1.12",
    sha512WithRsaEncryption: "1.2.840.113549.1.1.13",
    rsaPss: "1.2.840.113549.1.1.10",
    ed25519: "1.3.101.112",
}

const rsaPssHashAlgorithms = {
    sha256: "2.16.840.1.101.3.4.2.1",
    sha384: "2.16.840.1.101.3.4.2.2",
    sha512: "2.16.840.1.101.3.4.2.3",
};

const ecPublicKeyCurves = {
    prime256v1: "1.2.840.10045.3.1.7",
    secp384r1: "1.3.132.0.34",
    secp521r1: "1.3.132.0.35",
};

const certExtensions = {
    basicConstraints: "2.5.29.19",
    authorityKeyIdentifier: "2.5.29.35",
    subjectKeyIdentifier: "2.5.29.14",
    keyUsage: "2.5.29.15",
    extendedKeyUsage: "2.5.29.37",
}

const keyPurposes = {
    emailProtection: "1.3.6.1.5.5.7.3.4",
}

export default class X509Chain {
    certChain = [];

    constructor(certArray) {
        certArray.forEach(elem => {
            let arrayBuf = toArrayBuffer(elem);
            let asn1 = fromBER(arrayBuf);
            let cert = new Certificate({ schema: asn1.result });

            this.certChain.push(cert);
        });
    }

    validate() {

        for (let cert of this.certChain) {
            let validationResult = this.verifyCert(cert);

            if (!validationResult.result) {
                validationResult.cert = cert;
                return Promise.resolve(validationResult);
            }
        }

        // TODO: Check whether certificate present in private credential store before building a trust chain
        // TODO: This should be a pre-configured list of trusted anchors
        var trustedCerts = [];
        trustedCerts.push(this.certChain[this.certChain.length - 1]);

        var certChainVerificationEngine = new CertificateChainValidationEngine({
            trustedCerts,
            certs: this.certChain,
            crls: []
        });

        return certChainVerificationEngine.verify();
    }

    verifyCert(cert) {
        if (cert.version !== 2) {
            return new ValidationResult(false, "Certificate version must be v3.");
        }

        let now = new Date();
        if (now < cert.notBefore.value) {
            return new ValidationResult(false, "Certificate is not valid at the current moment in time.");
        }

        if (cert.issuerUniqueID !== undefined || cert.subjectUniqueID !== undefined) {
            return new ValidationResult(false, "Certificate should not contain 'issuerUniqueID' or 'subjectUniqueID'.");
        }

        if (!this.isExtensionsValid(cert.extensions)) {
            return new ValidationResult(false, "Certificate extensions does not comply with C2PA spec.");
        }

        if (!this.isPublicKeyValid(cert.subjectPublicKeyInfo)) {
            return new ValidationResult(false, "Certificate public key does not comply with C2PA spec.");
        }

        if (!this.isSignatureValid(cert.signatureAlgorithm)) {
            return new ValidationResult(false, "Certificate signature does not comply with C2PA spec.");
        }

        return new ValidationResult(true);
    }

    isExtensionsValid(extensions) {
        if (!extensions.find(x => x.extnID == certExtensions.basicConstraints)) {
            return false;
        }

        if (!extensions.find(x => x.extnID == certExtensions.authorityKeyIdentifier)) {
            return false;
        }

        if (!extensions.find(x => x.extnID == certExtensions.subjectKeyIdentifier)) {
            return false;
        }

        let keyUsageExtn = extensions.find(x => x.extnID == certExtensions.keyUsage);
        if (keyUsageExtn === undefined || !keyUsageExtn.critical) {
            return false;
        }

        // TODO: Validate the rest of key purposes defined in the C2PA spec
        let extKeyUsageExtn = extensions.find(x => x.extnID == certExtensions.extendedKeyUsage);
        if (extKeyUsageExtn !== undefined && extKeyUsageExtn.parsedValue.keyPurposes[0] !== keyPurposes.emailProtection) {
            return false;
        }

        return true;
    }

    isPublicKeyValid(subjPubKey) {
        if (subjPubKey.algorithm.algorithmId === publicKeyAlgorithms.ecPublicKey) {
            if (!Object.values(ecPublicKeyCurves).includes(subjPubKey.parsedKey.namedCurve)) {
                return false;
            }
        }

        if (subjPubKey.algorithm.algorithmId === publicKeyAlgorithms.rsaEncryption ||
            subjPubKey.algorithm.algorithmId === publicKeyAlgorithms.rsaPss) {
            if (subjPubKey.parsedKey.modulus.valueBlock.valueHex.byteLength < 256) {
                return false;
            }
        }

        return true;
    }

    isSignatureValid(signature) {
        if (!Object.values(signatureAlgorithms).includes(signature.algorithmId)) {
            return false;
        }

        // Check requirements for "id-RSASSA-PSS" algorithm
        // https://datatracker.ietf.org/doc/html/rfc8017#appendix-A.2.3
        if (signature.algorithmId === signatureAlgorithms.rsaPss) {
            let algParams = signature.algorithmParams;

            if (algParams === undefined ||
                algParams.hashAlgorithm == undefined ||
                algParams.maskGenAlgorithm == undefined) {
                return false;
            }

            if (!Object.values(rsaPssHashAlgorithms).includes(algParams.hashAlgorithm.algorithmId)) {
                return false;
            }

            if (algParams.hashAlgorithm.algorithmId !== algParams.maskGenAlgorithm.algorithmId) {
                return false;
            }
        }

        return true;
    }

    getSubjectPublicKeyInfo() {
        let signerCert = this.certChain[0];
        return signerCert.subjectPublicKeyInfo;
    }
}

class ValidationResult {
    result;
    resultMessage;

    constructor(success, message) {
        this.result = success;
        this.resultMessage = message;
    }
}