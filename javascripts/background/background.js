'use strict';

/*
 * Holds the browser history of a given time interval. This information can be used to visit
 * popular sites from the user.
 */
var browserHistory = new Map();

/*
 * Defines the maximum amount of connections being made. The connection limit is the number
 * of maxConnectCount multiplied by the number of connections being made by the user per day.
 */
var maxConnectCount = 2;
var connectionLimit = 20;

/*
 * Holds the maximum of visits for an url from the queue. We want to visit all the other sites
 * equally often.
 */
var maxVisits = 10;

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
var todayConnectionCount = 0;

/*
 * Holds special tabs for getting search terms.
 */
var specialTabs = new Array(100).fill({
	id: -1
});

/**
 * Starts the application: Creates fake connections in the hidden window and removes the tabs
 * when finished. The selected algorithm defines what exactly these fake connections do.
 */
function runApplication() {
	chrome.storage.sync.get(Object.values(data.availableStatistics).concat(
		Object.values(data.availableSettings)), res => {
		// Settings
		maxConnectCount = res.maxConnectCount != undefined ?
			parseInt(res.maxConnectCount) :
			maxConnectCount;
		maxTabsCount = res.maxTabsCount != undefined ?
			parseInt(res.maxTabsCount) :
			maxTabsCount;
		var interval = res.interval != undefined ? parseInt(res.interval) : 1; // Default 1 day
		interval = interval * 1000 * 60 * 60 * 24; // interval has unit days but needs millisec
		activeAlgorithm = res.activeAlgorithm != undefined ?
			res.activeAlgorithm :
			data.availableAlgorithms.DEFAULT;
		todayConnectionCount = res.todayConnectionCount != undefined ?
			parseInt(todayConnectionCount) :
			todayConnectionCount;

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
		}, historyItems => {
			// Get the number of visits for each page during the specified time interval.
			var count = 0;
			var totalVisits = 0;
			for (const historyItem of historyItems) {
				chrome.history.getVisits({
					url: historyItem.url
				}, results => {
					var shortUrl = historyItem.url;
					if (shortUrl.indexOf('?') > 0) {
						shortUrl = shortUrl.substring(0, shortUrl.indexOf('?'));
					}
					// Save which urls were visited and how often they were visited (using a 
					// key-value datastructure for this purpose).
					browserHistory.set(shortUrl, results.filter(item =>
						item.visitTime >= (new Date).getTime() - interval
					).length);
					queue.push(shortUrl); // Add to processing queue
					totalVisits += browserHistory.get(shortUrl);

					// After the last iteration we want to continue by visiting the urls.
					// Necessary to check in here because of asynchronous calls.
					count++;
					if (count == historyItems.length) {
						// Get the max value (because we want to visit all sites equally often
						maxVisits = Math.max(...browserHistory.values());
						connectionLimit =
							Math.ceil(
								totalVisits / (interval / 1000 / 60 / 60 / 24)
							) * maxConnectCount;

						/* 
						 * Create an array of fixed size such that push and splice are not
						 * neccessary anymore (they both cause problems because there are
						 * multiple calls in parallel when adding or removing tabs).
						 * Afterwards, we fill array with invalid ids, such that we are not
						 * accessing the id of an undefined element.
						 */
						currentTabs = new Array(connectionLimit);
						currentTabs.fill({
							id: -1
						});

						// First call instant, then interval
						connectToUrl(queue.shift(), activeAlgorithm);
						todayConnectionCount++;
						connectLoop(5000 * Math.random() + 5000); // 5 to 10 seconds
					}
				});
			}
		});
	});
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
		connectToUrl(queue.shift(), activeAlgorithm);

		if ((++todayConnectionCount > connectionLimit) || !(queue.length > 0)) {
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
				tab.algorithm = algo;
				currentTabs[currentTabs.findIndex(elem => elem.id == -1)] = tab;
			});
		}
	}, 3000); // Check all 3 seconds if a new tab can be opened
}



/*
 * Searches for possible search terms in the user's browser history. Saves the results
 * to the 'searchTerms' objectStore in our database.
 */
async function getSearchTerms() {
	return await new Promise(resolve => {
		var time = 1000 * 60 * 60 * 24 * 7;
		chrome.history.search({
			text: '',
			'startTime': (new Date).getTime() - time,
			maxResults: 120
		}, historyItems => {
			// Remove duplicates
			historyItems = historyItems.filter((val, ind, self) => self.indexOf(val) == ind);
			getTermForEachItem(historyItems, time).then(() => resolve());
		});
	});
}

/**
 * Gets the search term for a list of urls from the browser history.
 * 
 * @param {array} historyItems The array of visited urls.
 * @param {number} time Timestamp of the start time for the visits. 
 */
async function getTermForEachItem(historyItems, time) {
	for (const historyItem of historyItems) {
		// Only consider urls with parameter
		if (historyItem.url.indexOf('?') < 0) {
			continue;
		}

		await new Promise(resolve => {
			chrome.history.getVisits({
				url: historyItem.url
			}, res => {
				var visits = res.filter(v => v.visitTime >= (new Date).getTime() - time);
				getFromDatabase('searchTerms', getKeyFromUrl(historyItem.url)).then(re => {
					re.onsuccess = event => {
						var visitTimesToAdd = [];
						// Check for every visit if it already exists. If not, add it.
						for (var visit of visits) {
							if (!(re.result == undefined)) {
								var isDuplicate = false;
								for (var term of re.result.terms) {
									// term[1] holds the visit time of that search term
									if (term[1] == Math.trunc(visit.visitTime)) {
										isDuplicate = true;
										break;
									}
								}

								if (!isDuplicate) {
									visitTimesToAdd.push(visit.visitTime);
								}
							} else {
								visitTimesToAdd = visitTimesToAdd
									.concat(visits.map(v => Math.trunc(v.visitTime)));
								break;
							}
						}

						if (visitTimesToAdd.length > 0) {
							getSearchTerm(historyItem.url, visitTimesToAdd).then(() => {
								resolve();
							});
						} else {
							resolve();
						}
					};
				});
			});
		});
	}

	return true;
}

/**
 * Grabs search terms for a given url. The timestamp is needed to avoid multiple saves of the
 * same search terms.
 * 
 * @param {string} url The visited website.
 * @param {array} visitTimes Timestamps of the visit times for this url.
 */
async function getSearchTerm(url, visitTimes) {
	// Only consider urls with parameters
	if (url.indexOf('?') > 0) {
		return await new Promise(resolve => {
			var key = getKeyFromUrl(url);
			getFromDatabase('searchParams', key).then(res => {
				res.onsuccess = event => {
					// Find out url params, since they are not existing in our database yet.
					// If condition is met, resolve() is called after getting the params from
					// this tab (which happens via message passing).
					if (res.result == undefined) {
						chrome.tabs.create({
							windowId: windowId,
							index: currentTabs.length,
							url: url.split('?')[0],
							active: false
						}, tab => {
							tab.isSpecial = true;
							tab.visitTimes = visitTimes;
							tab.originUrl = url;
							tab.resolve = resolve;
							specialTabs[specialTabs.findIndex(elem => elem.id == -1)] = tab;
						});
					} else if (res.result.terms != undefined && res.result.terms[0] != '') {
						var term = new URLSearchParams(url.split('?')[1]).get(res.result.terms[0]);
						if (term != null) { // Only store existing terms
							for (var visitTime of visitTimes) {
								storeInDatabase('searchTerms', key, [
									decodeURIComponent(term), Math.trunc(visitTime)
								]);
							}
						}
						resolve();
					} else {
						resolve();
					}
				};
			});
		});
	}

	return true;
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

/**
 * Turns an url into a key for our database. The key is simply the hostname of that url.
 * @param {string} url The url of which we want to get a key.
 */
function getKeyFromUrl(url) {
	var key = url.startsWith('http') ? new URL(url).hostname : new URL('http://' + url).hostname;
	return key.startsWith('www.') ? key : 'www.' + key;
}

/**
 * Adds new entries to our indexedDB database.
 * 
 * @param {Object} objectStore The table we want to update.
 * @param {string} key The key of the item we want to update/add.
 * @param {Object} val The new value for the given key.
 * @param {bool} append Specifies if a value should be appended or overwritten.
 * @param {function} callback Optional callback function, executed after updating the database.
 */
function storeInDatabase(objectStore, key, val, append = true, callback) {
	var trans = database.transaction(objectStore, 'readwrite');
	var store = trans.objectStore(objectStore);
	var getRequest = store.get(key);

	getRequest.onsuccess = event => {
		var terms = (getRequest.result != undefined && append) ?
			getRequest.result.terms.concat([val]) : [val];
		var update = store.put({
			url: key,
			terms: terms
		});

		update.onsuccess = event => {
			typeof callback === 'function' && callback();
		};
	};
}

/**
 * Returns the value for a given key from our indexedDB database.
 * 
 * @param {Object} objectStore The table we want to update.
 * @param {string} key The key of the item we want to update/add.
 * @return {Promise} The corresponding value to the given key.
 */
async function getFromDatabase(objectStore, key) {
	return await database.transaction(objectStore, 'readonly').objectStore(objectStore).get(key);
}

/**
 * Shuffles a given array.
 * 
 * @param {Array} array The array we want to shuffle.
 * @return {Array} The shuffled array.
 */
function shuffleArray(array) {
	var currentIndex = array.length;
	var temporaryValue, randomIndex;

	while (currentIndex != 0) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
};