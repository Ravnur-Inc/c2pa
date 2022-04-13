var bitwise = require('bitwise');

function readNULLTerminatedString( uint8arr, off ) {
	var co = off;
	var str = [];
	var b=1;
	
	while( b != 0 ) {
		b = uint8arr[co++];
		if (b!=0) str.push( b );
	};
	
	return String.fromCharCode.apply(String, str);
}

function bfdb_parse (data) {
	var toggles = data[0],
		mediaType = "",
		fName = "";

	var bits = bitwise.byte.read(toggles),
		bitsBool = bitwise.bits.toBoolean(bits),
		hasName = bitsBool[7],
		isExternal = bitsBool[6];

	mediaType = readNULLTerminatedString(data, 1);

	if ( hasName ) {
		// mediaType starts at byte 1, plus it's length + the null byte
		fName = readNULLTerminatedString(data, mediaType.length+2);
	}

	return {
		toggles : toggles,
		"mediaType" : mediaType,
		"filename" : fName,
		isExternal : isExternal
	};
}

function bfdb_build (data) {
	// do nothing on building...
	return data;
}

module.exports = {
	parse: bfdb_parse,
	build: bfdb_build
};