import C2PAValidationError from "./errors/C2PAValidationError";
import JumbBox from "./jumbBox";
import { HardBindingAssertions } from "./validators/assertionValidator"

export default class Manifest {
    manifestRoot = null;
    manifestType;

    constructor(jumbBox) {
        let boxWrapper = new JumbBox(jumbBox)
        this.manifestRoot = boxWrapper;
        this.manifestType = boxWrapper.getRootDescriptionBox().content.uuidString;
    }

    resolveClaim() {
        let boxes = this.manifestRoot.resolveUuidString("c2cl");
        return boxes[0].content;
    }

    resolveContentAssertion(trackName) {
        let assertionBoxes = this.manifestRoot.resolveLabel('c2pa.assertions');
        let jumbBoxes = assertionBoxes.map(x => new JumbBox(x));

        for (const box of jumbBoxes) {
            for (const assertion of HardBindingAssertions) {
                let result = box.resolveLabel(assertion);
                if (result !== null) {
                    return result[0].content;
                }
            }
        }

        throw new C2PAValidationError(`[C2PA] [${trackName}]Unable to resolve hard binding to content assertion from manifest.`);
    }
}