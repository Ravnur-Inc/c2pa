var bitwise = require('bitwise');
// var intobuffer = require('intobuffer');

function bytesToHex(uint8arr, off, nbBytes) {
    if (!uint8arr) {
      return "";
    }

    var arr = uint8arr.slice(off, nbBytes + off);
    var hexStr = "";

    for (var i = 0; i < arr.length; i++) {
      var hex = (arr[i] & 0xff).toString(16);
      hex = hex.length === 1 ? "0" + hex : hex;
      hexStr += hex;
    }

    return hexStr.toUpperCase();
  }

  function bytesToASCII(uint8arr, off, nbBytes) {
    if (!uint8arr) {
      return "";
    }

    var arr = uint8arr.slice(off, nbBytes + off);
    return String.fromCharCode.apply(String, arr);
}

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



function jumd_parse (data) {

	var uuid = bytesToHex(data, 0, 15);					// 16 bytes of data
		uuidStr = readNULLTerminatedString(data, 0);	// and a string version
		toggles = data[16]
		label = "";
	var bits = bitwise.byte.read(toggles),
		bitsBool = bitwise.bits.toBoolean(bits),
		canRequest = bitsBool[7],
		hasLabel = bitsBool[6],
		hasID = bitsBool[5],
		hasSig = bitsBool[4],
		hasPrivateBox = bitsBool[3];

	if ( hasLabel ) {
		label = readNULLTerminatedString(data, 17);
	}

	if ( hasPrivateBox ) {
		// Just skip the content of private box
	}

	return {
		uuid : uuid,
		"uuidString" : uuidStr,
		toggles : toggles,
		label : label
	};
}

function jumd_build (data) {
	// do nothing on building...
	return data;
}

module.exports = {
	parse: jumd_parse,
	build: jumd_build
};