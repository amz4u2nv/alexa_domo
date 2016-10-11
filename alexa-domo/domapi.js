var Domoticz = require('./node_modules/domoticz-api/api/domoticz');
var lupus = require('./node_modules/lupus/index');

var api = new Domoticz({
    protocol: "http",
    host: "",
    port: 8080,
    username: "",
    password: ""
});

var result;
var payloads;
var appliances = [];

var func = function (event, context) {

    switch (event.header.namespace) {

        case 'Alexa.ConnectedHome.Discovery':
            handleDiscovery(event, context);
            break;
        
        case 'Alexa.ConnectedHome.Control':
            handleControl(event, context);
            break;

        default:
            console.log('Err', 'No supported namespace: ' + event.header.namespace);
            context.fail('Something went wrong');
            break;
    }
};
exports.handler = func;

function handleDiscovery(event, context) {
   // var message_id = event.header.messageId;

    getDevs(context, function (callback) {

        context.succeed(callback);
        appliances = [];
    })
}

function handleControl(event, context) {
    var state;
    var idx;

    log("what's the event?", event);

        var accessToken = event.payload.accessToken;
        var what = event.payload.appliance.additionalApplianceDetails.WhatAmI;
        var message_id = event.header.messageId;
        var switchtype = event.payload.appliance.additionalApplianceDetails.switchis;
        var applianceId = event.payload.appliance.applianceId;

        var confirmation;
        var funcName;

        switch (what) {
            case "light":
                if (event.header.name == "TurnOnRequest") {
                    confirmation = "TurnOnConfirmation";
                    funcName = "On";
                }
                else if (event.header.name == "TurnOffRequest") {
                    confirmation = "TurnOffConfirmation";
                    funcName = "Off";
                }
                var headers = {
                    namespace: 'Alexa.ConnectedHome.Control',
                    name: confirmation,
                    payloadVersion: '2',
                    messageId: message_id
                };
                ctrlLights(applianceId, funcName, function (callback) {
                    var result = {
                        header: headers,
                        payload: callback
                    };
                    context.succeed(result);
                }); break;
            case "group":

                var AppID = parseInt(event.payload.appliance.applianceId) - 200;

                if (event.header.name == "TurnOnRequest") {
                    confirmation = "TurnOnConfirmation";
                    funcName = "On";
                }
                else if (event.header.name == "TurnOffRequest") {
                    confirmation = "TurnOffConfirmation";
                    funcName = "Off";
                }
                 headers = {
                    namespace: 'Alexa.ConnectedHome.Control',
                    name: confirmation,
                    payloadVersion: '2',
                    messageId: message_id
                };
                ctrlScene(AppID, funcName, function (callback) {
                    var result = {
                        header: headers,
                        payload: callback
                    };
                    context.succeed(result);
                }); break;
            case "temp":

                var temp = event.payload.targetTemperature.value;

                applianceId = event.payload.appliance.applianceId;

                if (event.header.name == "SetTargetTemperatureRequest") {
                    confirmation = "SetTargetTemperatureConfirmation";
                    //	flVal = parseFloat(temp);
                }
                headers = {
                    namespace: 'Alexa.ConnectedHome.Control',
                    name: confirmation,
                    payloadVersion: '2',
                    messageId: message_id
                };
                ctrlTemp(applianceId, temp, function (callback) {
                    var result = {
                        header: headers,
                        payload: callback
                    };
                    context.succeed(result);
                });
                break;

            default:
                log("error - not hit a device type");

        }
}

function generateControlError(name, code, description) {
    var headers = {
        namespace: 'Alexa.ConnectedHome.Control',
        name: name,
        payloadVersion: '2'
    };

    var payload;
    payload = {
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

function getDevs(context, callback) {

    var headers = {
        namespace: 'Alexa.ConnectedHome.Discovery',
        name: 'DiscoverAppliancesResponse',
        payloadVersion: '2'
    };
    api.getDevices({
        filter: 'all',
        used: true,
        order: 'Name'
    }, function (error, devices) {
        var devArray = devices.results;
        var i = devArray.length;
        lupus(0, devArray.length, function (n) {

            var device = devArray[n];
            var devType = device.type;
            var setswitch = device.switchType;
            i--;
            if (devType.startsWith("Light")) {
                var appliancename = {
                    applianceId: device.idx,
                    manufacturerName: device.hardwareName,
                    modelName: device.subType,
                    version: device.switchType,
                    friendlyName: device.name,
                    friendlyDescription: ".",
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
                appliances.push(appliancename);
            }
            else if (devType == 'Temp') {
                appliancename = {
                    applianceId: device.idx,
                    manufacturerName: device.hardwareName,
                    modelName: device.subType,
                    version: device.idx,
                    friendlyName: device.name,
                    friendlyDescription: ".",
                    isReachable: true,
                    actions: [
                        "setTargetTemperature"
                    ],
                    additionalApplianceDetails: {
                        WhatAmI: "temp"
                    }
                };
                appliances.push(appliancename);
            }
             else if (devType == 'Group') {
               var elid = parseInt(device.idx) + 200;
               appliancename = {
                   applianceId: elid,
                   manufacturerName: device.name,
                   modelName: device.name,
                   version: device.name,
                   friendlyName: device.name,
                   friendlyDescription: ".",
                   isReachable: true,
                   actions: [
                       "turnOn",
                       "turnOff"
                   ],
                   additionalApplianceDetails: {
                       WhatAmI: "group"
                   }
               };
               appliances.push(appliancename);
           }
            if (i == 0) {
                var payloads = {
                    discoveredAppliances: appliances
                };
              //  log(appliances);
                var result = {
                    header: headers,
                    payload: payloads
                };
               callback(result);
            }
        })
    })
}

function ctrlLights(applianceId, func, sendback) {
    api.changeSwitchState({
        type: "switch",
        idx: applianceId,
        state: func
    }, function (params, callback) {
        console.log(params, callback);
        var payloads = {};

        sendback(payloads)
    });
  }

function ctrlScene(idx, func, sendback) {
    api.changeSceneState({
        idx: idx,
        state: func
    }, function (params, callback) {
        console.log(params, callback);
        var payloads = {};
        sendback(payloads)
    });

}

function ctrlTemp(idx, temp, sendback) {

    api.uTemp({
        idx: idx,
        value: temp
    }, function(params, callback) {
        console.log(callback);
        var payloads = {};
        sendback(payloads)
    });
}

var log = function(title, msg) {

    console.log('**** ' + title + ': ' + JSON.stringify(msg));

};
