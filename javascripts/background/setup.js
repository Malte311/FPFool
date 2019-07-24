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
 * Keeps track of the tabs which are currently open to create fake connections
 * (initialized in the runApplication() function before creating the first connection).
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
	// Save json content in variable to make it accessible elsewhere.
	data = json;

	// For usability: Makes sure that the window state does not get changed by this extension.
	handleWindowState();

	// Initializes the database and calls createWindow() when done.
	initDatabase(createWindow);

	// Listens to third party requests and adds matches to the queue.
	monitorThirdPartyRequests();

	// For communication between background and content script.
	addMessageListener();

	// For opening the extension page when the extension icon is clicked.
	addBrowserAction();
});