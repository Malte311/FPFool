/**
 * @module background script - searchTermSetup
 */
'use strict';

/**
 * Searches for possible search terms in the user's browser history. Saves the results
 * to the 'searchTerms' objectStore in our database.
 * 
 * @param {function} [callback] Optional callback function. 
 */
function loadSearchTerms(callback) {
	chrome.history.search({
		text: '',
		'startTime': startTime,
		maxResults: connectionLimit <= 100 ? connectionLimit : 100
	}, historyItems => {
		asyncArrLoop(historyItems, (item, inCallback) => {
			if (item.url.indexOf('?') < 0) { // Only consider urls with parameter
				inCallback();
				return;
			}
		
			findVisitsForUrl(item.url, startTime, inCallback);
		}, callback, 0);
	});
}

/**
 * Gets new visits for a given url and saves search terms for these visits in the database.
 * 
 * @param {string} url The url for which we want to get the new visits.
 * @param {number} timeInterval Timestamp of the start time for visits.
 * @param {function} [callback] Optional callback function.
 */
function findVisitsForUrl(url, timeInterval, callback) {
	chrome.history.getVisits({
		url: url
	}, result => {
		var visits = result.filter(v => v.visitTime >= timeInterval);

		getFromDatabase('searchTerms', getKeyFromUrl(url), result => {
			findNewVisits(visits, result, newVisits => {
				getSearchTerm(url, newVisits, () => {
					typeof callback === 'function' && callback();
				});
			});
		});
	});
}

/**
 * Checks for a given array of visit times if these visits are already present in the database.
 * 
 * @param {Object[]} visits Visits to check if they are already included in the database.
 * @param {Object} dbVisits Visits already present in the database.
 * @param {function} callback Mandatory callback function containing new visits as parameter.
 */
function findNewVisits(visits, dbVisits, callback) {
	var newVisits = [];

	// Check for every visit if it already exists. If not, add it.
	for (var visit of visits) {
		if (!(dbVisits == undefined)) {
			var isDuplicate = false;

			for (var term of dbVisits.value) {
				// term[1] holds the visit time of that search term
				if (term[1] == Math.trunc(visit.visitTime)) {
					isDuplicate = true;
					break;
				}
			}

			if (!isDuplicate) {
				newVisits.push(visit.visitTime);
			}
		} else {
			newVisits = newVisits.concat(visits.map(v => Math.trunc(v.visitTime)));
			break;
		}
	}

	callback(newVisits);
}

/**
 * Grabs search terms for a given url. The timestamps are needed to avoid multiple saves of the
 * same search term (although it was not searched that many times).
 * 
 * @param {string} url The visited website.
 * @param {Object[]} visitTimes Timestamps of the visit times for this url.
 * @param {function} [callback] Optional callback function.
 */
function getSearchTerm(url, visitTimes, callback) {
	// Only consider new visits with parameters
	if (visitTimes.length < 1 || url.indexOf('?') < 0) {
		typeof callback === 'function' && callback();
		return;
	}

	var key = getKeyFromUrl(url);

	getFromDatabase('searchParams', key, result => {
		// Find out url params, since they are not existing in our database yet.
		if (result == undefined) {
			// Find out parameter and afterwards get search terms for the url.
			getSearchParam(url, () => {
				getSearchTerm(url, visitTimes, callback);
			});
		} else {
			var term = new URLSearchParams(url.split('?')[1]).get(result.value[0]);

			if (term != null && term.trim().length > 0) {
				asyncArrLoop(visitTimes, (item, inCallback) => {
					storeInDatabase('searchTerms', key, [decodeURIComponent(term), Math.trunc(item)], inCallback);
				}, callback, 0);
			}

			typeof callback === 'function' && callback(); // Call callback, if it is defined
		}
	});
}

/**
 * Finds out the search parameter for a given url.
 * 
 * @param {string} url The url for which we want to determine the search parameter.
 * @param {function} [callback] Optional callback function, executed when done.
 */
function getSearchParam(url, callback) {
	chrome.tabs.create({
		windowId: windowId,
		index: currentTabs.length,
		url: url.split('?')[0],
		active: false
	}, tab => {
		tab.isNew = true;
		tab.type = 'getUrlParam';
		tab.callback = callback; // Call callback, when tab is done
		specialTabs[specialTabs.findIndex(elem => elem.id == -1)] = tab;
	});
}

/**
 * Sets the url parmaeter for a given url.
 * 
 * @param {string} url The url for which we want to set the parameter.
 * @param {string} originUrl The origin url (some pages redirect on search).
 * @param {string} dummyTerm The search term used to find out the parameter.
 * @param {function} [callback] Optional callback function.
 */
function saveSearchParam(url, originUrl, dummyTerm, callback) {
	if (dummyTerm == '') {
		storeInDatabase('searchParams', getKeyFromUrl(url), '', false, callback);
		return;
	}

	var params = new URLSearchParams(url.split('?')[1]);
	for (const [key, val] of params.entries()) {
		if (val.toLowerCase() == dummyTerm.toLowerCase()) { // Some sites capitalize queries
			// Some sites redirect on search, so we make sure that we add url as well as originUrl.
			storeInDatabase('searchParams', getKeyFromUrl(originUrl), key, false, () => {
				storeInDatabase('searchParams', getKeyFromUrl(url), key, false, () => {
					chrome.history.deleteUrl({
						url: url
					}, () => {
						chrome.history.deleteUrl({
							url: originUrl
						}, callback);
					});
				});
			});
			
			return;
		}
	}

	typeof callback === 'function' && callback();
}