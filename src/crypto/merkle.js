import { createHash } from 'crypto';
import { concatBuffers, equalBuffers } from "../helpers/arrayBufferHelper";

export class MerkleRow {
    nodes;
    depth;
    hashAlgorithm;

    constructor(nodes, alg) {
        this.nodes = nodes;
        this.depth = Math.ceil(Math.log2(nodes.length));
        this.hashAlgorithm = alg;
    }

    validate(node, hashes) {
        let currentNode = node;
        currentNode.adjustForLastNode(this.depth);

        let hashNodes = hashes ? [...hashes] : [];

        while (currentNode.rowDepth > this.depth) {
            let neighborNodeValue = hashNodes.shift();

            currentNode = currentNode.getParentNode(neighborNodeValue, this.hashAlgorithm);
            currentNode.adjustForLastNode(this.depth);
        }

        return equalBuffers(this.nodes[currentNode.index], currentNode.value);
    }
}

export class MerkleNode {
    value;
    index;
    rowDepth;
    rowLength;

    constructor(value, index, rowLength) {
        this.value = value;
        this.index = index;
        this.rowLength = rowLength;
        this.rowDepth = Math.ceil(Math.log2(this.rowLength));
    }

    // When the node is the last in a row and doesn't have a neighbor
    // the value of the parent node in the tree equals to the currend node value
    adjustForLastNode(minDepth) {
        while (this.index === this.rowLength - 1 && this.index % 2 === 0 && this.rowDepth > minDepth) {
            this.index = Math.floor(this.index / 2);
            this.rowLength = Math.ceil(this.rowLength / 2);
            this.rowDepth--;
        }
    }

    getParentNode(neighborNodeValue, hashAlgorithm) {
        let combinedValues;

        if (this.index % 2 === 0) {
            combinedValues = concatBuffers(this.value, neighborNodeValue);
        } else {
            combinedValues = concatBuffers(neighborNodeValue, this.value);
        }

        let parentHash = createHash(hashAlgorithm).update(combinedValues).digest();

        return new MerkleNode(parentHash, Math.floor(this.index / 2), Math.ceil(this.rowLength / 2));
    }
}