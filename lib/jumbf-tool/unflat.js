const _  = require('lodash');
const isobmff = require('./isobmff.json');

module.exports = function unflat(data) {
	const tree = [];

	_.forEach(_.sortBy(data, 'id'), function (obj, index, collection) {
		if (obj.parent !== 0) {
			addToParent(obj, tree);
		} else {
			addToTree(obj, tree)
		}
	});

	return tree;
}


function addToParent (data, tree) {
	var parent = findById(data.parent, tree);

	if (parent) {
		addToTree(data, parent.content);
	}
}


function addToTree (data, tree) {
	// if the data is just a buffer of binary data, we currently output "BINARY_DATA"
	//	might be nice to have a CLI flag to output the actual data then too...
	// content = (data.data instanceof Buffer) ? `BINARY_DATA (${data.length} bytes)` : data.data;

	// If data is buffer, return box start and length
	if ((data.data instanceof Buffer)) {
		content = {
			byteOffset: data.data.byteOffset,
			byteLength: data.data.byteLength,
		};
	} else {
		content = data.data;
	}

	let node = {
		id: data.id,
		type: data.type
	}

	if(isobmff.boxContainers.indexOf(data.type) > -1) {
		node.content = [];
		node.rawContent = content;
	} else {
		node.content = content;
	}

	tree.push(node);
}


function findById (id, tree) {
	return _.reduce(tree, function (accumulator, item) {
		if (accumulator !== false) {
			return accumulator;
		}

		if (item.id === id) {
			return item;
		}

		if (item.content instanceof Array) {
			return findById(id, item.content)
		}

		return false;
	}, false);
}