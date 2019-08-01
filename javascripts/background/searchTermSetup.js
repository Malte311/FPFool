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
	clearDatabase('searchTerms', () => {
		chrome.history.search({
			text: '',
			'startTime': startTime
		}, historyItems => {
			asyncArrLoop(historyItems, (item, inCallback) => {
				if (item.url.indexOf('?') < 0) { // Only consider urls with parameter
					inCallback();
					return;
				}
			
				getSearchTerm(item.url, inCallback);
			}, callback, 0);
		});
	});
}

/**
 * Grabs the search term for a given url.
 * 
 * @param {string} url The visited website.
 * @param {function} [callback] Optional callback function.
 */
function getSearchTerm(url, callback) {
	// Only consider urls with parameters
	if (url.indexOf('?') < 0) {
		typeof callback === 'function' && callback();
		return;
	}

	var key = getKeyFromUrl(url);

	getFromDatabase('searchParams', key, result => {
		// Find out url params, since they are not existing in our database yet.
		if (result == undefined) {
			// Find out parameter and afterwards get search terms for the url.
			getSearchParam(url, () => {
				getSearchTerm(url, callback);
			});
		} else {
			var term = new URLSearchParams(url.split('?')[1]).get(result.value[0]);

			if (term != null && term.trim().length > 0) {
				storeInDatabase('searchTerms', key, decodeURIComponent(term), true, callback);
				return; // Avoid double callback call
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