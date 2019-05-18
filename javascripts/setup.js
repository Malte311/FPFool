'use strict';

/*
 * Specifies if the application should be run in debug mode.
 */
const debug = true;

/*
 * Holds the path to the data.json file.
 */
const dataPath = '../data/data.json';

/*
 * Saves the content of the data.json file.
 */
var data;

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
 * Keeps track of third party websites which might be interesting to visit.
 */
var thirdParties = [];

// Start with loading the data.json file.
fetch(dataPath).then(response => response.json()).then(function (json) {
	// Save json content in variable to make it accessible elsewhere
	data = json;

	/*
	 * Keep track of third party requests, so we can visit these sites if we want to.
	 */
	chrome.webRequest.onBeforeRequest.addListener(function (det) {
			if (det.type != 'stylesheet' && det.initiator != undefined) {
				// We are only interested in third party sites, so we ignore first party requests.
				// (otherwise we would get way too many requests to consider)
				var startIndex = det.initiator.indexOf('.') + 1;
				var endIndex = det.initiator.indexOf(det.initiator.match(/\.[a-z]{2,3}($|\/)/)[0]);
				if (!det.url.includes(det.initiator.substring(startIndex, endIndex))) {
					// TODO
				}
			}
		}, {
			urls: ['http://*/*', 'https://*/*']
		},
		['requestBody']
	);

	/* 
	 * Create an array of fixed size such that push and splice are not neccessary anymore (they 
	 * both cause problems because there are multiple calls in parallel when adding or removing 
	 * tabs). Afterwards, we fill array with invalid ids, such that we are not accessing the id 
	 * of an undefined element.
	 */
	chrome.storage.sync.get([data.availableSettings.maxConnectCount], function (response) {
		currentTabs = new Array(parseInt(response[data.availableSettings.maxConnectCount]));
		currentTabs.fill({
			id: -1
		});
	});

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
			case data.availableMessageTypes.disconnect:
				chrome.tabs.remove(sender.tab.id, function () {
					currentTabs[currentTabs.findIndex(elem => elem.id == sender.tab.id)] = {
						id: -1
					};
				});
				break;
			case data.availableMessageTypes.getStatistics:
				response.clickedLinksCount = clickedLinksCount;
				response.keywordSearchCount = keywordSearchCount;
				response.visitedSitesCount = visitedSitesCount;
				break;
			case data.availableMessageTypes.incClickedLinksCount:
				clickedLinksCount++;
				break;
			case data.availableMessageTypes.incKeywordSearchCount:
				keywordSearchCount++;
				break;
			case data.availableMessageTypes.incVisitedSitesCount:
				visitedSitesCount++;
				break;
			case data.availableMessageTypes.isExec:
				var senderTab = currentTabs.find(tab => tab.id == sender.tab.id);
				response.isExec = senderTab != undefined && senderTab.isNew;
				if (senderTab != undefined) {
					response.algo = senderTab.algorithm; // Tells the tab which algorithm to execute
					response.disconnect = !senderTab.isNew; // Disconnect after redirect
					senderTab.isNew = false;
				}
				break;
			case data.availableMessageTypes.resetStatistics:
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
	 * Opens the extension options page whenever the user clicks on the extension icon.
	 */
	chrome.browserAction.onClicked.addListener(function () {
		chrome.tabs.create({
			url: chrome.runtime.getURL("./html/extensionPage.html")
		});
	});

	/*
	 * Creates the window for this extension to work in. It also updates the value of the variable
	 * windowId, so we can access the window at any time.
	 */
	chrome.windows.getCurrent(function (currWindow) {
		chrome.windows.create({
			focused: debug ? true : false,
			setSelfAsOpener: true,
			width: debug ? 1600 : currWindow.width,
			height: debug ? 1000 : currWindow.height,
			url: chrome.runtime.getURL("./html/workingPage.html")
		}, function (window) {
			// Setting the state to 'minimized' in the create options seems not to work, so we update
			// it instantly after the window has been created.
			chrome.windows.update(window.id, {
				state: debug ? 'normal' : 'minimized'
			});
			windowId = window.id;

			// Write statistics to storage when the window is closed.
			chrome.windows.onRemoved.addListener(function (winId) {
				chrome.windows.getAll(function (windows) {
					// Close the extension if it is the only window left
					if (windows.length == 1 && windowId == windows[0].id) {
						chrome.storage.sync.set({
							clickedLinksCount: clickedLinksCount,
							keywordSearchCount: keywordSearchCount,
							visitedSitesCount: visitedSitesCount
						}, function (res) {
							chrome.windows.remove(windowId);
						});
					}
				});
			});

			runApplication();
		});
	});
});