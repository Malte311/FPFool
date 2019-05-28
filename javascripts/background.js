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
 * Holds the maximum of visits for an url from the queue. We want to visit all the other sites
 * equally often.
 */
var maxVisits = 10;

/*
 * Defines the time to wait before continuing visiting urls (to prevent too many visits which
 * may be detected by anti-bot mechanisms).
 */
var restartTime = 10 * 1000;

/*
 * Holds the maximum number of active tabs at the same time.
 */
var maxTabsCount = 5;

/*
 * Variables for statistical information (like the total number of visited sites, clicked links
 * and so on). These are updated in real time, so its important they are global.
 */
var visitedSitesCount, clickedLinksCount, keywordSearchCount;

/*
 * Defines the currently selected algorithm.
 */
var activeAlgorithm;

/*
 * Holds the amount of connections made so far.
 */
var connectionCount = 0;

/**
 * Starts the application: Creates fake connections in the hidden window and removes the tabs
 * when finished. The selected algorithm defines what exactly these fake connections do.
 */
function runApplication() {
	getSearchTerms(); // No need to wait for this asynchronous call
	chrome.storage.sync.get(Object.values(data.availableStatistics).concat(
		Object.values(data.availableSettings)), function (res) {
		// Settings
		maxConnectCount = res.maxConnectCount != undefined ?
			parseInt(res.maxConnectCount) :
			maxConnectCount;
		var interval = res.interval != undefined ? parseInt(res.interval) : 1; // Default 1 day
		interval = interval * 1000 * 60 * 60 * 24; // interval has unit days but needs milliseconds
		activeAlgorithm = res.activeAlgorithm != undefined ?
			res.activeAlgorithm :
			data.availableAlgorithms.DEFAULT;

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
			'maxResults': res.maxHistoryCount != undefined ? parseInt(res.maxHistoryCount) : 15
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
					queue.push(historyItem.url); // Add to processing queue

					// After the last iteration we want to continue by visiting the urls.
					// Necessary to check in here because of asynchronous calls.
					count++;
					if (count == historyItems.length) {
						// Get the max value (because we want to visit all sites equally often
						maxVisits = Math.max(...browserHistory.values());

						// First call instant, then interval
						connectToUrl(queue.shift(), activeAlgorithm);
						connectionCount++;
						connectLoop();
					}
				});
			}
		});
	});
}

/**
 * Repeats connecting to webpages.
 */
function connectLoop() {
	var running = setInterval(function () {
		connectToUrl(queue.shift(), activeAlgorithm);

		if ((++connectionCount > maxConnectCount) || !(queue.length > 0)) {
			clearInterval(running);
		}
	}, restartTime);
}

/**
 * Creates a fake connection to a given url.
 * We open the given url in a new tab in our hidden browser window.
 * 
 * @param {string} url The url we want to connect to.
 * @param {string} algo The algorithm used in this tab.
 */
function connectToUrl(url, algo) {
	// Do not visit a page too many times and do not visit the extension page
	// (does not start with http)
	if ((browserHistory.has(url) && browserHistory.get(url) >= maxVisits) ||
		!url.startsWith('http')) {
		return;
	}

	// If the tab limit is reached, wait until we can open a new tab again
	var waiting = setInterval(function () {
		if (maxTabsCount > currentTabs.reduce((n, val) => n + (val.id != -1), 0)) {
			// If we can open a new tab, stop waiting and do not repeat anything
			clearInterval(waiting);

			// Visit urls from the history again until we visited all of them equally often.
			if (browserHistory.has(url)) {
				browserHistory.set(url, browserHistory.get(url) + 1);
				queue.push(url);
			}

			chrome.tabs.create({
				windowId: windowId,
				index: currentTabs.length,
				url: url,
				active: false
			}, function (tab) {
				tab.isNew = true; // We need this to execute content scripts only once
				tab.algorithm = algo;
				currentTabs[currentTabs.findIndex(elem => elem.id == -1)] = tab;
			});
		}
	}, 3000); // Check all 3 seconds if a new tab can be opened
}

/*
 * Searches for possible search terms in the user's browser history. Saves the results
 * to the 'searchTerms' array.
 */
function getSearchTerms() {
	chrome.history.search({
		text: '',
		'startTime': (new Date).getTime() - 1000 * 60 * 60 * 24 * 5
	}, function (historyItems) {
		for (const historyItem of historyItems) {
			var url = historyItem.url;
			if (url.indexOf('?q=') > 0) {
				searchTerms.push(
					decodeURIComponent(url.substring(
						url.indexOf('?q=') + 3,
						url.indexOf('&') > 0 ? url.indexOf('&') : url.length
					))
				);
			}
		}
	});
}

function getUserBehavior() {
	var interval = 1000 * 60 * 60 * 24;
	chrome.history.search({
		'text': '',
		'startTime': (new Date).getTime() - interval // Last day
	}, function (historyItems) {
		var quotient = historyItems.length / (interval / 1000 / 60);
		console.log(historyItems.length, interval / 1000 / 60, quotient);
	});
}