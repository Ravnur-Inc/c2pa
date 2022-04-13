import processJUMBF from '../lib/jumbf-tool/processJUMBF.js';
import { Buffer } from 'buffer';
import JumbBox from "./jumbBox";
import Manifest from "./manifest";

export default class ManifestStore {
    manifestBytes = null;
    documentRoot = null;

    constructor(buffer) {
        this.manifestBytes = Buffer.from(buffer);
        let manifestBox = processJUMBF(this.manifestBytes);

        if (Array.isArray(manifestBox)) {
            manifestBox = manifestBox[0];
        }

        this.documentRoot = new JumbBox(manifestBox);
    }

    resolveManifests() {
        let containerBox = this.documentRoot.resolveUri("self#jumbf=c2pa");
        let boxes = containerBox.content.slice(1);

        let manifests = [];
        boxes.forEach(box => {
            manifests.push(new Manifest(box))
        });

        return manifests;
    }

    resolveBox(uri) {
        let containerBox = this.documentRoot.resolveUri(uri);
        let boxes = containerBox.content.slice(1);

        return boxes && boxes[0].content;
    }

    resolveBoxBytes(uri) {
        let containerBox = this.documentRoot.resolveUri(uri);

        return this.manifestBytes.subarray(containerBox.rawContent.byteOffset, containerBox.rawContent.byteLength);
    }
}
