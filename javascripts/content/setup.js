'use strict';

/*
 * Holds the path to the data.json file.
 */
const dataPath = chrome.runtime.getURL('data/data.json');

/*
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
			url: new URL(location.href).hostname
		}, response => {
			determineAction(response);
		});
	});
});

/**
 * Determines which action should be performed on the current site.
 * 
 * @param {object} response Response from background script which contains the type of this tab.
 */
function determineAction(response) {
	if (response.disconnect) {
		setTimeout(disconnect, weightedRandom(5000, weightedRandom(1000)));
		return;
	}

	switch (response.type) {
		case 'execAlgo':
			updateStatus(location.href, 'OPEN', '&ndash;', '&ndash;');
			execAlgorithm();
			break;
		case 'getUrlParam':
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
	searchPage(weightedRandom(8000, 1000));
}