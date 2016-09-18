"use strict"


var Domoticz = require('./node_modules/domoticz-api/api/domoticz');

//update with your Domoticz details
var api = new Domoticz({
	protocol: "http",
	host: "127.0.0.1",
	port: 8080,
	username: "",
	password: ""
});

var CronJob = require('cron').CronJob;

new CronJob('* 2 * * * *', function() {

console.log("i've started the job");

let huejay = require('huejay');

//update with your Hue bridge details (i use the Hue account created within Domoticz)
let client = new huejay.Client({
	host: '',
	username: '', // Optional
	timeout: 3000, // Optional, timeout in milliseconds (15000 is the default)
});
//put your light names in here, with the Domoticz IDX (later iteration could get these from Domo API and add to dictionary..)
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
			
		}
	}, null, true);
});
