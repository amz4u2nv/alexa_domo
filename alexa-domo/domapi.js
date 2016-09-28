var Domoticz = require('./node_modules/domoticz-api/api/domoticz');

//var api = new Domoticz();

var api = new Domoticz({
	protocol: "http",
	host: "",
	port: 8080,
	username: "",
	password: ""
});

var func = function(event, context) {
	console.log('Input', event);

	switch (event.header.namespace) {

		/**
		 * The namespace of "Discovery" indicates a request is being made to the lambda for
		 * discovering all appliances associated with the customer's appliance cloud account.
		 * can use the accessToken that is made available as part of the payload to determine
		 * the customer.
		 */
		case 'Alexa.ConnectedHome.Discovery':
			handleDiscovery(event, context);
			break;

			/**
			 * The namespace of "Control" indicates a request is being made to us to turn a
			 * given device on, off or brighten. This message comes with the "appliance"
			 * parameter which indicates the appliance that needs to be acted on.
			 */
		case 'Alexa.ConnectedHome.Control':
			handleControl(event, context);
			break;

			/**
			 * We received an unexpected message
			 */
		default:
			console.log('Err', 'No supported namespace: ' + event.header.namespace);
			context.fail('Something went wrong');
			break;
	}
};

exports.handler = func;

function handleDiscovery(accessToken, context) {

	/**
	 * Crafting the response header
	 */
	var headers = {
		namespace: 'Alexa.ConnectedHome.Discovery',
		name: 'DiscoverAppliancesResponse',
		payloadVersion: '2'
	};

	var appliances = [];

	api.getScenesGroups(function(error, scene) {
		var sceneArray = scene.results;

		for (var i = 0; i < sceneArray.length; i++) {
			var element = sceneArray[i];
			//console.log(element)
			//domoticz allows same IDX numbers for devices/scenes - yeah, i know.
			var elid = parseInt(element.idx) + 200
			console.log(elid, " = elid here")
			var sceneName = {
				applianceId: elid,
				manufacturerName: element.name,
				modelName: element.name,
				version: element.idx,
				friendlyName: element.name,
				isReachable: true,
				actions: [
					"turnOn",
					"turnOff"
				],
				additionalApplianceDetails: {
					WhatAmI: "scene"
				}
			};
			appliances.push(sceneName);
		};
	});

	api.getDevices({
			filter: 'all',
			used: true,
			order: 'Name'
		}, function(error, devices) {

			var devArray = devices.results;

			for (var i = 0; i < devArray.length; i++) {
				var device = devArray[i];
				console.log("here is each devicetype - ", device.switchType)
				type = device.type
				setswitch = device.switchType
				strType = type.startsWith("Light")
				if (strType === true) {
					var appliancename = {
						applianceId: device.idx,
						manufacturerName: device.hardwareName,
						modelName: device.subType,
						version: device.switchType,
						friendlyName: device.name,
						//friendlyDescription: 'Particle light in kitchen',
						isReachable: true,
						actions: [
							"incrementPercentage",
							"decrementPercentage",
							"setPercentage",
							"turnOn",
							"turnOff"
						],
						additionalApplianceDetails: {
							switchis: setswitch,
							WhatAmI: "light"
						}

					};
				}
					else if (type = 'Temp') {

						var appliancename = {
							applianceId: device.idx,
							manufacturerName: device.hardwareName,
							modelName: device.subType,
							version: device.switchType,
							friendlyName: device.name,
							friendlyDescription: device.name,
							isReachable: true,
							actions: [
								"SetTargetTemperatureRequest",
								"SetTargetTemperatureConfirmation"
							],
							additionalApplianceDetails: {
								WhatAmI: "temp"
							}

						}
					};
					appliances.push(appliancename);


					for (var i = 0; i < appliances.length; i++) {
						var device = appliances[i];
						console.log(device)
					}
					//appliances.forEach(entry)
					//  console.log(entry)
				};

				var payloads = {
					discoveredAppliances: appliances
				};
				var result = {
					header: headers,
					payload: payloads
				};

				console.log('Discovery', result);

				context.succeed(result);
			}
		);
	}




	function handleControl(event, context) {
		var state;
		var idx;
		if (event.header.namespace === 'Alexa.ConnectedHome.Control') {

			var accessToken = event.payload.accessToken;
			var what = event.payload.appliance.additionalApplianceDetails.WhatAmI
			var message_id = event.header.messageId;

			var confirmation;
			var funcName;

			switch (what) {

				case "light":
					console.log("I'm in the Light case");

					var switchtype = event.payload.appliance.additionalApplianceDetails.switchis
					var applianceId = event.payload.appliance.applianceId;

					var switchtype = "switch";

					if (event.header.name == "TurnOnRequest") {
						//state = 1;
						confirmation = "TurnOnConfirmation";
						funcName = "On";
					} else if (event.header.name == "TurnOffRequest") {
						//state = 0;
						confirmation = "TurnOffConfirmation";
						funcName = "Off";
					}
					var headers = {
						namespace: 'Alexa.ConnectedHome.Control',
						name: confirmation,
						payloadVersion: '2',
						messageId: message_id
					};

					//Change state of a switch or a dimmable  

					api.changeSwitchState({
						type: switchtype,
						idx: applianceId,
						state: funcName
					}, function(params, callback) {
						console.log(callback)
						var payloads = {};
						var result = {
							header: headers,
							payload: payloads
						};
						context.succeed(result);
					});

					break;
				case "temp":

					var temp = event.payload.targetTemperature.value;
					console.log("I'm in the temp case");


					var applianceId = event.payload.appliance.applianceId;

					if (event.header.name == "SetTargetTemperatureRequest") {
						confirmation = "SetTargetTemperatureConfirmation";
						//	flVal = parseFloat(temp);
					}

					var headers = {
						namespace: 'Alexa.ConnectedHome.Control',
						name: confirmation,
						payloadVersion: '2',
						messageId: message_id
					};

					//Change value of temp

					api.uTemp({
						idx: applianceId,
						value: temp
					}, function(params, callback) {
						console.log(callback)
						var payloads = {};
						var result = {
							header: headers,
							payload: payloads
						};
						context.succeed(result);
					});

					break;

				case "scene":

					var AppID = parseInt(event.payload.appliance.applianceId) - 200;

					if (event.header.name == "TurnOnRequest") {
						//state = 1;
						confirmation = "TurnOnConfirmation";
						funcName = "On";
					} else if (event.header.name == "TurnOffRequest") {
						//state = 0;
						confirmation = "TurnOffConfirmation";
						funcName = "Off";
					}

					var headers = {
						namespace: 'Alexa.ConnectedHome.Control',
						name: confirmation,
						payloadVersion: '2',
						messageId: message_id
					};
					console.log("I'm in the scene case - IDX = ", AppID, "On/Off? - ", funcName);
					api.changeSceneState({
						idx: AppID,
						state: funcName
					}, function(params, callback) {
						console.log(callback)
						var payloads = {};
						var result = {
							header: headers,
							payload: payloads
						};

						context.succeed(result);
					})
					break;
			}
		};
	}

	function log(title, msg) {
		console.log(title + ": " + msg);
	}

	function generateControlError(name, code, description) {
		var headers = {
			namespace: 'Alexa.ConnectedHome.Control',
			name: name,
			payloadVersion: '2'
		};

		var payload = {
			exception: {
				code: code,
				description: description
			}
		};

		var result = {
			header: headers,
			payload: payload
		};

		return result;
	}
