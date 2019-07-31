/**
 * @module background script - message
 */
'use strict';

/**
 * Waits for messages from content scripts and answers these messages appropriately.
 */
function addMessageListener() {
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		switch (request.type) {
			// Content script wants to get information from the background script.
			case 'getInfo':
				handleGetInfo(request, sender, sendResponse);
				break;
			// Content script wants to send information to the background script.
			case 'sendInfo':
				handleSendInfo(request, sender, sendResponse);
				break;
			default:
				return; // Don't answer unknown messages
		}

		return true; // Keep message channel open until response sent (happens inside of case)
	});
}

/**
 * Sends the requested information to a content script.
 * 
 * @param {Object} request The message which was received.
 * @param {Object} sender The sender of the received message.
 * @param {function} sendResponse Callback function to send a response.
 */
function handleGetInfo(request, sender, sendResponse) {
	switch (request.infoType) {
		case 'searchTerm':
			answerSearchTerm(request, sender, sendResponse);
			break;
		case 'type':
			answerType(request, sender, sendResponse);
			break;
	}
}

/**
 * Sends a search term to the requesting content script.
 * 
 * @param {Object} request The message which was received.
 * @param {Object} sender The sender of the received message.
 * @param {function} sendResponse Callback function to send a response.
 */
function answerSearchTerm(request, sender, sendResponse) {
	getFromDatabase('searchTerms', getKeyFromUrl(request.url), result => {
		var term = '';
		if (result != undefined) {
			term = result.value[Math.floor(Math.random() * result.value.length)][0];
			getSuggestion(term, response => {
				sendResponse({
					searchTerm: response
				});
			});
		} else {
			sendResponse({
				searchTerm: ''
			});
		}
	});
}

/**
 * Tells the requesting content script which type of action it should perform.
 * 
 * @param {Object} request The message which was received.
 * @param {Object} sender The sender of the received message.
 * @param {function} sendResponse Callback function to send a response.
 */
function answerType(request, sender, sendResponse) {
	var response = {};

	var senderTab = specialTabs.find(tab => tab.id == sender.tab.id) ||
					currentTabs.find(tab => tab.id == sender.tab.id);
	
	if (senderTab != undefined) {
		response.disconnect = !senderTab.isNew; // Disconnect after action
		response.type = senderTab.type;
		senderTab.isNew = false;

		if (senderTab.dummySearchTerm != undefined) {
			saveSearchParam(request.url, senderTab.url, senderTab.dummySearchTerm, senderTab.callback);
		}
	}

	sendResponse(response);
}

/**
 * Receives the information sent by a content script and acts on it.
 * 
 * @param {Object} request The message which was received.
 * @param {Object} sender The sender of the received message.
 * @param {function} sendResponse Callback function to send a response.
 */
function handleSendInfo(request, sender, sendResponse) {
	switch (request.infoType) {
		case 'disconnect':
			answerDisconnect(request, sender, sendResponse);
			break;
		case 'resize':
			answerResize(request, sender, sendResponse);
			break;
		case 'urlParams':
			answerUrlParams(request, sender, sendResponse);
			break;
	}
}

/**
 * Removes the tab which requests a disconnect.
 * 
 * @param {Object} request The message which was received.
 * @param {Object} sender The sender of the received message.
 * @param {function} sendResponse Callback function to send a response.
 */
function answerDisconnect(request, sender, sendResponse) {
	chrome.tabs.remove(sender.tab.id, () => {
		var tabArray = currentTabs;

		if (!(currentTabs.findIndex(elem => elem.id == sender.tab.id) > 0)) {
			tabArray = specialTabs;
		}

		tabArray[tabArray.findIndex(elem => elem.id == sender.tab.id)] = {
			id: -1
		};
	});

	sendResponse({}); // Just to close message channel
}

/**
 * Saves the window state when a content script signals that the window has been resized.
 * 
 * @param {Object} request The message which was received.
 * @param {Object} sender The sender of the received message.
 * @param {function} sendResponse Callback function to send a response.
 */
function answerResize(request, sender, sendResponse) {
	setWindowState();
	sendResponse({}); // Just to close message channel
}

/**
 * Saves information about url search parameter for the requesting url.
 * 
 * @param {Object} request The message which was received.
 * @param {Object} sender The sender of the received message.
 * @param {function} sendResponse Callback function to send a response.
 */
function answerUrlParams(request, sender, sendResponse) {
	var senderTab = specialTabs.find(tab => tab.id == sender.tab.id);

	if (senderTab != undefined) {
		senderTab.url = request.url;
		senderTab.dummySearchTerm = request.dummySearchTerm;
	}
	
	sendResponse({}); // Just to close message channel
}