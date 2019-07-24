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

	if (lastUse == undefined || lastUse <= (new Date).getTime() - 1000 * 60 * 60) {
		getSearchTerms(() => {
			chrome.storage.sync.set({
				lastSearchTermsInit: (new Date).getTime()
			});
			runApplication();
		});
	}
	else {
		runApplication();
	}


	loadBrowserHistory(() => {
		loadSearchTerms(startConnectLoop);
	});
}

function loadSearchTerms(callback) {

}

function startConnectLoop() {

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

		if ((++todayCount > connectionLimit) || !(queue.length > 0)) {
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
	// Do not visit a page too many times and do not visit the extension page
	// (does not start with http)
	if ((browserHistory.has(url) && browserHistory.get(url) >= maxVisits) ||
		!url.startsWith('http')) {
		return;
	}

	// If the tab limit is reached, wait until we can open a new tab again
	var waiting = setInterval(() => {
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
			}, tab => {
				tab.isNew = true; // We need this to execute content scripts only once
				tab.type = 'execAlgo';
				currentTabs[currentTabs.findIndex(elem => elem.id == -1)] = tab;
			});
		}
	}, 3000); // Check all 3 seconds if a new tab can be opened
}

/**
 * Sets the url parmaeter for a given url.
 * 
 * @param {string} url The url for which we want to set the parameter.
 * @param {string} dummySearchTerm The search term used to find out the parameter.
 * @param {array} visitTimes Array of visit times for the url to get search terms after updating
 * the url parameter.
 * @param {string} originUrl Optional parameter in case the origin url differs from the url (some
 * websites redirect after search).
 * @param {function} resolve Resolves the underlying promise, e.g. the next url can get its params.
 */
function setUrlParams(url, dummySearchTerm, visitTimes, originUrl, resolve) {
	var resolved = false;
	var params = new URLSearchParams(url.split('?')[1]);
	for (const [key, val] of params.entries()) {
		if (val.toLowerCase() == dummySearchTerm.toLowerCase()) { // Some sites capitalize queries
			// If origin url redirects us, the origin url itself is not searchable.
			if (url != originUrl) {
				storeInDatabase('searchParams', getKeyFromUrl(originUrl), '', false, () => {
					chrome.history.deleteUrl({
						url: originUrl
					}, () => {
						storeInDatabase('searchParams', getKeyFromUrl(url), key, false, () => {
							chrome.history.deleteUrl({
								url: url
							}, () => {
								resolve();
								getSearchTerm(originUrl, visitTimes);
							});
						});
					});
				});
			} else {
				storeInDatabase('searchParams', getKeyFromUrl(url), key, false, () => {
					chrome.history.deleteUrl({
						url: url
					}, () => {
						resolve();
						getSearchTerm(originUrl, visitTimes);
					});
				});
			}

			resolved = true;
			break;
		}
	}

	if (!resolved) { // Prevent from calling resolve() twice
		resolve();
	}
}