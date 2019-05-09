'use strict';

/*
 * Specifies if the application should be run in debug mode.
 */
const debug = true;

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
 * The content script wants the corresponding tab to be removed. The tab gets removed and the
 * content script gets a notification about it.
 * 
 * request.type == 'getStatistics'
 * Returns all variables holding statistical information (e.g. total amount of visited sites).
 * 
 * request.type == 'inc...'
 * Increments the value of the specified variable.
 * 
 * request.type == 'isExec'
 * The content script wants to know if it should get executed. This is the case if the content
 * script is running in a tab created by this extension and the content script was not executed
 * before.
 * 
 * request.type == 'resetStatistics'
 * Resets all variables holding statistical information.
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	var response = {};
	switch (request.type) {
		case 'disconnect':
			chrome.tabs.remove(sender.tab.id);
			for (var i = currentTabs.length - 1; i >= 0; i--) {
				if (currentTabs[i].id == sender.tab.id) {
					currentTabs.splice(i);
					break;
				}
			}
			break;
		case 'getStatistics':
			response.clickedLinksCount = clickedLinksCount;
			response.keywordSearchCount = keywordSearchCount;
			response.visitedSitesCount = visitedSitesCount;
			break;
		case 'incClickedLinksCount':
			clickedLinksCount++;
			break;
		case 'incKeywordSearchCount':
			keywordSearchCount++;
			break;
		case 'incVisitedSitesCount':
			visitedSitesCount++;
			break;
		case 'isExec':
			var senderTab = currentTabs.filter(tab => tab.id == sender.tab.id);
			response.isExec = senderTab.length > 0 && senderTab[0].isNew;
			senderTab[0].isNew = false;
			break;
		case 'resetStatistics':
			clickedLinksCount = keywordSearchCount = visitedSitesCount = 0;
			chrome.storage.sync.set({
				visitedSitesCount: visitedSitesCount,
				clickedLinksCount: clickedLinksCount,
				keywordSearchCount: keywordSearchCount
			});
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
	chrome.storage.sync.remove(['activeWinId']); // After suspend, nothing is active
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
	width: debug ? 1600 : 1,
	height: debug ? 1000 : 1,
	url: chrome.runtime.getURL("./html/workingPage.html")
}, function (window) {
	// Setting the state to 'minimized' in the create options seems not to work, so we update
	// it instantly after the window has been created.
	chrome.windows.update(window.id, {
		state: debug ? 'normal' : 'minimized'
	});
	windowId = window.id;

	// Save the active id, so we can close the window on reload (for debug mode).
	chrome.storage.sync.set({
		activeWinId: windowId
	});

	// Write statistics to storage when the window is closed.
	chrome.windows.onRemoved.addListener(function (winId) {
		if (windowId == winId) {
			chrome.storage.sync.set({
				clickedLinksCount: clickedLinksCount,
				keywordSearchCount: keywordSearchCount,
				visitedSitesCount: visitedSitesCount
			});
		}
	});

	runApplication();
});