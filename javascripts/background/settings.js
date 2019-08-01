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
var lastUse = undefined;

/**
 * Defines how many connections have been made today so far.
 */
var todayCount = 0;

/**
 * Loads the settings (which can be changed by the user).
 * 
 * @param {function} [callback] Optional callback function.
 */
function loadSettings(callback) {
	chrome.storage.sync.get(data.availableSettings.concat(['todayCount', 'lastUse']), result => {
		interval = result.interval != undefined ? parseInt(result.interval) : interval;
		interval = daysToMilliseconds(interval);

		startTime = (new Date).getTime() - interval;

		tabLimit = result.tabLimit != undefined ? parseInt(result.tabLimit) : tabLimit;

		lastUse = result.lastUse != undefined ? parseInt(result.lastUse) : lastUse;

		todayCount = result.todayCount != undefined ? parseInt(result.todayCount) : todayCount;
		todayCount = isToday(new Date(lastUse)) ? todayCount : 0; // Reset every day

		currentTabs = new Array(tabLimit).fill({
			id: -1
		});

		specialTabs = new Array(tabLimit).fill({
			id: -1
		});

		getAllDatabaseEntries('visits', result => {
			var sum = 0;
			for (const entry of result) {
				sum += entry.value[0];
			}
			connectionLimit = result.connectionLimitFactor != undefined ? 
							  result.connectionLimitFactor * sum : sum;
			
			if (connectionLimit == 0) // In case sum is zero
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