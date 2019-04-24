'use strict';

function fakeConnections(historyItems) {
	historyItems = filterUrls(historyItems);
	var map = new Map();
	for (var i = 0; i < historyItems.length; i++) {
		map.set(historyItems[i].url, historyItems[i].visitCount);
	}

	var maxCount = Math.max(...map.values());
	map.forEach(function (value, key) {
		if (value == maxCount) {
			map.delete(key);
		} else {
			connectToUrl(key);
			map.set(key, value + 1);
		}
	});
}

/**
 * Truncates urls in order to avoid saving an url multiple times.
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

function connectToUrl(url) {
	
}