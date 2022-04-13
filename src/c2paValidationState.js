import C2PAValidationError from './errors/C2PAValidationError';

export const c2paBoxUuid = "d8fec3d61b0e483c92975828877ec481";

export const ValidationResult = {
    Succeed: "Succeed",
    Failed: "Failed",
    NoData: "NoData"
};

export class C2PAValidationState {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.tracks = new Map();
        this.result = undefined;
    }

    shouldRunValidation() {
        return this.result === undefined || this.result === ValidationResult.Succeed;
    }

    setSucceed(claims) {
        if (this.result === ValidationResult.Failed || this.result === ValidationResult.NoData) {
            return;
        }

        this.result = ValidationResult.Succeed;

        claims.forEach(x => x.valid = this.result);
        this.eventBus.emit('c2painit', claims);
    }

    setNoData(trackName) {
        if (this.result === ValidationResult.Failed) {
            return;
        }

        this.result = ValidationResult.NoData;

        this.eventBus.emit('c2painit', [{ valid: this.result }]);
        console.warn(`[C2PA] [${trackName}] The video is not C2PA compatible. Init segment is missing c2pa box.`);
    }

    setFailed(error) {
        this.result = ValidationResult.Failed;
        this.eventBus.emit('c2painit', [{ valid: this.result }]);

        if (error instanceof C2PAValidationError) {
            console.error(`[C2PA] ${error.message}`, error.messageData);
        } else {
            console.error(`[Exception]`, error);
            this.eventBus.emit('c2paexception');
            throw error;
        }
    }
}

export class TrackData {
    constructor(initSegmentBytes, initSegmentMP4Container, manifestBytes) {
        this.initSegmentBytes = initSegmentBytes;
        this.initSegmentMP4Container = initSegmentMP4Container;
        this.manifestBytes = manifestBytes;
    }
}
