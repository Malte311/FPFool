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

	updateStatus('https://google.de/', 'open');
});

/**
 * Navigates on the visited webpage. This means we navigate through it by simulating
 * klicks on links.
 * 
 * At the moment, these links are chosen randomly.
 */
function navigatePage() {
	var links = [];

	$('a').each(function () {
		links.push(this);
	});

	var randomVisit = links[Math.floor(Math.random() * links.length)];
	$(randomVisit)[0].click();
}

/**
 * Tries to find input fields on the current webpage and simulates a user typing in things in
 * these input fields.
 * 
 * The user input is currently chosen from a dictionary.
 */
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

/**
 * Updates the status table on the working page. For every action performed by this extension,
 * there will be added a new row containing the following information:
 * 
 * @param {string} url The url on which the action was performed.
 * @param {string} type The type of the action
 * @param {string} searchTerm 
 * @param {string} toUrl 
 */
function updateStatus(url, type, searchTerm, toUrl) {
	chrome.runtime.sendMessage({
		url: url,
		type: type,
		searchTeam: searchTerm,
		toUrl: toUrl
	});
}