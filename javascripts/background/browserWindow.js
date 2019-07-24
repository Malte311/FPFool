/**
 * Creates the hidden window and starts the application. It also updates the value of the variable
 * windowId, so we can access the window at any time. Note: This function gets only called,
 * if condition 'indexedDB' in window is true. This means that this extension needs indexedDB
 * in order to run.
 */
function createWindow() {
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

			addListenerOnClose();

			initAndRun();
		});
	});
}

/**
 * Opens the extension options page whenever the user clicks on the extension icon.
 */
function addBrowserAction() {
	chrome.browserAction.onClicked.addListener(() => {
		chrome.tabs.create({
			url: chrome.runtime.getURL("./html/extensionPage.html")
		});
	});
}

/**
 * Adds listener to the window which execute when the window gets closed.
 */
function addListenerOnClose() {
	chrome.windows.onRemoved.addListener(winId => {
		chrome.windows.getAll(windows => {
			// Close the extension if it is the only window left and save statistics
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
}

/**
 * Prepares the database (getSearchTerms); afterwards runs the application.
 * The database is only updated every hour.
 */
function initAndRun() {
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
}