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

// Start with loading the data.json file.
fetch(dataPath).then(response => response.json()).then(json => {
	// Save json content in variable to make it accessible elsewhere.
	data = json;

	// For usability: Makes sure that the window state does not get changed by this extension.
	if (!debug)
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