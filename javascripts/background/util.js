/**
 * @module background script - util
 */
'use strict';

/**
 * Creates an asynchronous array loop, i.e., each iteration waits for the asynchronous call of
 * the last iteration before beginning.
 * 
 * @param {Object[]} arr The array we want to iterate over.
 * @param {function} loopFunction The function which does things with the element. Gets two params:
 * (item, callback) where item is the array element and callback is the callback function.
 * @param {function} [callback] Optional callback function, executed after the loop is done.
 * @param {number} ind Index for next element to process.
 */
function asyncArrLoop(arr, loopFunction, callback, ind) {
	if (!(arr.length > 0)) {
		typeof callback === 'function' && callback();
		return;
	}

	var inCallback = loopFunction; // To avoid name conflict
	loopFunction(arr[ind], () => {
		if (++ind < arr.length)
			asyncArrLoop(arr, inCallback, callback, ind);
		else {
			typeof callback === 'function' && callback();
		}
	});
}

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
 * Converts a number in days to a number in milliseconds.
 * 
 * @param {number} days The number of days which should get converted to milliseconds.
 */
function daysToMilliseconds(days) {
	return days * 24 * 60 * 60 * 1000;
}

/**
 * Checks if a given date object is today.
 * 
 * @param {Date} date The date object to check.
 */
function isToday(date) {
	var today = new Date();

	return date.getDate() == today.getDate()
		&& date.getMonth() == today.getMonth()
		&& date.getFullYear() == today.getFullYear();
}