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
			url: location.href
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
			if (response.execAlgo) { // Only execute once
				updateStatus(location.href, 'OPEN', '&ndash;', '&ndash;');
				execAlgorithm();
			}
			break;
		case 'getUrlParam':
			if (response.getUrlParam) {
				getUrlParams();
			}
			break;
		default:
			return; // Only take action in tabs created by this extension.
	}
}

function execAlgorithm() {
	searchPage(weightedRandom(8000, 1000));
}

/**
 * Closes the current tab.
 * 
 * @param {bool} isSpecial Describes if this tab is a fake connection or has another (special)
 * purpose.
 */
function disconnect(isSpecial = false) {
	chrome.runtime.sendMessage({
		type: 'disconnect'
	}, response => {
		if (!isSpecial) {
			updateStatus(location.href, 'REMOVE', '&ndash;', '&ndash;');
		}
	});
}

/**
 * Tries to find input fields on the current webpage and simulates a user typing in things in
 * these input fields.
 * 
 * @param {number} delay The delay before searching in milliseconds.
 */
function searchPage(delay) {
	chrome.runtime.sendMessage({
		type: 'getSearchTerm',
		url: new URL(location.href).hostname
	}, resp => {
		var inputField = getSearchInputField();
		// Make sure that 1. a search field exists and 2. a search term is available.
		if (inputField != null && resp.searchTerm != ' ') {
			setTimeout(() => {
				$(inputField).val(resp.searchTerm);
				var url = location.href.indexOf('?') > 0 ? location.href + '&' : location.href + '?';
				updateStatus(
					location.href,
					'SEARCH',
					resp.searchTerm,
					`${url}${resp.searchParam}=${encodeURIComponent(resp.searchTerm)}`
				);

				$(inputField).closest('form').submit();
			}, delay);
		} else {
			updateStatus(location.href, 'SEARCHFAIL', resp.searchTerm, '&ndash;');
			setTimeout(disconnect, delay);
		}
	});
}

/**
 * Gets the url parameters from the current url.
 */
function getUrlParams() {
	if (response.isSpecial && response.disconnect != undefined) {
		disconnect(true);
	} else if (response.isSpecial && response.disconnect == undefined) {
		getUrlParams();
	}

	var dummySearchTerm = randomString(16);
	var inputField = getSearchInputField();

	chrome.runtime.sendMessage({
		type: 'sendInfo',
		infoType: 'urlParams',
		dummySearchTerm: inputField != null ? dummySearchTerm : ''
	}, response => {
		if (inputField != null) {
			$(inputField).val(dummySearchTerm);
			$(inputField).closest('form').submit();
		} else {
			disconnect(true);
		}
	});
}

/**
 * Searches for an input field on the current page such that we can search the page.
 */
function getSearchInputField() {
	var inputField = $(':input[type=search]').first() || $(':input[type=text]').first();
	var form = $(inputField).closest('form');

	// Make sure that we don't fill our a login form or something similar.
	// We only want to use search fields. (Note that this approach may not always work perfectly)
	var isSearchField =
		form.find(':input[type=search]').length == 1 ||
		form.find(':input[type=text]').length == 1;

	isSearchField = isSearchField &&
		form.find(':input[type=email]').length == 0 &&
		form.find(':input[type=password]').length == 0;

	if (inputField.length > 0 && isSearchField) {
		return inputField;
	}

	return null;
}

/**
 * Tells the background script whenever the window is resized.
 */
function addResizeEventListener() {
	window.addEventListener('resize', event => {
		chrome.runtime.sendMessage({
			type: 'resize'
		}, response => {});
	});
}