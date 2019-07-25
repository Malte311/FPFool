'use strict';

function loadSearchTerms(callback) {
	
}

/*
 * Searches for possible search terms in the user's browser history. Saves the results
 * to the 'searchTerms' objectStore in our database.
 * 
 * @param {function} callback Optional callback function.
 */
function getSearchTerms(callback) {
	var time = 1000 * 60 * 60 * 24 * 7;
	chrome.history.search({
		text: '',
		'startTime': (new Date).getTime() - time,
		maxResults: 120
	}, historyItems => {
		// Remove duplicates
		historyItems = historyItems.filter((val, ind, self) => self.indexOf(val) == ind);
		getTermForEachItem(historyItems, time).then(() => {
			typeof callback === 'function' && callback(); // Call callback, if it is defined
		});
	});
}

/**
 * Gets the search term for a list of urls from the browser history.
 * 
 * @param {array} historyItems The array of visited urls.
 * @param {number} time Timestamp of the start time for the visits.
 * @param {function} callback Optional callback function.
 */
function getTermForEachItem(historyItems, time, callback) {
	for (const historyItem of historyItems) {
		// Only consider urls with parameter
		if (historyItem.url.indexOf('?') < 0) {
			continue;
		}

		chrome.history.getVisits({
			url: historyItem.url
		}, res => {
			var visits = res.filter(v => v.visitTime >= (new Date).getTime() - time);
			getFromDatabase('searchTerms', getKeyFromUrl(historyItem.url), re => {
				var visitTimesToAdd = [];
				// Check for every visit if it already exists. If not, add it.
				for (var visit of visits) {
					if (!(re == undefined)) {
						var isDuplicate = false;
						for (var term of re.value) {
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
						typeof callback === 'function' && callback(); // Call callback, if it is defined
					});
				} else {
					typeof callback === 'function' && callback(); // Call callback, if it is defined
				}

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
 * @param {function} callback Optional callback function.
 */
function getSearchTerm(url, visitTimes, callback) {
	// Only consider urls with parameters
	if (url.indexOf('?') > 0) {
		var key = getKeyFromUrl(url);
		getFromDatabase('searchParams', key, res => {
			// Find out url params, since they are not existing in our database yet.
			// If condition is met, callback() is called after getting the params from
			// this tab (which happens via message passing).
			if (res == undefined) {
				chrome.tabs.create({
					windowId: windowId,
					index: currentTabs.length,
					url: url.split('?')[0],
					active: false
				}, tab => {
					tab.type = 'getUrlParam';
					tab.visitTimes = visitTimes;
					tab.originUrl = url;
					tab.resolve = callback;
					specialTabs[specialTabs.findIndex(elem => elem.id == -1)] = tab;
				});
			} else if (res.value != undefined && res.value[0] != '') {
				var term = new URLSearchParams(url.split('?')[1]).get(res.value[0]);
				if (term != null) { // Only store existing terms
					for (var visitTime of visitTimes) {
						storeInDatabase('searchTerms', key, [
							decodeURIComponent(term), Math.trunc(visitTime)
						]);
					}
				}
				typeof callback === 'function' && callback(); // Call callback, if it is defined
			} else {
				typeof callback === 'function' && callback(); // Call callback, if it is defined
			}

		});
	}
}

/**
 * Sets the url parmaeter for a given url.
 * 
 * @param {string} url The url for which we want to set the parameter.
 * @param {string} dummyTerm The search term used to find out the parameter.
 * @param {function} callback Optional callback function.
 */
function saveSearchParam(url, dummyTerm, callback) {
	if (dummyTerm == '') {
		storeInDatabase('searchParams', getKeyFromUrl(url), '', false, callback);
		return;
	}

	var params = new URLSearchParams(url.split('?')[1]);
	for (const [key, val] of params.entries()) {
		if (val.toLowerCase() == dummyTerm.toLowerCase()) { // Some sites capitalize queries
			storeInDatabase('searchParams', getKeyFromUrl(url), key, false, () => {
				chrome.history.deleteUrl({
					url: url
				}, callback);
			});
			
			break;
		}
	}
}