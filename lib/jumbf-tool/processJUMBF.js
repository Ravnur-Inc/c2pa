var unflat = require('./unflat.js');
var unbox = require('./unbox.js');

// given a Buffer to a JUMBF container
// this method will JSON-ify it and log that to console
function processJUMBF(jumbf) {
	if (jumbf.length > 0) {
		boxes = [];
		var boxFragment = unbox(jumbf, 0, boxes.push.bind(boxes));
		var outObj = unflat(boxes);
		return outObj;
	} else {
		console.error("No JUMBF found!"); 
	}
}

module.exports = processJUMBF