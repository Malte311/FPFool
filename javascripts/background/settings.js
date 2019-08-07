/**
 * @module background script - settings
 */
'use strict';

/**
 * Defines the interval (in days) for browser history entries to be relevant. After initialization,
 * the interval has the unit milliseconds.
 */
var interval = 1;

/**
 * Holds the start time for requests to the browser history.
 */
var startTime = (new Date).getTime() - daysToMilliseconds(1);

/**
 * Holds the maximum number of active tabs at the same time.
 */
var tabLimit = 3; 

/**
 * Defines the maximum amount of connections being made.
 */
var connectionLimit = 50;

/**
 * Holds the timestamp of the last usage of this application.
 */
var lastUse = (new Date).getTime();

/**
 * Defines how many connections have been made today so far.
 */
var todayCount = 0;

/**
 * Holds the daily counts for the last days (todayCount for every day in the interval).
 */
var dailyCounts = [];

/**
 * Loads the settings (which can be changed by the user).
 * 
 * @param {function} [callback] Optional callback function.
 */
function loadSettings(callback) {
	chrome.storage.sync.get(data.availableSettings.concat(['todayCount', 'lastUse', 'dailyCounts']), result => {
		interval = result.interval != undefined ? parseInt(result.interval) : interval;
		interval = daysToMilliseconds(interval);

		startTime = (new Date).getTime() - interval;

		tabLimit = result.tabLimit != undefined ? parseInt(result.tabLimit) : tabLimit;

		lastUse = result.lastUse != undefined ? parseInt(result.lastUse) : lastUse;

		dailyCounts = result.dailyCounts != undefined ? result.dailyCounts : dailyCounts;

		todayCount = result.todayCount != undefined ? parseInt(result.todayCount) : todayCount;

		if (!isToday(new Date(lastUse))) { // Reset every day
			dailyCounts.push([todayCount, lastUse]);
			for (var i = dailyCounts.length - 1; i >= 0; i--) {
				if (dailyCounts[i][1] < startTime)
					dailyCounts.splice(i, 1);
			}
			todayCount = 0;
		}

		currentTabs = new Array(tabLimit).fill({
			id: -1
		});

		specialTabs = new Array(tabLimit).fill({
			id: -1
		});

		getAllDatabaseEntries('visits', dbResult => {
			var sum = 0, fakeSum = 0;
			for (const entry of dbResult) {
				sum += entry.value[0];
			}
			for (const dC of dailyCounts) {
				fakeSum += dC[0];
			}
			
			var factor = result.connectionLimitFactor != undefined ? result.connectionLimitFactor : 1;
			connectionLimit = factor * (sum - (dailyCounts.length > 0 ? fakeSum : todayCount));
			
			// In case sum is zero (can happen at first usage due to empty database)
			if (connectionLimit <= 0)
				connectionLimit = 50;

			if (debug)
				logSettings();

			typeof callback === 'function' && callback(); // Call callback, if it is defined
		});
	});
}

/**
 * Logs current settings.
 */
function logSettings() {
	console.log(
		`Current settings are: \r\n
		interval = ${interval / 1000 / 60 / 60 / 24} days, \r\n
		tabLimit = ${tabLimit}, \r\n
		todayCount = ${todayCount}, \r\n
		connectionLimit = ${connectionLimit}, \r\n
		lastUse = ${new Date(lastUse)}`
	);
}