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
 * The maximum amount of connections to be made.
 */
var maxConnectionCount = 15;

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
	initialize(); // Saves selected algorithm in variable 'activeAlgorithm'

	switch (activeAlgorithm) {
		case algorithms.DEFAULT:
			execDefault();
			break;
		case algorithms.NAVIGATE:
			execNavigate();
			break;
		case algorithms.SEARCH:
			execSearch();
			break;
	}
};

/**
 * Loads the statistics and settings from the storage at the start of the application.
 */
function initialize() {
	// Only necessary when user clicks on the extension page icon. Therefore, we do not need to
	// put the following instructions into the callback function.
	chrome.storage.sync.get([
		'visitedSitesCount', 'clickedLinksCount', 'keywordSearchCount'
	], function (res) {
		visitedSitesCount = res.visitedSitesCount != undefined ? res.visitedSitesCount : 0;
		clickedLinksCount = res.clickedLinksCount != undefined ? res.clickedLinksCount : 0;
		keywordSearchCount = res.keywordSearchCount != undefined ? res.keywordSearchCount : 0;
	});

	chrome.history.search({
		'text': '', // All entries in a given time interval
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

		// var index = 0;
		// var connectionCount = 5;
		// for (const [key, value] of browserHistory.entries()) {
		// 	setTimeout(function () {
		// 		connectToUrl('https://google.de', algorithms.NAVIGATE);
		// 	}, 1000);

		// 	index++;
		// 	if (index == connectionCount) {
		// 		break;
		// 	}
		// }
		for (var i = 0; i < [...browserHistory.keys()].length; i++) {
			console.log([...browserHistory.keys()][i]);
		}
	});
}

/**
 * Selects an algorithm to execute based on some criteria (not defined yet).
 */
function selectAlgorithm() {
	// TODO: Implementation & Update comment, be careful with asynchronous functions
	console.log(browserHistory);
}

/**
 * Executes the default algorithm.
 * 
 * This algorithm simply opens a webpage.
 */
function execDefault() {
	// TODO: Implementation & Update comment & Update comment for algorithms constant

}

/**
 * Executes the navigate algorithm.
 * 
 * This algorithm navigates to a new url by clicking on links.
 */
function execNavigate() {

}

/**
 * Executes the search algorithm.
 * 
 * This algorithm searches for keywords on a webpage.
 */
function execSearch() {

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