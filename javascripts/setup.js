'use strict';

/*
 * Specifies if application should be run in debug mode.
 */
const debug = true;

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
 * Keeps track of the tabs which are currently open to create fake connections.
 */
var currentTabs = [];

/*
 * Waits for messages from content scripts. Answers these messages appropriately:
 *
 * request.type == 'isFake'
 * The content script is asking if the tab it is running in is a fake connection.
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	var response = {};
	switch (request.type) {
		case 'isFake':
			response.type = currentTabs.filter(t => t.id == sender.tab.id).length > 0;
			break;
	}

	sendResponse(response);
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

/*
 * In debug mode, the extension is being reloaded quite often. In order to prevent opening
 * more and more windows, we close windows which have been created before reloading.
 */
if (debug) {
	chrome.storage.sync.get(['activeWinId'], function (result) {
		chrome.windows.remove(result.activeWinId);
	});
}

/*
 * Creates the window for this extension to work in. It also updates the value of the variable
 * windowId, so we can access the window at any time.
 */
chrome.windows.create({
	focused: debug ? true : false,
	setSelfAsOpener: true,
	width: debug ? 1200 : 1,
	height: debug ? 800 : 1,
	url: chrome.runtime.getURL("./html/workingPage.html")
}, function (window) {
	// Setting the state to 'minimized' in the create options seems not to work, so we update
	// it instantly after the window has been created.
	chrome.windows.update(window.id, {
		state: debug ? 'normal' : 'minimized'
	});
	windowId = window.id;

	// Save the active id, so we can close the window on reload.
	chrome.storage.sync.set({
		activeWinId: windowId
	});

	runApplication();
});