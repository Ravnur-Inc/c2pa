# Ravnur C2PA implementation
A JavaScript library that helps to implement a client for C2PA manifest validation.
C2PA is an open technical standard providing publishers, creators, and consumers the ability to trace the origin of different types of media.
https://c2pa.org/public-draft/

## Get started
1. Import `c2pa` dependency in your `package.json`.
2. Create C2PA object instance.
3. Invoke `c2pa.initSegment(data);` to initialize a segment.
4. Invoke `c2pa.validateSegment(data, validationResultHandler);` to validate a segment.

