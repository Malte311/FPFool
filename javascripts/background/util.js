'use strict';

/**
 * Turns an url into a key for our database. The key is simply the hostname of that url.
 * 
 * @param {string} url The url of which we want to get a key.
 */
function getKeyFromUrl(url) {
	var key = url.startsWith('http') ? new URL(url).hostname : new URL('http://' + url).hostname;
	return key.startsWith('www.') ? key : 'www.' + key;
}

/**
 * Removes parameter from a given url such that we only have the url without parameter left.
 * 
 * @param {string} url The url from which we want to remove the parameter.
 */
function removeParamsFromUrl(url) {
	return url.indexOf('?') > 0 ? url.substring(0, url.indexOf('?')) : url;
}

/**
 * Shuffles a given array.
 * 
 * @param {Array} array The array we want to shuffle.
 * @return {Array} The shuffled array.
 */
function shuffleArray(array) {
	var currentIndex = array.length;
	var temporaryValue, randomIndex;

	while (currentIndex != 0) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

/**
 * Converts a number in days to a number in milliseconds.
 * 
 * @param {number} days The number of days which should get converted to milliseconds.
 */
function daysToMilliSeconds(days) {
	return days * 24 * 60 * 60 * 1000;
}