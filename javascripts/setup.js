'use strict';

/*
 * Specifies if the application should be run in debug mode.
 */
const debug = false;

/*
 * Holds the path to the data.json file.
 */
const dataPath = '../data/data.json';

/*
 * Saves the content of the data.json file.
 */
var data;

/*
 * Holds the indexedDB database.
 */
var database;

/*
 * Saves the id of a minimized extra window in which the extension creates fake connections. This
 * extra window is minimized in order to not distract the user at his work.
 */
var windowId;

/*
 * Keeps track of the tabs which are currently open to create fake connections.
 * (initialized in the runApplication() function before creating the first connection)
 */
var currentTabs = [];

/*
 * Keeps track of third party websites which might be interesting to visit.
 */
var thirdParties = new Map();

/*
 * Keeps track of the websites we want to visit next.
 */
var queue = [];

/*
 * Loads the saved window state to restore it.
 */
chrome.storage.sync.get('windowState', function (result) {
	if (result != undefined) {
		chrome.windows.getCurrent(function (currWindow) {
			chrome.windows.update(currWindow.id, {
				state: result.windowState.state,
				width: result.windowState.width,
				height: result.windowState.height
			});
		});
	}
});

// Start with loading the data.json file.
fetch(dataPath).then(response => response.json()).then(function (json) {
	// Save json content in variable to make it accessible elsewhere
	data = json;

	/*
	 * Saves the window state of the users' window. We do this in order to restore this state on
	 * restart, because otherwise the window would adapt the state of the hidden window (which
	 * is not very user-friendly). State gets updated anytime the window changes its state.
	 */
	chrome.runtime.onInstalled.addListener(function () {
		chrome.windows.getCurrent(function (currWindow) {
			chrome.storage.sync.set({
				windowState: {
					state: currWindow.state,
					width: currWindow.width,
					height: currWindow.height
				}
			});
		});
	});

	/*
	 * Saves changes to the window state.
	 */
	chrome.tabs.onCreated.addListener(function (tab) {
		if (windowId != undefined && tab.windowId != windowId) { // Only consider real tabs
			chrome.windows.get(tab.windowId, function (currWindow) {
				chrome.storage.sync.set({
					windowState: {
						state: currWindow.state,
						width: currWindow.width,
						height: currWindow.height
					}
				});
			});
		}
	});

	/*
	 * Keep track of third party requests, so we can visit these sites if we want to.
	 */
	chrome.webRequest.onBeforeRequest.addListener(
		function (det) {
			const excludedTypes = ['stylesheet', 'image']; // Reduce unnecessary effort
			if (!excludedTypes.includes(det.type) && det.initiator != undefined) {
				// We are only interested in third party sites, so we ignore first party requests.
				// (otherwise we would get way too many requests to consider)
				var startInd = det.initiator.indexOf('.') + 1;
				var urlExtension = det.initiator.match(/\.[a-z]{2,3}($|\/)/);
				var endInd = urlExtension != null ? det.initiator.indexOf(urlExtension[0]) : -1;
				if (endInd > 0 && !det.url.includes(det.initiator.substring(startInd, endInd))) {
					var val = thirdParties.get(det.initiator);
					thirdParties.set(
						det.initiator,
						val != undefined ?
						(val.includes(det.url) ? val : val.concat([det.url])) : [det.url]
					);

					// Find other websites that use the same third party and are not added to the
					// queue yet
					for (const [key, val] of thirdParties) {
						if (!key.includes(det.initiator.substring(startInd, endInd)) &&
							val.includes(det.url) && !queue.includes(key)) {
							queue.push(key);
							// Restart loop if queue was empty before and maximum number of
							// connections is not reached yet.
							if (!(queue.length > 1) && todayConnectionCount < connectionLimit) {
								restartLoop(5000 * Math.random() + 10000); // 10 to 15 seconds
							}
						}
					}
				}
			}
		}, {
			urls: ['http://*/*', 'https://*/*']
		},
		['requestBody']
	);

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
	 * request.type == 'getSearchTerm'
	 * Searches for terms in our indexedDB database for the requesting url, then returns these
	 * terms (if found any, otherwise we return an empty string).
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
		var asyncCall = false; // For asynchronous responses
		switch (request.type) {
			case data.availableMessageTypes.disconnect:
				chrome.tabs.remove(sender.tab.id, function () {
					currentTabs[currentTabs.findIndex(elem => elem.id == sender.tab.id)] = {
						id: -1
					};
				});
				break;
			case data.availableMessageTypes.getSearchTerm:
				asyncCall = true;
				getFromDatabase('searchTerms', getNameFromUrl(request.url)).then(function (req) {
					req.onsuccess = function (event) {
						response.searchTerm = req.result != undefined ?
							req.result.terms[Math.floor(Math.random() * req.result.terms.length)][0] :
							' ';
						sendResponse(response);
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
			case data.availableMessageTypes.resize:
				chrome.windows.getCurrent(function (currWindow) {
					chrome.storage.sync.set({
						windowState: {
							state: currWindow.state,
							width: request.width,
							height: request.height
						}
					});
				});
				break;
			default:
				return; // Don't answer unknown messages
		}

		if (!asyncCall) {
			sendResponse(response);
		} else {
			return true; // Keep message channel open until response sent (happens inside of case)
		}
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
	 * Creates a database, if no database exists yet.
	 * We use the database for saving search terms.
	 * Database contains following tables:
	 * searchTerms:
	 * url | keywords
	 */
	if ('indexedDB' in window) {
		var requestDB = window.indexedDB.open('database', 4);

		requestDB.onsuccess = function (event) {
			database = requestDB.result;
		};

		requestDB.onupgradeneeded = function (event) {
			database = requestDB.result;
			if (!database.objectStoreNames.contains('searchTerms')) {
				database.createObjectStore('searchTerms', {
					keyPath: 'url'
				});
			}
		};
	}

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
							visitedSitesCount: visitedSitesCount,
							todayConnectionCount: todayConnectionCount
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