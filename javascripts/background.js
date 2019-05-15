'use strict';

/*
 * Holds the browser history of a given time interval. This information can be used to visit
 * popular sites from the user.
 */
var browserHistory = new Map();

/*
 * Milliseconds to subtract from the current time in order to get the start time for the browser
 * history. The default value is set to the last 24 hours and the user can change the value at any
 * time.
 */
var interval = 1000 * 60 * 60 * 24;

/*
 * The maximum amount of browser history entries. Default value is set to 15.
 */
var maxHistoryCount = 15;

/*
 * Defines the maximum amount of connections being made.
 */
var maxConnectCount = 10;

/*
 * Specifies which algorithms for fooling fingerprinters are available.
 *
 * algorithms.DEFAULT: Opens a new tab, but does not click on links or search for keywords.
 * algorithms.NAVIGATE: Opens a new tab and clicks on links in that tab.
 * algorithms.SEARCH: Opens a new tab and searches for keywords in that tab.
 */
const algorithms = {
	DEFAULT: 'DEFAULT',
	NAVIGATE: 'NAVIGATE',
	SEARCH: 'SEARCH'
};

/*
 * Holds the currently selected algorithm.
 */
var activeAlgorithm = algorithms.DEFAULT;

/*
 * Variables for statistical information (like the total number of visited sites, clicked links
 * and so on).
 */
var visitedSitesCount, clickedLinksCount, keywordSearchCount;

/**
 * Starts the application: Creates fake connections in the hidden window and removes the tabs
 * when finished. The selected algorithm defines what exactly these fake connections do.
 */
function runApplication() {
	chrome.storage.sync.get([
		'visitedSitesCount', 'clickedLinksCount', 'keywordSearchCount', 'interval',
		'maxHistoryCount', 'maxConnectCount'
	], function (res) {
		// Settings
		interval = res.interval != undefined ? res.interval : interval;
		maxHistoryCount = res.maxHistoryCount != undefined ? res.maxHistoryCount : maxHistoryCount;
		maxConnectCount = res.maxConnectCount != undefined ? res.maxConnectCount : maxConnectCount;

		// Statistics
		visitedSitesCount = res.visitedSitesCount != undefined ? res.visitedSitesCount : 0;
		clickedLinksCount = res.clickedLinksCount != undefined ? res.clickedLinksCount : 0;
		keywordSearchCount = res.keywordSearchCount != undefined ? res.keywordSearchCount : 0;

		// Gets the browser history to establish connections to sites which have already been
		// visited
		chrome.history.search({
			'text': '', // All entries in a given time interval
			'startTime': (new Date).getTime() - interval,
			'maxResults': maxHistoryCount
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
						visitUrls();
					}
				});
			}
		});
	});
}

/**
 * Visits the urls which are contained in the browserHistory variable.
 */
function visitUrls() {
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
					connectToUrl(key, activeAlgorithm);
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