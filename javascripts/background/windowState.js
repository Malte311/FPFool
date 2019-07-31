/**
 * @module background script - windowState
 */
'use strict';

/**
 * Makes sure that the window state is restored and monitored, such that the extension does not
 * change the original state of the users window.
 */
function handleWindowState() {
	restoreWindowState();
	initWindowState();
	monitorWindowStateChanges();
}

/**
 * Loads the saved window state to restore it.
 */
function restoreWindowState() {
	chrome.storage.sync.get('windowState', result => {
		if (result != undefined) {
			chrome.windows.getCurrent(currWindow => {
				chrome.windows.update(currWindow.id, {
					state: result.windowState.state,
					width: result.windowState.width,
					height: result.windowState.height
				});
			});
		}
	});
}

/**
 * Saves the window state of the users window. We do this in order to restore this state on
 * restart, because otherwise the window would adapt the state of the hidden window (which
 * is not very user-friendly). The state gets updated anytime the window changes its state.
 */
function initWindowState() {
	chrome.runtime.onInstalled.addListener(() => {
		setWindowState();
	});
}

/**
 * Sets the window state if the user changes it.
 */
function setWindowState() {
	chrome.windows.getCurrent(currWindow => {
		chrome.storage.sync.set({
			windowState: {
				state: currWindow.state,
				width: currWindow.width,
				height: currWindow.height
			}
		});
	});
}

/**
 * Saves changes to the window state.
 */
function monitorWindowStateChanges() {
	chrome.tabs.onCreated.addListener(tab => {
		if (windowId != undefined && tab.windowId != windowId) { // Only consider real tabs
			chrome.windows.get(tab.windowId, currWindow => {
				chrome.storage.sync.set({
					windowState: {
						state: currWindow.state,
						width: currWindow.width,
						height: currWindow.height
					}
				});
			});
		}
	});
}