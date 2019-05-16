'use strict';

/*
 * Holds the browser history of a given time interval. This information can be used to visit
 * popular sites from the user.
 */
var browserHistory = new Map();

/*
 * Defines the maximum amount of connections being made.
 */
var maxConnectCount = 10;

/*
 * Variables for statistical information (like the total number of visited sites, clicked links
 * and so on). These are updated in real time, so its important they are global.
 */
var visitedSitesCount, clickedLinksCount, keywordSearchCount;

/**
 * Starts the application: Creates fake connections in the hidden window and removes the tabs
 * when finished. The selected algorithm defines what exactly these fake connections do.
 */
function runApplication() {
	chrome.storage.sync.get(Object.values(data.availableStatistics).concat(
		Object.values(data.availableSettings)), function (res) {
		// Settings
		maxConnectCount = res.maxConnectCount != undefined ? res.maxConnectCount : maxConnectCount;
		var interval = res.interval != undefined ? res.interval : 1; // Default 1 day
		interval = interval * 1000 * 60 * 60 * 24; // interval has unit days but needs milliseconds

		// Statistics
		visitedSitesCount = res.visitedSitesCount != undefined ? res.visitedSitesCount : 0;
		clickedLinksCount = res.clickedLinksCount != undefined ? res.clickedLinksCount : 0;
		keywordSearchCount = res.keywordSearchCount != undefined ? res.keywordSearchCount : 0;

		// Gets the browser history to establish connections to sites which have already been
		// visited (we want all urls, default interval is 24 hours, default maximum amount of
		// entries is 15).
		chrome.history.search({
			'text': '', // All entries in a given time interval
			'startTime': (new Date).getTime() - interval,
			'maxResults': res.maxHistoryCount != undefined ? res.maxHistoryCount : 15
		}, function (historyItems) {
			// Get the number of visits during the specified time interval.
			var count = 0;
			for (const historyItem of historyItems) {
				chrome.history.getVisits({
					url: historyItem.url
				}, function (results) {
					// Save which urls were visited and how often they were visited (using a 
					// key-value datastructure for this purpose).
					browserHistory.set(historyItem.url, results.filter(item =>
						item.visitTime >= (new Date).getTime() - interval
					).length);

					// After the last iteration we want to continue by visiting the urls.
					// Necessary to check in here because of asynchronous calls.
					count++;
					if (count == historyItems.length) {
						// visitUrls(res.activeAlgorithm != undefined ?
						// 	res.activeAlgorithm :
						// 	data.availableAlgorithms.DEFAULT
						// );
					}
				});
			}
		});
	});
}

/**
 * Visits the urls which are contained in the browserHistory variable.
 * 
 *  @param {string} algo The algorithm used for the connections.
 */
function visitUrls(algo) {
	// Sort the urls by number of visits, so we visit sites with less visits first.
	var browserHistoryAsArray = [...browserHistory.entries()];
	browserHistory = new Map(browserHistoryAsArray.sort(function (a, b) {
		return a[1] - b[1];
	}));

	// Max value is now at the last position
	var maxVisits = browserHistoryAsArray[
		browserHistoryAsArray.length - 1
	][1];

	var connectionCount = 0;
	var visitsLeft = true;
	while (visitsLeft) {
		visitsLeft = false;
		for (const [key, value] of browserHistory) {
			if (value < maxVisits && key.startsWith('http')) { // Do not visit extension page
				visitsLeft = true;
				browserHistory.set(key, browserHistory.get(key) + 1);

				setTimeout(function () {
					connectToUrl(key, algo);
				}, Math.floor(Math.random() * 15000 + 500));

				if (++connectionCount == maxConnectCount) {
					return;
				}
			}
		}
	}
}

/**
 * Creates a fake connection to a given url.
 * We open the given url in a new tab in our hidden browser window.
 * 
 * @param {string} url The url we want to connect to.
 * @param {string} algo The algorithm used in this tab.
 */
function connectToUrl(url, algo) {
	chrome.tabs.create({
		windowId: windowId,
		index: currentTabs.length,
		url: url,
		active: false
	}, function (tab) {
		tab.isNew = true; // We need this to execute content scripts only once
		tab.algorithm = algo;
		currentTabs.push(tab);
	});
}