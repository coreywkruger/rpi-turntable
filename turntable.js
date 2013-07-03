#!/usr/bin/env node
//var server = require('websocket-server').createServer();
var WebSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');

var server = http.createServer(function(request, response) {
    fs.readFile('index.html', function (err, data) {
        if (err) {
            console.log(err);
            response.writeHead(500);
            return response.end('Error loading index.html');
        }
        response.writeHead(200);
        response.end(data); 
    });
    console.log((new Date()) + ' Received request for ' + request.url);
	//response.writeHead(404);
	//response.end();
});

server.listen(8080, function() {
	console.log((new Date()) + ' Server is listening on port 8080');
});

/*server.listen(8080, '127.0.0.1', function() {
	console.log((new Date()) + ' Server is listening on port 8080');
});*/

wsServer = new WebSocketServer({
	httpServer: server,
	// You should not use autoAcceptConnections for production
	// applications, as it defeats all standard cross-origin protection
	// facilities built into the protocol and the browser.  You should
	// *always* verify the connection's origin and decide whether or not
	// to accept it.
	autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
	if (!originIsAllowed(request.origin)) {
	  // Make sure we only accept requests from an allowed origin
	  request.reject();
	  console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
	  return;
	}

	var connection = request.accept(null, request.origin);
	console.log((new Date()) + ' Connection accepted.');
	connection.on('message', function(message) {
		if (message.type === 'utf8') {
			console.log('Received Message: ' + message.utf8Data);
			var obj = JSON.parse(message.utf8Data);
			console.log(obj);
			targetPosition = (parseFloat(obj.angle) + Math.PI*2) % (Math.PI*2);
		}else if (message.type === 'binary') {
			console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
		}
	});
	connection.on('close', function(reasonCode, description) {
		console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
	});
});


function setStep(positions, cb){
	var remaining = positions.length;
	positions.forEach(function(v, i){
		gpio.write(pinStepper[i], v, err);
	});
}

var gpio = require("pi-gpio");
var pins = [];

var phases =
	[ [1,0,1,0]
	, [0,1,1,0]
	, [0,1,0,1]
	, [1,0,0,1]
	];

function openPin(num){
	console.log('Opening pin '+num);
	gpio.open(num, 'output', function(err){
		pins.push(num);
		if(err) return void console.error(err.toString());
		console.log('Have pin '+num);
	});
	return num;
}

function err(e){
	if(e) console.error(e.toString());
}

var radianSteps = 12000 / (Math.PI*2);

var pinEnable = openPin(12);
gpio.write(pinEnable, 1, err);
var pinStepper = [openPin(7), openPin(11), openPin(16), openPin(18)];

process.on('SIGINT', function() {
	console.log('SIGINT...');
	clearInterval(interval);
	for(var i in pins){
		console.log('Closing pin '+pins[i]);
		gpio.close(pins[i]);
	}
	setTimeout(function(){process.exit();}, 1000);
	console.log(currentPosition);
});

var currentPosition = 0;
var targetPosition = (+1/2 +Math.PI*2) % (Math.PI*2);

var phasei = 0;
var interval = setInterval(function(){
	var positionDiff = (targetPosition + currentPosition + Math.PI*2) % (Math.PI*2);
	if(positionDiff>Math.PI) positionDiff -= Math.PI*2;
	console.log(currentPosition.toRad(), '+', targetPosition.toRad(), '=', positionDiff.toRad());
	if(Math.abs(positionDiff)<0.01) return;
	step(positionDiff>0 ? -1 : 1 );
}, 10);

Number.prototype.toRad = function toRad(){
	var v = this.valueOf();
	if(v>Math.PI) v-= Math.PI*2;
	return (v.toFixed(4));
}

function step(dir){
	phasei = (phasei+dir+phases.length)%phases.length;
	currentPosition += dir/radianSteps;
	setStep(phases[phasei]);
}
