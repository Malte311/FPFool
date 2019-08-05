/**
 * @module background script - connection
 */
'use strict';

/**
 * Keeps track of the websites we want to visit next.
 */
var queue = [];

/**
 * Starts the application: Creates fake connections in the hidden window and removes the tabs
 * when finished. The selected algorithm defines what exactly these fake connections do.
 */
function runApplication() {
	// 1. Load browser history; 2. Load search terms; 3. Start connection loop
	loadBrowserHistory(() => {
		loadSearchTerms(() => {
			if (queue.length > 0) {
				// First call instant, then interval
				connectToUrl(queue.shift());
				startConnectLoop();
			}
		});
	});
}

/**
 * Repeats connecting to webpages.
 */
function startConnectLoop() {
	setTimeout(() => {
		connectToUrl(queue.shift());

		// Continue while limit not reached and queue not empty.
		if ((todayCount < connectionLimit) && queue.length > 0) {
			startConnectLoop();
		}
	}, Math.floor(10000 * Math.random() + 10000)); // 10-20 seconds
}

/**
 * Creates a fake connection to a given url.
 * We open the given url in a new tab in our hidden browser window.
 * 
 * @param {string} url The url we want to connect to.
 */
function connectToUrl(url) {
	getFromDatabase('visits', getKeyFromUrl(url), result => {
		// Do not visit a page too many times and do not visit the extension page
		// (does not start with http)
		if (result == undefined || !url.startsWith('http') || result.value[0] >= maxVisits) {
			return;
		}

		// If the tab limit is reached, wait until we can open a new tab again
		var waiting = setInterval(() => {
			if (tabLimit > currentTabs.reduce((n, val) => n + (val.id != -1), 0)) {
				// If we can open a new tab, stop waiting and do not repeat anything
				clearInterval(waiting);

				// Visit urls from the history again until we visited all of them equally often.
				storeInDatabase('visits', getKeyFromUrl(url), result.value[0] + 1, false);

				if (result.value[0] + 1 < maxVisits)
					queue.push(url);

				chrome.tabs.create({
					windowId: windowId,
					index: currentTabs.length,
					url: url,
					active: false
				}, tab => {
					todayCount++;
					tab.isNew = true; // We need this to execute content scripts only once
					tab.type = 'execAlgo';
					currentTabs[currentTabs.findIndex(elem => elem.id == -1)] = tab;
				});
			}
		}, 3000); // Check all 3 seconds if a new tab can be opened
	});
}