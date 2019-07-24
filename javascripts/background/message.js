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
 *Sends the requested information to a content script.
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

function answerSearchTerm(request, sender, sendResponse) {
	asyncCall = true;
	getFromDatabase('searchTerms', getKeyFromUrl(request.url), req => {
		response.searchTerm = req != undefined ?
			req.value[Math.floor(Math.random() * req.value.length)][0] :
			' ';

		if (response.searchTerm != ' ') {
			getFromDatabase('searchParams', getKeyFromUrl(request.url), r => {

				response.searchParam = r != undefined ? r.value[0] : ' ';

				sendResponse(response);

			});
		} else {
			sendResponse(response);
		}

	});
}

function answerType(request, sender, sendResponse) {
	var response = {};

	var senderTab = specialTabs.find(tab => tab.id == sender.tab.id) ||
					currentTabs.find(tab => tab.id == sender.tab.id);
	
	if (senderTab != undefined) {
		response.disconnect = !senderTab.isNew; // Disconnect after action
		response.type = senderTab.type;
		response.execAction = senderTab.isNew;
		senderTab.isNew = false;
	}


	if (senderTab != undefined && senderTab.getUrlParam && senderTab.dummySearchTerm != undefined) {
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

	sendResponse(response);
}

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
}

function answerResize(request, sender, sendResponse) {
	setWindowState();
	sendResponse({}); // Just to close message channel
}

function answerUrlParams(request, sender, sendResponse) {
	var senderTab = specialTabs.find(tab => tab.id == sender.tab.id);
	senderTab.dummySearchTerm = request.dummySearchTerm;
	if (request.dummySearchTerm == '') { // Not searchable
		// This url is done, so resolve it. Mark it as non-searchable as well.
		storeInDatabase('searchParams', getKeyFromUrl(senderTab.originUrl), '', false, () => {
			senderTab.resolve();
		});
	}
}