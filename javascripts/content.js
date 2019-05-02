'use strict';

/*
 * Dictionary of words to search for.
 */
const dict = ["JavaScript", "HTML", "CSS"];

/*
 * Executes this content script when the webpage has loaded.
 */
$(document).ready(function () {
	// Asking the background script if the tab in which this content script is running is a fake
	// connection or not.
	chrome.runtime.sendMessage({
		type: 'isFake'
	}, function (response) {
		// Only run this script for tabs created by this extension.
		if (response.type) {
			// TODO
		}
	});
});

function navigatePage() {
	var links = [];

	$('a').each(function () {
		links.push(this);
	});

	var randomVisit = links[Math.floor(Math.random() * links.length)];
	$(randomVisit)[0].click();
}

function searchPage() {
	var inputs = [];
	$(':input[type=text]').each(function () {
		inputs.push(this);
	});

	var randomInput = inputs[0];
	$(randomInput).val(dict[Math.floor(Math.random() * dict.length)]);
	setTimeout(function () {
		$(randomInput).closest('form').submit();
	}, 1666);
}