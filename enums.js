function populate(list) {
	return list.reduce(function(obj, item, index) {
		// The raw representation: as is in the list
		obj[item] = index;

		// A 'cleaner' representation:
		// Drops the first two letters (V_, or I_, etc.), removes underscores and makes it camelCase

		var key = item.substr(2).split("_").reduce(function(str, part, index) {
			if(index == 0) return part.toLowerCase();

			return str + part.charAt(0) + part.substr(1).toLowerCase();
		}, "");

		obj[key] = index;

		return obj;
	}, {});
}

module.exports = {
	commands: populate(["C_PRESENTATION", "C_SET", "C_REQ", "C_INTERNAL", "C_STREAM"]),

	presentations: populate([
		"S_DOOR", "S_MOTION", "S_SMOKE", "S_LIGHT", "S_BINARY", "S_DIMMER", "S_COVER", "S_TEMP",
		"S_HUM", "S_BARO", "S_WIND", "S_RAIN", "S_UV", "S_WEIGHT", "S_POWER", "S_HEATER",
		"S_DISTANCE", "S_LIGHT_LEVEL", "S_ARDUINO_NODE", "S_ARDUINO_REPEATER_NODE", "S_LOCK",
		"S_IR", "S_WATER", "S_AIR_QUALITY", "S_CUSTOM", "S_DUST", "S_SCENE_CONTROLLER",
		"S_RGB_LIGHT", "S_RGBW_LIGHT", "S_COLOR_SENSOR", "S_HVAC", "S_MULTIMETER", "S_SPRINKLER",
		"S_WATER_LEAK", "S_SOUND", "S_VIBRATION", "S_MOISTURE"
	]),

	types: populate([
		"V_TEMP", "V_HUM", "V_STATUS", "V_PERCENTAGE", "V_PRESSURE", "V_FORECAST", "V_RAIN",
		"V_RAINRATE", "V_WIND", "V_GUST", "V_DIRECTION", "V_UV", "V_WEIGHT", "V_DISTANCE",
		"V_IMPEDANCE", "V_ARMED", "V_TRIPPED", "V_WATT", "V_KWH", "V_SCENE_ON", "V_SCENE_OFF",
		"V_HVAC_FLOW_STATE", "V_HVAC_SPEED", "V_LIGHT_LEVEL", "V_VAR1", "V_VAR2", "V_VAR3",
		"V_VAR4", "V_VAR5", "V_UP", "V_DOWN", "V_STOP", "V_IR_SEND", "V_IR_RECEIVE", "V_FLOW",
		"V_VOLUME", "V_LOCK_STATUS", "V_LEVEL", "V_VOLTAGE", "V_CURRENT", "V_RGB", "V_RGBW",
		"V_ID", "V_UNIT_PREFIX", "V_HVAC_SETPOINT_COOL", "V_HVAC_SETPOINT_HEAT", "V_HVAC_FLOW_MODE"
	]),

	internal: populate([
		"I_BATTERY_LEVEL", "I_TIME", "I_VERSION", "I_ID_REQUEST", "I_ID_RESPONSE",
		"I_INCLUSION_MODE", "I_CONFIG", "I_FIND_PARENT", "I_FIND_PARENT_RESPONSE", "I_LOG_MESSAGE",
		"I_CHILDREN", "I_SKETCH_NAME", "I_SKETCH_VERSION", "I_REBOOT", "I_GATEWAY_READY",
		"I_REQUEST_SIGNING", "I_GET_NONCE", "I_GET_NONCE_RESPONSE"
	])
}