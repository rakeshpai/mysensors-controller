var Controller = require("./Controller");

module.exports = function(gateway) {
	return new Controller(gateway);
};

module.exports.usingSerialGateway = function(port, baud) {
	if(!port) throw new Error("Port is required when using the serial gateway.")

	var SerialPort = require("serialport").SerialPort,
		gateway = new SerialPort(port, {baudrate: baud || 115200});

	function connect() {
		console.log("Trying to connect...");
		gateway.open();
	}
	
	gateway.on("open", function() {
		console.log("Connected to serial gateway at", port);
	});

	gateway.on("error", function() {
		console.log("Connection error");
		setTimeout(connect, 1000);
	});

	connect();

	return new Controller(gateway);
};

module.exports.usingEthernetGateway = function(address, port, options) {
	address = address || "192.168.178.66";
	port = port || 5003;
	options = options || {};
	options.timeout = options.hasOwnProperty('timeout') ? options.timeout : 60000;

	var gateway = require("net").Socket();

	function connect() {
		console.log("Trying to connect...");
		gateway.connect(port, address);
		gateway.setEncoding("ascii");
		gateway.setTimeout(options.timeout);
	}

	gateway.on("connect", function() {
		console.log("Connected to ethernet gateway at", address + ":" + port);
	});

	gateway.on("error", function() {
		console.log("Connection error");
		setTimeout(connect, 1000);
	});

	gateway.on("timeout", function() {
		console.log("Timeout");
		gateway.end();
		setTimeout(connect, 1000);
	});

	connect();

	return new Controller(gateway);
};