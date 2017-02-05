/**
 * 
 */


function playerManager () {
	this.players = {};
	this.userCount = 0;
}

playerManager.prototype.createPlayer = function(conn) {
	return new player(conn, this);
};

playerManager.prototype.getUserCount = function() {
	this.userCount = (this.userCount >= 10000 ? 0 : ++this.userCount);
	return this.userCount; 
};	

playerManager.prototype.addToPlayers = function(p) { 
	this.players[p.guid] = p; 
};

playerManager.prototype.findPlayer = function(finder) {
	var found = null; 
	
	for (var guid in this.players) {
		if (guid === finder.guid) {
			continue;
		}
		var p = this.players[guid];
		if (p.connectTo === null) {
			if (finder.connectTo !== null) {
				finder.connectTo.stopPlay(); 
			}
			finder.connectTo = p;
			p.startPlay(finder);
			found = p; 
			break;
		}
	}
	return found; 
};

playerManager.prototype.removeFromPlayers = function (p) {	
	if (typeof this.players[p.guid] !== 'undefined') {
		delete this.players[p.guid];
	}
};
playerManager.prototype.getUser = function (path) {
	var userCount = this.getUserCount(); 
	var match = path.match(/user=([^\+]+)/);
	if (match !== null) {
		return RegExp.$1 + '(' + userCount + ')';
	}
	return 'User(' + userCount + ')';
};

playerManager.prototype.getGuid = function(path) {
	var match = path.match(/guid=([^\+]+)/);
	if (match !== null) {
		return RegExp.$1; 
	}
	return "error"; 
};

module.exports = new playerManager(); 

function player (conn, pManager) {
	this.conn = conn;
	this.pManager = pManager; 
	this.guid = pManager.getGuid(conn.path);
	this.username = pManager.getUser(conn.path);
	this.connectTo = null;
	pManager.addToPlayers(this); 
	this.addConnectionEvents(); 
}

player.prototype.send = function (str) {
	try {
		this.conn.sendText(str); 
	}
	catch (e) { 
		console.log(e.message); 
		this.closeConnection();
	}
};


player.prototype.closeConnectTo = function () { 
	if (this.connectTo !== null) {
		var p = this.connectTo; 
		this.connectTo = null;
		if (p.connectTo !== null) {
			var obj = {error: 2, reason: 'Connection down'};
			p.connectTo = null;
			p.send(JSON.stringify(obj));
			p.closeConnection();
		}
	}	
}

player.prototype.closeConnection = function () { 
	var self = this; 
	setTimeout (function() { 
		self.conn.close();
	}, 0); 
}

player.prototype.stopPlay = function() {
	this.connectTo = null; 
	this.send(JSON.stringify({op: 'stop'}));
}

player.prototype.startPlay = function(player) { 
	this.connectTo = player; 
	player.send(JSON.stringify({op: 'start'}));
	this.send(JSON.stringify({op: 'start'}));
};

player.prototype.findPlayer = function() {
	return this.pManager.findPlayer(this); 
};

player.prototype.addConnectionEvents = function() {
	var self = this; 
    self.conn.on('text', function (str) {
        console.log('Received ' + str);
        var obj = JSON.parse(str);
        var op = obj.op;
        var retObj = {op: 'unknown', error: 0, reason: 'ok'};  
        if (typeof op === 'undefined') {
        	console.log('Bad request');
        	retObj.error = 1; 
        	retObj.reason = 'Bad request';
        }
        else {
        	retObj.op = obj.op; 
	        switch (op) {
	        	case 'findPlayer': 
	        		var p = self.findPlayer();
	        		if (p !== null) {
	        			console.log('Player ' + self.username + 
	        					' connects with player ' + p.username); 
	        		}
	        		else {
	        			retObj.error = 1;
	        			retObj.reason = 'Failed to find a player'
	        		}
	        	break;
	        	case 'msg': 
	        		if (self.connectTo !== null) {
	        			self.connectTo.send(str);
	        		}
	        		else {
	        			retObj.error = 1; 
	        			retObj.reason = 'No player to send';
	        		}
	        	break;
	        	default: 
	        		console.log('Bad operation');
	        		retObj.error = 1; 
	        		retObj.reason = 'Bad operation';
	        }
        }
        self.send(JSON.stringify(retObj));
    });
    self.conn.on('close', function (code, reason) {
        console.log('Connection closed ' + self.guid);
        self.closeConnectTo(); 
        self.pManager.removeFromPlayers(self);
    });
    self.conn.on('error', function (error) { 
    	console.log('Conection error ' + self.guid + ': ' + error); 
    });
};



