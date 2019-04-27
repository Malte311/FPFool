'use strict';

/*
 * Milliseconds to subtract from the current time in order to get the start time for the browser
 * history. The default value is set to the last 3 days and the user can change the value at any
 * time.
 */
var interval = 1000 * 60 * 60 * 24 * 3;

/*
 * Saves the id of a minimized extra window in which the extension creates fake connections. This
 * extra window is minimized in order to not distract the user at his work.
 */
var windowId;

/*
 * Creates the window for this extension to work in. It also updates the value of the variable
 * windowId, so we can access the window at any time.
 */
chrome.windows.create({
	focused: false,
	setSelfAsOpener: true,
	width: 1,
	height: 1,
	url: chrome.runtime.getURL("./html/workingPage.html")
}, function (window) {
	// Setting the state to 'minimized' in the create options seems not to work, so we update
	// it instantly after the window has been created.
	chrome.windows.update(window.id, {
		state: 'minimized'
	});
	windowId = window.id;
});

/*
 * Loads the users settings, if present. Otherwise, the default settings are used and saved.
 */
chrome.storage.sync.get(['interval'], function (result) {
	if (result.interval != undefined) {
		interval = result.interval;
	} else {
		chrome.storage.sync.set({
			'interval': interval
		});
	}
});

/*
 * Removes the window created by this extension whenever the user exits the browser.
 */
chrome.runtime.onSuspend.addListener(function () {
	chrome.windows.remove(windowId);
});

/*
 * Opens the extension options page whenever the user clicks on the extension icon.
 */
chrome.browserAction.onClicked.addListener(function () {
	chrome.tabs.create({
		url: chrome.runtime.getURL("./html/extensionPage.html")
	});
});

runApplication();