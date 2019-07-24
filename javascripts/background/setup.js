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

// Start with loading the data.json file.
fetch(dataPath).then(response => response.json()).then(json => {
	// Save json content in variable to make it accessible elsewhere
	data = json;

	// For usability: Makes sure that the window state does not get changed by this extension.
	handleWindowState();

	// Initializes the database and calls createWindow() when done.
	initDatabase(createWindow);

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

	addMessageListener(); // For communication between background and content script

	addBrowserAction(); // For opening the extension page when the extension icon is clicked
});