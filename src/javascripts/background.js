'use strict';

/*
 * Milliseconds to subtract from the current time in order to get the start time for the browser
 * history. The default value is set to the last 3 days.
 */
var interval = 1000 * 60 * 60 * 24 * 3;

chrome.runtime.onInstalled.addListener(function () {
	chrome.storage.sync.get(['interval'], function (result) {
		if (result != undefined) {
			interval = result;
		}
	});

	chrome.history.search({
			'text': '',
			'startTime': (new Date).getTime() - interval
		},
		function (historyItems) {
			fakeConnections(historyItems);
		}
	);
});

/*
 * Opens the extension options page when the user clicks on the extension icon.
 */
chrome.browserAction.onClicked.addListener(function () {
	chrome.tabs.create({
		url: chrome.runtime.getURL("page.html")
	});
});