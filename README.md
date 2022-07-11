# Ravnur C2PA Implementation
A JavaScript library that helps to implement a client for C2PA manifest validation.

C2PA is an open technical standard providing publishers, creators, and consumers the ability to trace the origin of different types of media.
https://c2pa.org/public-draft/

## Get Started
1. Import `c2pa` dependency in your `package.json`.
2. Create C2PA object instance: `c2pa = new C2PA(manifestValidationCallback);`
3. Invoke `c2pa.initSegment(initSegment);` to validate the init segment.
4. Invoke `c2pa.validateSegment(dataSegment, validationCallback);` to validate the data segment.

## Examples

### Integration with HLS.js

Create HLS object and setup it according to your needs:
```
let hls = new Hls(/* parameters */);
```

Create C2PA object, pass the validation callback as a parameter:
```
let c2pa = new C2PA((validationResult, manifestData) => {
    if (validationResult == ValidationResult.Succeed) {
        alert("Valid c2pa manifest!");
    }

    if (validationResult == ValidationResult.NoData) {
        alert("c2pa manifest was not found!");
    }

    if (validationResult == ValidationResult.Failed) {
        alert("Invalid c2pa manifest!");
    }
});
```

Subscribe to HLS event to validate the init segment:
```
hls.on(Hls.Events.FRAG_PARSING_INIT_SEGMENT, (eventName, initSegmentData) => {
    c2pa.initSegment(initSegmentData);
});
```

Subscribe to HLS event to validate data segments:
```
hls.on(Hls.Events.FRAG_PARSING_DATA, (eventName, segmentData) => {
    c2pa.validateSegment(segmentData, validationResult => {
        alert("Data segment is validated!");
    });
});
```

## API Description

C2PA object provides methods for validating the c2pa manifest, validating the data segments and repoting the result.

### C2PA( *manifestValidationCallback* )

The object consturctor accepts validation callback, that invoked after the validation of the c2pa manifest.

```
manifestValidationCallback: (validationResult, manifestData) => { }

validationResult: ValidationResult // The value from the ValidationResult enum: 'Succeed', 'Failed' or 'NoData'

manifestData: [{
    name: string, // Name of the manifest
    valid: bool // Validation result
}, ...]
```

### initSegment( *initSegmentData* )

This method completes validation of the init segment.

```
initSegmentData: {
    tracks {
        video: {
            initSegment: ArrayBuffer // Raw bytes of the video track init segment
        },
        audio: {
            initSegment: ArrayBuffer // Raw bytes of the audio track init segment
        },
        ...
    }
}
```

### validateSegment( *dataSegment*, *validationCallback*)

This method completes validation of the video segment.

```
dataSegment: {
    type: string, // 'video' or 'audio' segment
    frag: {
        start: number, // 0-based offset of the segment start time second
        duration: number, // duration of the segment in seconds
    },
    data1: ArrayBuffer // Raw bytes of the data segment
}

validationCallback: validationResult => { }

validationResult = {
    track: string, // 'video' or 'audio' segment
    start: number, // 0-based offset of the segment start time second
    duration: number, // duration of the segment in seconds
    valid: bool // whether validation succeed
}

```