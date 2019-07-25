'use strict';

/*
 * Saves the id of a minimized extra window in which the extension creates fake connections. This
 * extra window is minimized in order to not distract the user at his work.
 */
var windowId;

/*
 * Keeps track of the tabs which are currently open to create fake connections.
 */
var currentTabs = [];

/*
 * Keeps track of the tabs which are used to find out search parameters.
 */
var specialTabs = [];

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

			// Initialize and run the application
			loadSettings(runApplication);
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
					todayCount: todayCount
				}, res => {
					chrome.windows.remove(windowId);
				});
			}
		});
	});
}