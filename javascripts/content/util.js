'use strict';

/**
 * Updates the status table on the working page. For every action performed by this extension,
 * there will be added a new row containing the following information:
 * 
 * @param {string} url The url on which the action was performed.
 * @param {string} type The type of the action.
 * @param {string} searchTerm The term we searched in case the type was 'search'.
 * @param {string} toUrl The url to which we got directed (if we got directed at all).
 */
function updateStatus(url, type, searchTerm, toUrl) {
	chrome.runtime.sendMessage({
		url: url,
		type: type,
		searchTerm: searchTerm,
		toUrl: toUrl
	}, response => {});
}

/**
 * Generates a random string of a specified length.
 * 
 * @param {number} length The length of the random string.
 */
function randomString(length) {
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;

	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}

	return result;
}

/**
 * Return a weighted random number. The number can have a minimum value, if wanted.
 * 
 * @param {number} weight The number to multiply our random generated number with.
 * @param {number} minVal The minimum number to return, defaults to zero.
 */
function weightedRandom(weight, minVal = 0) {
	var retVal = Math.floor(Math.random() * weight);
	return retVal > minVal ? retVal : minVal;
}