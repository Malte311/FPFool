/**
 * @module content script - setup
 */
'use strict';

/**
 * Holds the path to the data.json file.
 */
const dataPath = chrome.runtime.getURL('data/data.json');

/**
 * Saves the content of the data.json file.
 */
var data;

$(document).ready(() => {
	fetch(dataPath).then(response => response.json()).then(json => {
		// Save json content in variable to make it accessible elsewhere
		data = json;

		// Tell the background script when window is resized
		addResizeEventListener();
		
		chrome.runtime.sendMessage({
			type: 'getInfo',
			infoType: 'type',
			url: location.href
		}, response => {
			determineAction(response);
		});
	});
});

/**
 * Determines which action should be performed on the current site.
 * 
 * @param {Object} response Response from background script which contains the type of this tab.
 */
function determineAction(response) {
	if (response.disconnect) {
		if (response.type == 'getUrlParam') { // Searched for URL params, no real visit
			setTimeout(disconnect, Math.floor(1000 * Math.random() + 300)); // Exit fast (~ 1sec)
		} else {
			setTimeout(disconnect, Math.floor(10000 * Math.random() + 10000)); // 10-20 seconds
		}
		return;
	}

	switch (response.type) {
		case 'execAlgo':
			updateStatus(location.href, 'OPEN', '&ndash;', '&ndash;');
			execAlgorithm();
			break;
		case 'getUrlParam':
			updateStatus(location.href, 'GETPARAM', '&ndash;', '&ndash;');
			getUrlParams();
			break;
		default:
			return; // Only take action in tabs created by this extension.
	}
}

/**
 * Executes the camouflage algorithm.
 */
function execAlgorithm() {
	// If there will be more than one algorithms one day, we can determine the correct one in here
	searchPage(Math.floor(1000 * Math.random() + 2000)); // 1-3 seconds to type in a search term
}