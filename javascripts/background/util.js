'use strict';

/**
 * Turns an url into a key for our database. The key is simply the hostname of that url.
 * @param {string} url The url of which we want to get a key.
 */
function getKeyFromUrl(url) {
	var key = url.startsWith('http') ? new URL(url).hostname : new URL('http://' + url).hostname;
	return key.startsWith('www.') ? key : 'www.' + key;
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
};