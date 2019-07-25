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
 * 
 * @param {bool} isSpecial Describes if this tab is a fake connection or has another purpose.
 */
function disconnect(isSpecial = false) {
	chrome.runtime.sendMessage({
		type: 'sendInfo',
		infoType: 'disconnect'
	}, response => {
		if (!isSpecial) {
			updateStatus(location.href, 'REMOVE', '&ndash;', '&ndash;');
		}
	});
}