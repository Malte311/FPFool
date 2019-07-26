'use strict';

/**
 * Holds the number of visits from the most visited site.
 */
var maxVisits = 10;

/**
 * Holds the start time for requests to the browser history.
 */
var startTime;

/**
 * Gets the browser history to establish connections to sites which have already been visited.
 * 
 * @param {function} callback Optional callback function.
 */
function loadBrowserHistory(callback) {
	var intervalStart = (new Date).getTime() - interval;
	startTime = lastUse != undefined ? 
					(intervalStart > lastUse ? intervalStart : lastUse) : 
					intervalStart;

	chrome.history.search({
		'text': '', // All entries
		'startTime': startTime,
		'maxResults': connectionLimit <= 100 ? connectionLimit : 100
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
				queue.push(removeParamsFromUrl(item.url)); // Add to processing queue

				// Update number of max. visits (because we want to visit all sites equally often)
				var count = results.filter(e => e.visitTime >= intervalStart).length;
				if (maxVisits < count)
					maxVisits = count;

				storeInDatabase('visits', getKeyFromUrl(item.url), count, false, () => {
					inCallback();
				});
			});
		}, callback);
	});
}