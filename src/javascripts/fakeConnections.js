'use strict';

/**
 * Creates fake connections to distort the user's browser behavior.
 * @param {HistoryItem} historyItems The HistoryItem array containing the browser history.
 */
function fakeConnections(historyItems) {
	//historyItems = filterUrls(historyItems);
	var map = new Map();
	for (var i = 0; i < historyItems.length; i++) {
		map.set(historyItems[i].url, historyItems[i].visitCount);
	}

	var maxCount = Math.max(...map.values());
	map.forEach(function (value, key) {
		if (value == maxCount) {
			connectToUrl(key);
			map.delete(key);
		} else {

			map.set(key, value + 1);
		}
	});
}

/**
 * Truncates urls in order to avoid saving an url multiple times.
 * @param {HistoryItem} historyItems The HistoryItem array containing the browser history.
 */
function filterUrls(historyItems) {
	var filteredItems = [];
	for (var i = 0; i < historyItems.length; i++) {
		if ((historyItems[i].url.match(new RegExp('/', 'g')) || []).length <= 3 &&
			historyItems[i].url.charAt(historyItems[i].url.length - 1) == '/') {
			filteredItems.push(historyItems[i]);
		}
	}

	return filteredItems;
}

/**
 * Creates a fake connection to a given url.
 * 
 * A http request is sent to the url such that the url thinks that the user visited it.
 * Afterwards, the url is added to the browser history since it was visited just now.
 * 
 * @param {string} url The url we want to connect to.
 */
function connectToUrl(url) {
	// var http = new XMLHttpRequest();
	// http.open('GET', url, true);
	// http.send();
	// http.onreadystatechange = function (err) {
	// 	if (this.readyState == 4 && this.status == 200) {
	// 		console.log(http.responseText);
	// 	}
	// }

	// chrome.history.addUrl({
	// 	url: url
	// });

	chrome.windows.create({
		url: url,
		width: 0,
		height: 0,
		focused: false,
		setSelfAsOpener: true
	});
}