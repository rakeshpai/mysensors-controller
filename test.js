var mysensors = require("./");

var controller = mysensors.usingSerialGateway("/dev/cu.wchusbserial410", 38400);
controller.debug = true;