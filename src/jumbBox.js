export default class JumbBox {
    root = null;

    constructor(jumbBox) {
        this.root = jumbBox;
    }

    resolveUri(uri) {
        let prefix = "self#jumbf="

        if (!uri || !uri.startsWith(prefix)) {
            return null;
        }

        let boxes = uri.slice(prefix.length).split("/");
        return this.resolvePath(this.root, boxes);
    }

    resolvePath(boxWrapper, inputBoxes) {
        let contentBoxes = boxWrapper.content;

        let descriptionBox = contentBoxes[0];
        let boxToResolve = inputBoxes[0];
        if (descriptionBox.type != "jumd" || descriptionBox.content.label != boxToResolve) {
            return null;
        }

        let unprocessedBoxes = inputBoxes.slice(1);
        if (unprocessedBoxes.length === 0) {
            return boxWrapper;
        }

        for (let i = 1; i < contentBoxes.length; i++) {
            let result = this.resolvePath(contentBoxes[i], unprocessedBoxes);
            if (result !== null) {
                return result;
            }
        }

        return null;
    }

    resolveUuidString(uuidString) {
        let descriptionBox = this.getDescriptionBox(this.root);
        if (descriptionBox.content.uuidString !== "c2ma") {
            return null;
        }

        let contentBoxes = this.getContentBoxes(this.root);
        for (let i = 0; i < contentBoxes.length; i++) {
            let jumdBox = this.getDescriptionBox(contentBoxes[i]);

            if (jumdBox.content.uuidString == uuidString) {
                return this.getContentBoxes(contentBoxes[i]);
            }
        }

        return null;
    }

    resolveLabel(label) {
        let descriptionBox = this.getRootDescriptionBox();
        let contentBoxes = this.getContentBoxes(this.root);

        if (descriptionBox.content.label == label) {
            return contentBoxes;
        }

        for (let i = 0; i < contentBoxes.length; i++) {
            let jumdBox = this.getDescriptionBox(contentBoxes[i]);

            if (jumdBox != null && jumdBox.content.label == label) {
                return this.getContentBoxes(contentBoxes[i]);
            }
        }

        return null;
    }

    getRootDescriptionBox() {
        return this.getDescriptionBox(this.root);
    }

    getDescriptionBox(boxWrapper) {
        if (!Array.isArray(boxWrapper.content)) {
            return null;
        }

        let boxes = boxWrapper.content;
        let descriptionBox = boxes[0];

        if (descriptionBox.type !== "jumd") {
            return null;
        }

        return descriptionBox;
    }

    getContentBoxes(boxWrapper) {
        let boxes = boxWrapper.content;
        return boxes.slice(1);
    }
}