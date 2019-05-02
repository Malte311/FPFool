'use strict';

/*
 * Holds the browser history of a given time interval. This information can be used to visit
 * popular sites from the user.
 */
var browserHistory = new Map();

/*
 * Specifies which algorithms for fooling fingerprinters are available.
 *
 * DEFAULT: TODO.
 * HISTORY: Uses the browser history to visit websites from there randomly.
 */
const algorithms = {
	DEFAULT: 'default',
	HISTORY: 'history'
};

/*
 * Holds the currently selected algorithm.
 */
var activeAlgorithm = algorithms.DEFAULT;

/**
 * Starts the application: Creates fake connections in the hidden window and removes the tabs
 * when finished. Afterwards, the falsely added sites to the users browsing history are being
 * removed from the browser history again.
 */
function runApplication() {
	loadSettings();

	selectAlgorithm();
	switch (activeAlgorithm) {
		case algorithms.DEFAULT:
			execDefault();
			break;
		case algorithms.history:
			execHistory();
			break;
	}
}

/**
 * Loads the users settings, if present. Otherwise, the default settings are being used and saved.
 */
function loadSettings() {
	chrome.storage.sync.get(['interval'], function (result) {
		if (result.interval != undefined) {
			interval = result.interval;
		} else {
			chrome.storage.sync.set({
				'interval': interval
			});
		}
	});
}

/**
 * Selects an algorithm to execute based on some criteria (not defined yet).
 */
function selectAlgorithm() {
	// Idea: Choose algorithm based on fingerprint (different algorithm for different devices)
}

/**
 * Executes the default algorithm.
 * 
 * This algorithm does nothing, apparently. Therefore, it calls another algorithm for now.
 */
function execDefault() {
	execHistory();
}

/**
 * Executes the history algorithm.
 * 
 * This algorithm creates connections based on the users browser history so far.
 */
function execHistory() {
	// The variable 'interval' was defined in the setup.js script.
	chrome.history.search({
			'text': '',
			'startTime': (new Date).getTime() - interval
		},
		function (historyItems) {
			// Save which urls were visited and how often they were visited (using a key-value
			// datastructure for this purpose).
			for (var i = 0; i < historyItems.length; i++) {
				browserHistory.set(historyItems[i].url, historyItems[i].visitCount);
			}

			// Sort the urls by number of visits.
			browserHistory = new Map([...browserHistory.entries()].sort(function (a, b) {
				return a[1] - b[1];
			}));

			// Idea: Timer for calling connectToUrl; update the browserHistory map datastructure
			var index = 0;
			var connectionCount = 1;
			for (const [key, value] of browserHistory.entries()) {
				connectToUrl('https://google.de/', false, true);

				index++;
				if (index == connectionCount) {
					break;
				}
			}
		}
	);
}

/**
 * Creates a fake connection to a given url.
 * We open the given url in a new tab in our hidden browser window.
 * 
 * @param {string} url The url we want to connect to.
 */
function connectToUrl(url) {
	chrome.tabs.create({
		windowId: windowId,
		index: currentTabs.length,
		url: url,
		active: false
	}, function (tab) {
		tab.isNew = true; // For logging the event when a new tab is created
		chrome.storage.sync.get(['activeTabs'], function (result) {
			currentTabs = result.activeTabs;
			currentTabs.push(tab);
			chrome.storage.sync.set({
				activeTabs: currentTabs
			});
		});
	});
}