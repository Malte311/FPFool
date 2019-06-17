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
chrome.storage.sync.get('windowState', result => {
	if (result != undefined) {
		chrome.windows.getCurrent(currWindow => {
			chrome.windows.update(currWindow.id, {
				state: result.windowState.state,
				width: result.windowState.width,
				height: result.windowState.height
			});
		});
	}
});

// Start with loading the data.json file.
fetch(dataPath).then(response => response.json()).then(json => {
	// Save json content in variable to make it accessible elsewhere
	data = json;

	/*
	 * Saves the window state of the users' window. We do this in order to restore this state on
	 * restart, because otherwise the window would adapt the state of the hidden window (which
	 * is not very user-friendly). State gets updated anytime the window changes its state.
	 */
	chrome.runtime.onInstalled.addListener(() => {
		chrome.windows.getCurrent(currWindow => {
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
	chrome.tabs.onCreated.addListener(tab => {
		if (windowId != undefined && tab.windowId != windowId) { // Only consider real tabs
			chrome.windows.get(tab.windowId, currWindow => {
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
		det => {
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
	 * request.type == 'getSearchTerm'
	 * Searches for terms in our indexedDB database for the requesting url, then returns these
	 * terms (if found any, otherwise we return an empty string).
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
	 * request.type == 'isSpecial'
	 * Content script asks if it is special. Special means that it should not create fake
	 * connections but instead get search parameter to find our search terms for a given url.
	 * 
	 * request.type == 'resetStatistics'
	 * Resets all variables holding statistical information.
	 * 
	 * request.type == 'resize'
	 * Content script tells the background script whenever the user resizes the window such that
	 * we can save the window state for restoring it on startup.
	 * 
	 * request.type == 'urlParams'
	 * Content script tells the background script the search term used for finding out the url
	 * params. After this, the content script will redirect and send another 'isSpecial' message
	 * to tell the url after the redirection.
	 */
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		var response = {};
		var asyncCall = false; // For asynchronous responses
		switch (request.type) {
			case data.availableMessageTypes.disconnect:
				chrome.tabs.remove(sender.tab.id, () => {
					var tabArray = currentTabs;
					if (!(currentTabs.findIndex(elem => elem.id == sender.tab.id) > 0)) {
						tabArray = specialTabs;
					}
					tabArray[tabArray.findIndex(elem => elem.id == sender.tab.id)] = {
						id: -1
					};
				});
				break;
			case data.availableMessageTypes.getSearchTerm:
				asyncCall = true;
				getFromDatabase('searchTerms', getKeyFromUrl(request.url)).then(req => {
					req.onsuccess = event => {
						response.searchTerm = req.result != undefined ?
							req.result.terms[Math.floor(Math.random() * req.result.terms.length)][0] :
							' ';

						if (response.searchTerm != ' ') {
							getFromDatabase('searchParams', getKeyFromUrl(request.url)).then(r => {
								r.onsuccess = event => {
									response.searchParam = r.result != undefined ?
										r.result.terms[0] :
										' ';

									sendResponse(response);
								};
							});
						} else {
							sendResponse(response);
						}
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
			case data.availableMessageTypes.isSpecial:
				var senderTab = specialTabs.find(tab => tab.id == sender.tab.id);
				response.isSpecial = senderTab != undefined && senderTab.isSpecial;
				if (response.isSpecial && senderTab.dummySearchTerm != undefined) {
					response.disconnect = true;
					// resolve() is called in getUrlParams() if condition is true
					if (senderTab.dummySearchTerm != '') {
						setUrlParams(
							request.url,
							senderTab.dummySearchTerm,
							senderTab.visitTimes,
							senderTab.originUrl,
							senderTab.resolve
						);
					} else {
						senderTab.resolve();
					}
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
				chrome.windows.getCurrent(currWindow => {
					chrome.storage.sync.set({
						windowState: {
							state: currWindow.state,
							width: request.width,
							height: request.height
						}
					});
				});
				break;
			case data.availableMessageTypes.urlParams:
				var senderTab = specialTabs.find(tab => tab.id == sender.tab.id);
				senderTab.dummySearchTerm = request.dummySearchTerm;
				if (request.dummySearchTerm == '') { // Not searchable
					// This url is done, so resolve it. Mark it as non-searchable as well.
					storeInDatabase('searchParams', getKeyFromUrl(senderTab.originUrl), '', false, () => {
						senderTab.resolve();
					});
				}
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
	chrome.browserAction.onClicked.addListener(() => {
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
	 * 
	 * searchParams:
	 * url | params
	 */
	if ('indexedDB' in window) {
		var requestDB = window.indexedDB.open('database', 4);

		requestDB.onupgradeneeded = event => {
			database = requestDB.result;
			if (!database.objectStoreNames.contains('searchTerms')) {
				database.createObjectStore('searchTerms', {
					keyPath: 'url'
				});
			}

			if (!database.objectStoreNames.contains('searchParams')) {
				database.createObjectStore('searchParams', {
					keyPath: 'url'
				});
			}
		};

		requestDB.onsuccess = event => {
			database = requestDB.result;
			createWindow();
		};
	}
});

/**
 * Creates the hidden window and starts the application. Note: This function gets only called,
 * if condition 'indexedDB' in window is true. This means that this extension needs indexedDB
 * in order to run.
 */
function createWindow() {
	/*
	 * Creates the window for this extension to work in. It also updates the value of the variable
	 * windowId, so we can access the window at any time.
	 */
	chrome.windows.getCurrent(currWindow => {
		chrome.windows.create({
			focused: debug ? true : false,
			setSelfAsOpener: true,
			width: debug ? 1600 : currWindow.width,
			height: debug ? 1000 : currWindow.height,
			url: chrome.runtime.getURL("./html/workingPage.html")
		}, window => {
			// Setting the state to 'minimized' in the create options seems not to work, so we
			// update it instantly after the window has been created.
			chrome.windows.update(window.id, {
				state: debug ? 'normal' : 'minimized'
			});
			windowId = window.id;

			// Write statistics to storage when the window is closed.
			chrome.windows.onRemoved.addListener(winId => {
				chrome.windows.getAll(windows => {
					// Close the extension if it is the only window left
					if (windows.length == 1 && windowId == windows[0].id) {
						chrome.storage.sync.set({
							clickedLinksCount: clickedLinksCount,
							keywordSearchCount: keywordSearchCount,
							visitedSitesCount: visitedSitesCount,
							todayConnectionCount: todayConnectionCount
						}, res => {
							chrome.windows.remove(windowId);
						});
					}
				});
			});

			// Prepare the database (getSearchTerms); afterwards run the application.
			// Note: The database is only update every hour.
			chrome.storage.sync.get(['lastSearchTermsInit'], result => {
				if (result.lastSearchTermsInit == undefined ||
					result.lastSearchTermsInit <= (new Date).getTime() - 1000 * 60 * 60) {
					getSearchTerms().then(() => {
						chrome.storage.sync.set({
							lastSearchTermsInit: (new Date).getTime()
						});
						runApplication();
					});
				} else {
					runApplication();
				}
			});
		});
	});
}