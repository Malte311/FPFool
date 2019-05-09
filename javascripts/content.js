'use strict';

/*
 * Dictionary of words to search for.
 */
const dict = ["JavaScript", "HTML", "CSS"];

/*
 * Executes this content script when the webpage has loaded. This script performs fake actions
 * on faked connections according to a given algorithm.
 */
$(document).ready(function () {
	chrome.runtime.sendMessage({
		type: 'isExec'
	}, function (response) {
		// Only run this script for tabs created by this extension.
		if (response.isExec) {
			updateStatus(location.href, 'OPEN', '&ndash;', '&ndash;');
			updateStatistics('visitedSitesCount');

			// TODO: Instead of random, we use another message 'getAlgorithm' and perform actions
			// based on the algorithm; maybe even store the algorithm in a variable (before isExec)
			if (Math.random() < 0.5) {
				navigatePage();
			} else {
				searchPage();
			}
		}
	});
});

/**
 * Closes the current tab.
 */
function disconnect() {
	chrome.runtime.sendMessage({
		type: 'disconnect'
	}, function (response) {
		updateStatus(location.href, 'REMOVE', '&ndash;', '&ndash;');
	});
}

/**
 * Navigates on the visited webpage. This means we navigate through it by simulating
 * klicks on links.
 * 
 * The links are chosen based on the given algorithm.
 */
function navigatePage() {
	var links = [];

	$('a').each(function () {
		links.push(this);
	});

	var randomVisit = links[Math.floor(Math.random() * links.length)];
	setTimeout(function () {
		updateStatus(location.href, 'NAVIGATE', '&ndash;', randomVisit.href);
		updateStatistics('clickedLinksCount');
		updateStatistics('visitedSitesCount');

		$(randomVisit)[0].click();

		setTimeout(function () {
			disconnect();
		}, Math.floor(Math.random() * 1000));
	}, 1666);
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
	var searchTerm = dict[Math.floor(Math.random() * dict.length)];
	$(randomInput).val(searchTerm);
	var action = $(randomInput).closest('form').attr('action');
	setTimeout(function () {
		updateStatus(location.href, 'SEARCH', searchTerm, location.href + action.substring(1));
		updateStatistics('keywordSearchCount');
		updateStatistics('visitedSitesCount');

		$(randomInput).closest('form').submit();

		setTimeout(function () {
			disconnect();
		}, Math.floor(Math.random() * 1000));
	}, 1666);
}

/**
 * Updates the statistics (number of visited sites, number of clicked links and so on).
 * 
 * @param {string} property The property which should be updated.
 */
function updateStatistics(property) {
	chrome.runtime.sendMessage({
		type: 'inc' + property.charAt(0).toUpperCase() + property.substring(1)
	}, function (response) {});
}

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
	}, function (response) {});
}