export default class C2PAValidationError extends Error {
    constructor(message, messageData) {
        super(message);
        this.messageData = messageData;
        this.name = "C2PAValidationError";
    }
}