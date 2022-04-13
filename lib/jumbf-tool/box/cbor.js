const cbor = require('cbor')

function cbor_parse (data) {

	var decodeArr;

	decodeArr = cbor.decodeAllSync(data, (error, obj) => {
		// If there was an error, error != null
		// obj is the unpacked object
		assert.ok(obj === true)
	  })

	return decodeArr[0];
}

function cbor_build (data) {
	// do nothing on building...
	return data;
}

module.exports = {
	parse: cbor_parse,
	build: cbor_build
};