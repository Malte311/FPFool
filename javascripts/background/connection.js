'use strict';

/*
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
		loadSearchTerms(startConnectLoop);
	});
}

/**
 * Starts the connection loop for the first time.
 */
function startConnectLoop() {
	// First call instant, then interval
	if (queue.length > 1) {
		connectToUrl(queue.shift());
		todayCount++;
		connectLoop(5000 * Math.random() + 5000); // 5 to 10 seconds
	}
}

/**
 * Repeats connecting to webpages.
 * 
 * @param {number} restartTime Number of milliseconds until a new connection should be made.
 */
function connectLoop(restartTime) {
	restartTime = Math.trunc(restartTime);
	var startTime = (new Date).getTime();

	var running = setInterval(() => {
		connectToUrl(queue.shift());

		if ((++todayCount > connectionLimit) || queue.length < 1) {
			clearInterval(running);
		}

		// Pause after 30 seconds; restart after 1-3 mintues with new interval duration
		if ((new Date).getTime() > startTime + 30000) {
			clearInterval(running);
			setTimeout(() => {
				if (queue.length > 15) {
					restartLoop(restartTime * 0.7);
				} else {
					restartLoop(restartTime * 1.2);
				}
			}, 1000 * (queue.length > 15 ? 60 : (queue.length > 5 ? 120 : 180)));
		}
	}, restartTime);
}

/**
 * Restarts the connection loop. The queue gets shuffled as well.
 * 
 * @param {number} restartTime Number of milliseconds until a new connection should be made.
 */
function restartLoop(restartTime) {
	queue = shuffleArray(queue);
	connectLoop(restartTime);
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
				queue.push(url);

				chrome.tabs.create({
					windowId: windowId,
					index: currentTabs.length,
					url: url,
					active: false
				}, tab => {
					tab.isNew = true; // We need this to execute content scripts only once
					tab.type = 'execAlgo';
					currentTabs[currentTabs.findIndex(elem => elem.id == -1)] = tab;
				});
			}
		}, 3000); // Check all 3 seconds if a new tab can be opened
	});
}