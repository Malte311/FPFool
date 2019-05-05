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
 * request.type == 'disconnect'
 * The content script wants the corresponding tab to be removed.
 * 
 * request.type == 'isExec'
 * The content script wants to know if it should get executed. This is the case if the content
 * script is running in a tab created by this extension and the content script was not executed
 * before.
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	var response = {};
	switch (request.type) {
		case 'disconnect':
			chrome.tabs.remove(sender.tab.id);
			// TODO remove tab from storage and variable; remove visited sites from history
			// (maybe do not remove from history for history algorithm => save the algorithm 
			// for each tab?)
			break;
		case 'isExec':
			var senderTab = currentTabs.filter(tab => tab.id == sender.tab.id);
			response.isExec = senderTab.length > 0 && senderTab[0].isNew;
			senderTab[0].isNew = false;
			break;
		default:
			return; // Don't answer unknown messages
	}

	sendResponse(response);
});

/*
 * Removes the window created by this extension whenever the user exits the browser.
 * In addition to that, we remove items from the storage which we don't need any longer.
 */
chrome.runtime.onSuspend.addListener(function () {
	chrome.windows.remove(windowId);
	chrome.storage.sync.remove(['activeWinId', 'activeTabs']); // After suspend, nothing is active
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