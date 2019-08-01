/**
 * @module background script - browserHistory
 */
'use strict';

/**
 * Holds the number of visits from the most visited site.
 */
var maxVisits = 1;

/**
 * Gets the browser history to establish connections to sites which have already been visited.
 * 
 * @param {function} [callback] Optional callback function.
 */
function loadBrowserHistory(callback) {
	clearDatabase('visits', () => {
		saveVisitsFromBrowserHistory(callback);
	});
}

/**
 * Saves all visits in the defined interval in the database.
 * 
 * @param {function} [callback] Optional callback function.
 */
function saveVisitsFromBrowserHistory(callback) {
	var tmpQueue = [];
	chrome.history.search({
		'text': '', // All entries
		'startTime': startTime
	}, historyItems => {
		// Update the time for last browser history update
		chrome.storage.sync.set({
			lastUse: (new Date).getTime(),
		});

		// Get the number of visits for each page during the specified time interval.
		asyncArrLoop(historyItems, (item, inCallback) => {
			// Ignore extension page
			if (item.url.includes(chrome.runtime.getURL(''))) {
				inCallback();
				return;
			}

			chrome.history.getVisits({
				url: item.url
			}, results => {
				// Update number of max. visits (because we want to visit all sites equally often)
				var count = results.filter(e => e.visitTime >= startTime).length;
				if (maxVisits < count)
					maxVisits = count;

				tmpQueue.push([removeParamsFromUrl(item.url), count]); // Add to processing queue

				storeInDatabase('visits', getKeyFromUrl(item.url), count, false, () => {
					inCallback();
				});
			});
		}, () => {
			// Sort by visit count
			tmpQueue.sort((a, b) => a[1] - b[1]);

			// Insert urls into the real queue in sorted order
			for (const entry of tmpQueue)
				queue.push(entry[0]);
			
			// Remove duplicates
			queue = queue.filter((item, pos, self) => self.indexOf(item) == pos);

			if (debug)
				console.log(`Initial queue = ${queue}`);

			typeof callback === 'function' && callback();
		}, 0);
	});
}