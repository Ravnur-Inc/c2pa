var isobmff = require('./isobmff.json'); // to be deprecated
var boxes = {
	bfdb: require('./box/bfdb.js'),
	bidb: require('./box/bidb.js'),
	cbor: require('./box/cbor.js'),
	json: require('./box/json.js'),
	jumb: require('./box/jumb.js'),
	jumd: require('./box/jumd.js'),
	moof: require('./box/moof.js'),
	sidx: require('./box/sidx.js'),
	tfdt: require('./box/tfdt.js'),
	traf: require('./box/traf.js'),
};

function boxParse (type, data) {
	if (boxes[type]) {

		if (typeof boxes[type].parse == 'undefined') {
			throw new Error('lib/box/' + type + ' is missing parse method')
		}

		return boxes[type].parse(data);
	} else {
		return data;
	}
}

boxParse.isBoxContainer = function (type) {
	return isobmff.boxContainers.indexOf(type) > -1;
}

module.exports = boxParse;