mysensors-controller
===

A partial implementation of the [MySensors](http://www.mysensors.org/) serial protocol as a node.js module.
Built against [version 1.5 of the MySensors Serial API](http://www.mysensors.org/download/serial_api_15), and supports both Serial (tested) and Ethernet (untested) gateways.

Installation
---
```
npm install mysensors-controller
```

Usage
---

```javascript
var mysensors = require("mysensors-controller");
var controller = mysensors.usingSerialGateway("/dev/serial.path"); // or "COMx" for Windows mates
// or
var controller = mysensors.usingEthernetGateway("host or ip", port); // Should also work with the ESP8266 gateway
```

`.nodes`
---

A JS object containing the nodes and sensors in the network. This object is updated with presentation and sensor data as available from the network. 
```
> controller.nodes
```

```json
[
  {
    "id": 1,
    "sensors": [
      {
        "id": 0,
        "value": 47,
        "type": 23,
        "updateTime": 1456390408709
      }
    ],
    "protocol": "1.5.4",
    "sketchName": "Light Sensor",
    "sketchVersion": "1.0"
  }
]
```
The object above reflects that the network has has one node (ID: 1), which has one one sensor (ID: 0), which is of type 23 (`controller.types.lightLevel`). Other keys should be obvious.

This object should be considered as the _source of truth_, and so is saved to disk automatically for future internal use. See docs about persistence below.
This object is updated whenever any of the following events fire:

Events
---

```javascript
controller.on(eventName, function(...) {
  // ...
});
```

eventName | Notes
--- | ---
`newNode` | Emitted when a new node has been added to the system. Callback function receives the newly added node. Note that the new node's data might not be fully populated yet. The `update` event should give more details. This event is only fired during presentation, if the node wasn't previously known. It isn't fired if it isn't a case of presentation.
`update` | Emitted when a node has been updated. Callback function receives the updated node, and the property that was updated (can be the strings `protocol`, `batteryLevel`, `sketchName`, `sketchVersion`, or `sensor`).
`sensorUpdate` | Emitted when new sensor data has become available. Callback function receives the affected `node` and `sensor` objects. This is where the fun stuff happens, isn't it?
`message` | Emitted when an incoming message has been received. Callback function receives a parsed message object (keys are `sender`, `sensor`, `command`, `ack`, `type` and `payload`). Ideally, the previous events should help you enough, so this event shouldn't be too useful, except maybe for logging. The `.nodes` object isn't updated before firing this event.

Except for the `message` event, the `.nodes` object is always updated before any of the events are fired, so `.nodes` always reflects the latest known state.
`.sendMessage(message)`
---

Sends a message to the network. Example:
```javascript
controller.sendMessage({
  destination: 3,
  sensor: 0,
  command: controller.commands.set,
  type: controller.types.dimmer,
  payload: 50
});
```
The code above tells sensor 0 connected to node 3 to set it's dimmer level to 50%.
Set `sensor` to `255` if you don't want to target the command to the node, and not a specific sensor.

`.debug`
---
Set this to `true` or `false` for verbose logging of every message across the network to stdout. Default: `false`.

Stuff that's already handled
---

This library is a thin layer on top of the MySensors API, and all changes are exposed as events and as updates to the `.nodes` object. That said, the following things are handled automatically for you:
* Setting the sensor config to `M` for metric. Because I couldn't figure out how to expose this cleanly, so I had to pick one, and metric is clearly the better system.
* Sending the current time to nodes, if requested.
* Assigning IDs to new nodes, if they don't have hardcoded IDs already, during inclusion. This isn't foolproof. If any node with id=255 has been discovered on the network, node assignment subsequently fails (somewhat silently - there's a debug message printed to stdout if `.debug = true`). There's no way to know which IDs have already been used up in the network without complete historical data, so I'm not sure this is fixable easily.
* Broadcasting the current time every 5 minutes. I've just copied the behaviour from the [official NodeJsController.js](https://github.com/mysensors/MySensorsSampleController/blob/master/NodeJsController.js#L709-L711). I'm not sure if it serves any purpose, since there's no apparent way to retreive the time [on the node](http://www.mysensors.org/download/sensor_api_15) without making a request again. Also, nodes at the edges of the network might be sleeping anyway when the time is broadcast.

Enums
---
`.commands` and `.types` refer the to available options for, well, commands and types. So, `controller.commands.set` is used for `C_SET` commands, and `controller.types.temp` refers to the `V_TEMP` type, for example. You'll need to refer to the [MySensors Serial API docs](http://www.mysensors.org/download/serial_api_15) for details about the available options. While you can use the types in the docs (for eg. `controller.types.V_TEMP` is perfectly valid), there's the more JS friendly `controller.types.temp` available as well. For the sake of looking good in JS-land, the prefix and underscores are removed, and is converted to camelCase.

Persistence
---

Since presentation data is only sent when the sensor node is reset or power-cycled, it becomes necessary to store presentation data for when your node.js app restarts. Otherwise you'd need to power-cycle all sensor nodes after you start the node app. This module stores the presentation data in a `nodes.json` file on the file system, and uses it at startup if available to populate the `collection.nodes` object above. This way, if presentation data was captured in the past, it will still be available even if your node.js app restarts. All of this is managed automatically, but you should be aware of the FS operations here. All data is flushed to disk every 5 seconds, if there was a change.

It appears that v2.0 of the protocol has a way to request for presentation data. Whenever that lands, on-disk persistence can be removed completely, and all presentation details can be figured out via the protocol itself.

License
---
MIT