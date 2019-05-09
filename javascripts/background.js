'use strict';

/*
 * Holds the browser history of a given time interval. This information can be used to visit
 * popular sites from the user.
 */
var browserHistory = new Map();

/*
 * Milliseconds to subtract from the current time in order to get the start time for the browser
 * history. The default value is set to the last 3 days and the user can change the value at any
 * time.
 */
var interval = 1000 * 60 * 60 * 24 * 3;

/*
 * Specifies which algorithms for fooling fingerprinters are available.
 *
 * algorithms.DEFAULT: algorithms.HISTORY is the default algorithm at the moment.
 * algorithms.HISTORY: Uses the browser history to visit websites from there randomly.
 */
const algorithms = {
	DEFAULT: 'DEFAULT',
	HISTORY: 'HISTORY'
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
 * when finished. The selected algorithm defines what these fake connections do exactly.
 */
function runApplication() {
	initialize();
	selectAlgorithm(); // Saves selected algorithm in variable 'activeAlgorithm'

	switch (activeAlgorithm) {
		case algorithms.DEFAULT:
			execDefault();
			break;
		case algorithms.HISTORY:
			execHistory();
			break;
	}
};

/**
 * Loads the statistics and settings from the storage at the start of the application.
 */
function initialize() {
	chrome.storage.sync.get([
		'visitedSitesCount', 'clickedLinksCount', 'keywordSearchCount'
	], function (res) {
		visitedSitesCount = res.visitedSitesCount != undefined ? res.visitedSitesCount : 0;
		clickedLinksCount = res.clickedLinksCount != undefined ? res.clickedLinksCount : 0;
		keywordSearchCount = res.keywordSearchCount != undefined ? res.keywordSearchCount : 0;
	});
}

/**
 * Selects an algorithm to execute based on some criteria (not defined yet).
 */
function selectAlgorithm() {
	// TODO: Implementation & Update comment
}

/**
 * Executes the default algorithm.
 * 
 * This algorithm does nothing, apparently. Therefore, it calls another algorithm for now.
 */
function execDefault() {
	// TODO: Implementation & Update comment & Update comment for algorithms constant
	execHistory();
}

/**
 * Executes the history algorithm.
 * 
 * This algorithm creates connections based on the users browser history so far.
 */
function execHistory() {
	chrome.history.search({
		'text': '',
		'startTime': (new Date).getTime() - interval
	}, function (historyItems) {
		// Save which urls were visited and how often they were visited (using a key-value
		// datastructure for this purpose).
		for (var i = 0; i < historyItems.length; i++) {
			browserHistory.set(historyItems[i].url, historyItems[i].visitCount);
		}

		// Sort the urls by number of visits.
		browserHistory = new Map([...browserHistory.entries()].sort(function (a, b) {
			return a[1] - b[1];
		}));

		var index = 0;
		var connectionCount = 5;
		for (const [key, value] of browserHistory.entries()) {
			setTimeout(function () {
				connectToUrl('https://google.de', algorithms.HISTORY);
			}, 1000);

			index++;
			if (index == connectionCount) {
				break;
			}
		}
	});
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