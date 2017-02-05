/**
 * Chat Server 
 */
var ws = require('nodejs-websocket');
var pManager = require('./csplayer.js');

// Scream server example: "hi" -> "HI!!!" 
var server = ws.createServer(function (conn) {
	var p = pManager.createPlayer(conn);
    console.log("New connection " + p.guid);
    
}).listen(3000)