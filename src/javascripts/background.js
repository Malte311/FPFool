'use strict';

/*
 * Keeps track of the tabs which are currently open to create fake connections.
 */
var currentTabs = [];

/*
 * Holds the browser history of a given time interval. This information can be used to visit
 * popular sites at random.
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
				connectToUrl(key, false, false);

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
 * 
 * A http request is sent to the url such that the url thinks that the user visited it.
 * Afterwards, the url is added to the browser history since it was visited just now.
 * 
 * @param {string} url The url we want to connect to.
 * @param {boolean} navigate Specifies if we want to klick on links on the given webpage.
 * @param {boolean} search Specifies if we want to search (submit input) on the given webpage.
 */
function connectToUrl(url, navigate, search) {
	// Remember to remove fake connections from browsing history (it could confuse the user)
	chrome.tabs.create({
		windowId: windowId,
		index: currentTabs.length,
		url: url,
		active: false
	}, function (tab) {
		currentTabs.push(tab);

		if (navigate) {
			pageNavigation(tab.id);
		}
		if (search) {
			pageSearch(tab.id);
		}
	});
}

/**
 * Navigates on a currently visited webpage. This means we navigate through it by simulating
 * klicks on links.
 * 
 * At the moment, these links are chosen randomly.
 * 
 * @param {integer} tabId The tab in which we want to do things.
 */
function pageNavigation(tabId) {
	var url = currentTabs.filter(tab => tab.id == tabId)[0].url;

	var http = new XMLHttpRequest();
	http.open('GET', url, true); // true = async
	http.send();
	http.onreadystatechange = function (err) {
		if (this.readyState == 4 && this.status == 200) {
			var links = [];
			$('a', http.responseText).each(function () {
				links.push(this.href);
			});

			var randomVisit = links[Math.floor(Math.random() * (links.length - 1))];
			chrome.tabs.update(tabId, {
				url: randomVisit
			}, function (tab) {
				chrome.history.deleteUrl({
					url: randomVisit
				});
			});
		}
	}
}

/**
 * Tries to find input fields on the current webpage and simulates a user typing in things in
 * these input fields.
 * 
 * The user input is currently chosen from a dictionary.
 * 
 * @param {integer} tabId The tab in which we want to do things.
 */
function pageSearch(tabId) {
	chrome.tabs.executeScript({
		tabId: tabId,
		code: "console.log('test')"
	});
}