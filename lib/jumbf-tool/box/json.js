function json_parse (data) {

	const obj = JSON.parse(data);
	return obj;
}

function json_build (data) {
	// do nothing on building...
	return data;
}

module.exports = {
	parse: json_parse,
	build: json_build
};