import MP4Box from '../../lib/mp4box/mp4box.all.min.js';

export function parseMP4Buffer(buffer) {
    let mp4Box = MP4Box.createFile();

    buffer.fileStart = 0;
    mp4Box.appendBuffer(buffer);
    mp4Box.flush();

    return mp4Box;
 }
