export function equalBuffers(a, b) {
    if (a.byteLength !== b.byteLength) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

export function concatBuffers(...arrays) {
    let size = arrays.reduce((a, b) => a + b.byteLength, 0);
    let result = new Uint8Array(size);

    let offset = 0;
    for (let arr of arrays) {
        result.set(arr, offset);
        offset += arr.byteLength;
    }

    return result;
}

export function toArrayBuffer(buffer) {
    var arrayBuffer = new ArrayBuffer(buffer.length);

    var view = new Uint8Array(arrayBuffer);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    
    return arrayBuffer;
}