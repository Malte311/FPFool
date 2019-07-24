'use strict';

/*
 * Defines the interval (in days) for browser history entries to be relevant. After initialization,
 * the interval has the unit milliseconds.
 */
var interval = 1;

/*
 * Holds the maximum number of active tabs at the same time.
 */
var tabLimit = 5; 

/*
 * Defines the maximum amount of connections being made.
 */
var connectionLimit = 50;

/*
 * Defines how many connections have been made today so far.
 */
var todayCount = 0;

/*
 * Holds the timestamp of the last usage of this application.
 */
var lastUse = undefined;

/**
 * Loads the settings (which can be changed by the user).
 * 
 * @param {function} callback Mandatory callback function.
 */
function loadSettings(callback) {
	chrome.storage.sync.get(data.availableSettings, result => {
		interval = result.interval != undefined ? parseInt(result.interval) : interval;
		interval = daysToMilliSeconds(interval);

		tabLimit = result.tabLimit != undefined ? parseInt(result.tabLimit) : tabLimit;

		currentTabs = new Array(tabLimit);
		currentTabs.fill({
			id: -1
		});

		specialTabs = new Array(tabLimit);
		specialTabs.fill({
			id: -1
		});

		if (result.connectionLimitFactor != undefined) {
			
		}

		todayCount =  result.todayCount != undefined ? parseInt(result.todayCount) : todayCount;

		lastUse = result.lastUse != undefined ? parseInt(result.lastUse) : (new Date).getTime();

		callback();
	});
}