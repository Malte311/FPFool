'use strict';

/**
 * Tells the background script whenever the window is resized.
 */
function addResizeEventListener() {
	window.addEventListener('resize', event => {
		chrome.runtime.sendMessage({
			type: 'sendInfo',
			infoType: 'resize'
		}, response => {});
	});
}

/**
 * Closes the current tab.
 */
function disconnect() {
	chrome.runtime.sendMessage({
		type: 'sendInfo',
		infoType: 'disconnect'
	}, response => {
		updateStatus(location.href, 'REMOVE', '&ndash;', '&ndash;');
	});
}