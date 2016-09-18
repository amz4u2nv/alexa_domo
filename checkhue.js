"use strict"


var Domoticz = require('./node_modules/domoticz-api/api/domoticz');

var api = new Domoticz({
	protocol: "http",
	host: "127.0.0.1",
	port: 8080,
	username: "admin",
	password: "1saBella"
});

var CronJob = require('cron').CronJob;

new CronJob('* 2 * * * *', function() {

console.log("i've started the job");

let huejay = require('huejay');

var options = {
	host: '192.168.88.194',
	request: true,
	log: true
};

let client = new huejay.Client({
	host: '192.168.88.236',
	username: 'O3byYLfmL1C3Qr1f9i9ENXPdh5vKFf8t9NpZb4br', // Optional
	timeout: 3000, // Optional, timeout in milliseconds (15000 is the default)
});

var dict = {
	"Barn_1_1": 157,
	"Barn_1_2": 162,
	"Barn_1_3": 163,
	"Barn_1_4": 164,
	"Front Room Tall Hue": 158,
	"1st flr landing": 159,
	"Top landing bulb": 160,
	"Top landing led": 161
};

client.lights.getAll()
	.then(lights => {

		for (var i = 0; i < lights.length; i++) {
			var device = lights[i];
			var level
			//console.log("name of light is: ", device)
			var lightname = device.name 
			console.log("light is: ", lightname) 
			for (var key in dict) {
				var IDX = dict[lightname] 
			//	console.log(IDX)
			};
			var state = device.on
			//var reachable = device.reachable
			if (state == true) {
				level = 'On'
			} else {
				level = 'Off'
			};
			console.log("IDX & Lvl ", IDX, " - ", level)
			//	callDom("switchlight", IDX, level);
			function callDom(type, IDX, state) {

				api.changeSwitchState({
					type: "switchlight",
					idx: IDX,
					state: level
				}, function(params, callback) {
			//		console.log(" idx = ", IDX, " ,state: ", level)
					console.log(callback)
				})
				
			}; 
			/*function callLog(){
				api.logMessage({
					message: `{"command":"switchlight","idx":"${IDX}", "switchcmd": "${level}"}`
				}, function(params, callback){
					console.log(callback)
				})
			};*/
			
		}
	}, null, true);
});
