/**
 * @module content script - search
 */
'use strict';

/**
 * Gets the url parameters from the current url.
 */
function getUrlParams() {
	var dummySearchTerm = randomString(16);
	var inputField = getSearchInputField();

	chrome.runtime.sendMessage({
		type: 'sendInfo',
		infoType: 'urlParams',
		url: location.href,
		dummySearchTerm: inputField != null ? dummySearchTerm : ''
	}, response => {
		if (inputField != null) {
			$(inputField).val(dummySearchTerm);
			$(inputField).closest('form').submit();
		} else {
			location.reload();
		}
	});
}

/**
 * Searches for an input field on the current page such that we can search the page.
 */
function getSearchInputField() {
	var searchFields = $(':input[type=search]');
	var inputField = searchFields.length > 0 ? searchFields.first() : $(':input[type=text]').first();
	var form = $(inputField).closest('form');

	// Make sure that we don't fill our a login form or something similar.
	// We only want to use search fields. (Note that this approach may not always work perfectly)
	var isSearchField = form.find(':input[type=search]').length == 1 ||
						form.find(':input[type=text]').length == 1;

	isSearchField = isSearchField && form.find(':input[type=email]').length == 0
								  && form.find(':input[type=password]').length == 0;

	if (inputField.length > 0 && isSearchField) {
		return inputField;
	}

	return null;
}

/**
 * Tries to find input fields on the current webpage and simulates a user typing in things in
 * these input fields.
 * 
 * @param {number} delay The delay before searching in milliseconds.
 */
function searchPage(delay) {
	chrome.runtime.sendMessage({
		type: 'getInfo',
		infoType: 'searchTerm',
		url: new URL(location.href).hostname
	}, response => {
		var inputField = getSearchInputField();

		// Make sure that 1. a search field exists and 2. a search term is available.
		if (inputField != null && response.searchTerm != '') {
			setTimeout(() => {
				$(inputField).val(response.searchTerm);
				
				var url = location.href.indexOf('?') > 0 ? location.href + '&' : location.href + '?';
				updateStatus(
					location.href,
					'SEARCH',
					response.searchTerm,
					`${url}${response.searchParam}=${encodeURIComponent(response.searchTerm)}`
				);

				$(inputField).closest('form').submit();
			}, delay);
		} else {
			updateStatus(location.href, 'SEARCHFAIL', response.searchTerm, '&ndash;');
			setTimeout(disconnect, delay);
		}
	});
}