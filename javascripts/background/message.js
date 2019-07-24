/**
 * Waits for messages from content scripts and answers these messages appropriately.
 */
function addMessageListener() {
	/*
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
				handleDisconnect(sender);
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
}

/**
 * The content script wants the corresponding tab to be removed. The tab gets removed and the
 * content script gets a notification about it.
 * @param {*} sender 
 */
function handleDisconnect(sender) {
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