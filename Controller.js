var split = require("split"),
	EE = require("events"),
	util = require("util"),
	_ = require("fn-helpers"),
	fs = require("fs"),
	path = require("path"),

	enums = require("./enums");

var firmwareBlockSize = 16,
	broadcastAddress = 255,
	fullNodeId = 255;

function Controller(gateway) {
	var self = this;
	this.gateway = gateway;
	this.nodes = [];
	this.debug = false;

	this._saveNeeded = false;

	EE.call(this);

	try {
		this.nodes = JSON.parse(fs.readFileSync(path.join(__dirname, "nodes.json")));
		console.log("Initialized successfully with", path.join(__dirname, "nodes.json"));
	} catch(e) {
		this.nodes = [];
		console.warn("Couldn't find", path.join(__dirname, "nodes.json") ,"or it was invalid. It will be created when needed.");
	}

	setInterval(function() {
		self._sendTime(broadcastAddress, fullNodeId);	// Pump the network with current time
	}, 5*60*1000);

	setInterval(this._persist.bind(this), 5000);

	gateway.pipe(split()).on("data", this._handleIncomingLine.bind(this));
}
util.inherits(Controller, EE);

Controller.prototype._log = function() {
	if(!this.debug) return;

	var args = Array.prototype.slice.call(arguments);
	args.unshift("[" + (new Date()).toLocaleString() + "]");
	args.unshift("[MYSC]");
	console.log.apply(console, args);
};

Controller.prototype.getNode = function(nodeId) {
	var matchingNode = _.first(this.nodes, _.equals("id", nodeId));

	if(matchingNode) return matchingNode;

	var newNode = {id: nodeId, sensors: []};
	this.nodes.push(newNode);
	this.emit("newNode", newNode);
	return newNode;
};

Controller.prototype.getSensor = function(nodeId, sensorId) {
	var node = this.getNode(nodeId);
	node.sensors = node.sensors || [];

	var sensor = _.first(node.sensors, _.equals("id", sensorId));
	if(!sensor) {
		sensor = {id: sensorId};
		node.sensors.push(sensor);
	}

	return sensor;
};

Controller.prototype._persist = function() {
	if(this._saveNeeded) {
		fs.writeFile(path.join(__dirname, "nodes.json"), JSON.stringify(this.nodes, null, 2), function(err) {
			if(err) return this._log("Couldn't write to nodes.json", err);
			this._saveNeeded = false;
		}.bind(this));
	}
};

Controller.prototype.sendMessage = function(message) {
	var args = [
		message.destination,
		message.sensor,
		message.command,
		message.ack || 0,
		message.type
	];

	if(message.payload) args.push(message.payload);

	var serialized = args.join(";");

	this._log("->", serialized);
	this.gateway.write(serialized + "\n");
};

Controller.prototype._sendTime = function(destination, sensor) {
	this.sendMessage({
		destination: destination,
		sensor: sensor,
		command: enums.commands.internal,
		type: enums.internal.time,
		payload: Math.ceil(Date.now() / 1000)
	});
};

Controller.prototype._issueNewId = function() {
	var newId = Math.max.apply(Math, this.nodes.map(_.dot("id"))) + 1;

	if(newId > 255) return this._log("Couldn't issue a new ID. I've run out of IDs.");

	this.sendMessage({
		destination: broadcastAddress,
		sensor: fullNodeId,
		command: enums.commands.internal,
		type: enums.internal.idResponse,
		payload: newId
	});
};

Controller.prototype._handleIncomingLine = function(line) {
	line = line.toString();

	this._log("<-", line);

	var pieces = line.split(";");
	if(pieces.length < 5) return this._log("Invalid line received:", line);

	var message = (["sender", "sensor", "command", "ack", "type", "payload"]).reduce(function(msg, key, index) {
		msg[key] = (key=="payload")?pieces[index]:+pieces[index];
		return msg;
	}, {});

	this.emit("message", message);

	switch(message.command) {
		case enums.commands.presentation: this._handlePresentation(message); break;
		case enums.commands.set: this._handleSet(message); break;
		case enums.commands.req: this._handleReq(message); break;
		case enums.commands.internal: this._handleInternal(message); break;
		case enums.commands.stream: this._handleStream(message); break;
	}
};

Controller.prototype._handlePresentation = function(message) {
	var isNew = !_.first(this.nodes, _.equals("id", message.sender));
		node = this.getNode(message.sender);

	if(isNew) this.emit("nodeAdded", node);

	if(message.sensor == fullNodeId) {
		if(node.protocol !== message.payload) {
			node.protocol = message.payload;
			this.emit("update", node, "protocol");
		}
	} else {
		var sensor = this.getSensor(message.sender, message.sensor);
		if(sensor.type !== message.type) {
			sensor.type = message.type;
			this.emit("update", node, "sensor", sensor);
		}
	}
};

Controller.prototype._handleSet = function(message) {
	var node = this.getNode(message.sender),
		sensor = _.first(node.sensors, _.equals("id", message.sensor));

	if(!sensor) {
		sensor = {id: message.sensor};
		node.sensors.push(sensor);
	}

	sensor.value = +message.payload;
	sensor.type = +message.type;
	sensor.updateTime = Date.now();

	this._saveNeeded = true;
	this.emit("sensorUpdate", node, sensor);
};

Controller.prototype._handleReq = function(message) {
	this._log("Req not implemented");
};

Controller.prototype._handleInternal = function(message) {
	if(message.type == enums.internal.batteryLevel) {
		var node = this.getNode(message.sender);
		node.batteryLevel = +message.payload;
		this._saveNeeded = true;
		this.emit("update", node, "batteryLevel");
	} else if(message.type == enums.internal.time) {
		this._sendTime(message.sender, message.sensor);
	} else if(message.type == enums.internal.idRequest) {
		this._issueNewId();
	} else if(message.type == enums.internal.config) {
		this.sendMessage({
			destination: message.sender,
			sensor: fullNodeId,
			command: enums.commands.internal,
			type: enums.internal.config,
			payload: "M"
		});
	} else if(message.type == enums.internal.sketchName) {
		var node = this.getNode(message.sender);
		if(node.sketchName !== message.payload) {
			node.sketchName = message.payload;
			this._saveNeeded = true;
			this.emit("update", node, "sketchName");
		}
	} else if(message.type == enums.internal.sketchVersion) {
		var node = this.getNode(message.sender);
		if(node.sketchVersion !== message.payload) {
			node.sketchVersion = message.payload;
			this._saveNeeded = true;
			this.emit("update", node, "sketchVersion");
		}
	}
};

Controller.prototype._handleStream = function(message) {
	this._log("Stream not implemented");
};

Controller.prototype.commands = enums.commands;
Controller.prototype.types = enums.types;

module.exports = Controller;