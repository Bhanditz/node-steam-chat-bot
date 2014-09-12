var util = require('util');
var request = require('request');
var winston = require('winston');
var BaseTrigger = require('./baseTrigger.js').BaseTrigger;

/*
Trigger that automatically looks up users on reddit when they join.
*/

var RedditOnJoinTrigger = function() {
	RedditOnJoinTrigger.super_.apply(this, arguments);
};

util.inherits(RedditOnJoinTrigger, BaseTrigger);

var type = "RedditOnJoinTrigger";
exports.triggerType = type;
exports.create = function(name, chatBot, options) {
	var trigger = new RedditOnJoinTrigger(type, name, chatBot, options);
	trigger.respectsMute = false;
	return trigger;
};

RedditOnJoinTrigger.prototype._respondToEnteredMessage = function(roomId, userId) {
	return this._respond(roomId,userId);
}

RedditOnJoinTrigger.prototype._respond = function(roomId,userToCheck) {
	if(!this.options.redditapiurl) {
		console.log("Reddit API Url not defined! Cannot look up user!");
		return false;
	}
	console.log(type);
	var steamid = ""+userToCheck+"";
	if (steamid) {
		var that = this;
		var steamrep={};
		winston.info("Checking reddit for " + steamid);
		request.get({method:'GET',encoding:'utf8',uri:that.options.redditapiurl+"steamid/"+steamid,json:true,followAllRedirects:true}, function(error, response, body) {
			if (error) {
				try { winston.warn("Code " + response.statusCode + " from redditapi for steamid " + steamid); } catch (err) { winston.warn(err) }
				return;
			}
			redditinfo = body;
			redditinfo.steamid = redditinfo.steamid.replace("http://steamcommunity.com/profiles/","");
			var result = that._getParsedResultForJoin(redditinfo, steamid);
			if (result) {
				that._sendMessageAfterDelay(roomId, result);
			}
		});
			return true;
	}
	return false;
}

RedditOnJoinTrigger.prototype._getParsedResultForJoin = function(redditinput, steamid) {
	if (redditinput && redditinput.success) {
		var message="";
		if(redditinput.success && redditinput.banstatus) {
			message += ((this.chatBot.steamClient.users && steamid in this.chatBot.steamClient.users) ? (this.chatBot.steamClient.users[steamid].playerName + "/"+steamid) : steamid) + " has been BANNED from /r/SGS.";
			message += (redditinput.reddit ? ("\nReddit profile: http://www.reddit.com/user/"+redditinput.reddit) : "");
			message += "\nSteam Profile: http://steamcommunity.com/profiles/"+steamid;
			message += "\nSteamrep: http://steamrep.com/profiles/" + steamid;
			message += (redditinput.banreason ? ("\nReddit Ban Reason: " + redditinput.banreason) : "");
		} else if(redditinput.success && redditinput.flair.substr(0,3) == "mod") {
			message = "Welcome, "+((this.chatBot.steamClient.users && steamid in this.chatBot.steamClient.users) ? (this.chatBot.steamClient.users[steamid].playerName + "/"+steamid) : steamid);
			message += " AKA /u/" + redditinput.reddit + ", moderator(?) of /r/SGS! Your (raw) flair is " + redditinput.flair;
		} else if(redditinput.success) {
			var flair = ". Your current flair level is ";
			if(redditinput.flair=="tier0")       flair+= "tier0 White, with no recorded trades in /r/SGS.";
			else if(redditinput.flair=="tier1")  flair+= "tier1 Gray, with 1+ SGS trades.";
			else if(redditinput.flair=="tier2")  flair+= "tier2 Blue, with 5+ SGS trades.";
			else if(redditinput.flair=="tier3")  flair+= "tier3 Red, with 10+ SGS trades.";
			else if(redditinput.flair=="tier4")  flair+= "tier4 Green, with 20+ SGS trades.";
			else if(redditinput.flair=="tier5")  flair+= "tier5 Purple, with 50+ SGS trades.";
			else if(redditinput.flair=="white")  flair+= "tier0 White, with no recorded trades in /r/SGS.";
			else if(redditinput.flair=="gray")   flair+= "tier1 Gray, with 1+ SGS trades.";
			else if(redditinput.flair=="blue")   flair+= "tier2 Blue, with 5+ SGS trades.";
			else if(redditinput.flair=="red")    flair+= "tier3 Red, with 10+ SGS trades.";
			else if(redditinput.flair=="green")  flair+= "tier4 Green, with 20+ SGS trades.";
			else if(redditinput.flair=="purple") flair+= "tier5 Purple, with 50+ SGS trades.";
			else flair += "not a level I understand. The raw data I got was '"+redditinput.flair+"'.";
			message = "Welcome, "+((this.chatBot.steamClient.users && steamid in this.chatBot.steamClient.users) ? (this.chatBot.steamClient.users[steamid].playerName + "/"+steamid) : steamid);
			message += " AKA /u/" + redditinput.reddit + flair;
		}
		return message;
	}
	return null;
}