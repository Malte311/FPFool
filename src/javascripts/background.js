'use strict';

/**
 * Starts the application: Creates fake connections in the hidden window and removes the tabs
 * when finished. Afterwards, the falsely added sites to the users browsing history are being
 * removed from the browser history again.
 */
function runApplication() {
	// Idea: Choose algorithm based on fingerprint (different algorithm for different devices)
	// Search interval was defined in the setup.js script.
	// chrome.history.search({
	// 		'text': '',
	// 		'startTime': (new Date).getTime() - interval
	// 	},
	// 	function (historyItems) {
	// 		//historyItems = filterUrls(historyItems);
	// 		var map = new Map();
	// 		for (var i = 0; i < historyItems.length; i++) {
	// 			map.set(historyItems[i].url, historyItems[i].visitCount);
	// 		}

	// 		var maxCount = Math.max(...map.values());
	// 		map.forEach(function (value, key) {
	// 			if (value == maxCount) {
	// 				connectToUrl(key);
	// 				map.delete(key);
	// 			} else {

	// 				map.set(key, value + 1);
	// 			}
	// 		});
	// 	}
	// );

	pageNavigation('https://google.de/');

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
	// Remember to remove fake connections from browsing history (it could confuse the user)


}

function pageNavigation(url) {
	var http = new XMLHttpRequest();
	http.open('GET', url, true);
	http.send();
	http.onreadystatechange = function (err) {
		if (this.readyState == 4 && this.status == 200) {
			$('a', http.responseText).each(function () {
				console.log(this.href);
			});
		}
	}
}