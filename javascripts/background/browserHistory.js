'use strict';

/**
 * Gets the browser history to establish connections to sites which have already been visited.
 * 
 * @param {function} callback Mandatory callback function.
 */
function loadBrowserHistory(callback) {
	chrome.history.search({
		'text': '', // All entries
		'startTime': (new Date).getTime() - interval,
		'maxResults': connectionLimit <= 100 ? connectionLimit : 100
	}, historyItems => {
		// Get the number of visits for each page during the specified time interval.
		for (var i = 0; i < historyItems.length; i++) {
			chrome.history.getVisits({
				url: historyItems[i].url
			}, results => {
				var c = results.filter(e => e.visitTime >= (new Date).getTime() - interval).length;
				storeInDatabase('visits', historyItems[i].url, c, false);
				queue.push(removeParamsFromUrl(historyItems[i].url)); // Add to processing queue

				// After the last iteration we want to continue by visiting the urls.
				// Necessary to check in here because of asynchronous calls.
				if (i == historyItems.length - 1) {
					// Get the max value (because we want to visit all sites equally often
					maxVisits = Math.max(...browserHistory.values());

					// First call instant, then interval
					connectToUrl(queue.shift());
					todayConnectionCount++;
					connectLoop(5000 * Math.random() + 5000); // 5 to 10 seconds
				}
			});
		}
	});
}