'use strict';

/*
 * Dictionary of words to search for.
 */
const dict = ["JavaScript", "HTML", "CSS"];

/*
 * Executes this content script when the webpage has loaded.
 */
$(document).ready(function () {
	chrome.runtime.sendMessage({
		type: 'getTabId'
	}, function (response) {
		chrome.storage.sync.get(['activeTabs'], function (result) {
			var activeTabs = result.activeTabs;
			// Only run this script for tabs created by this extension.
			if (activeTabs.filter(tab => tab.id == response.tabId).length > 0) {
				var thisTab = activeTabs.filter(tab => tab.id == response.tabId)[0];

				// Just for displaying status information.
				if (thisTab.isNew) {
					updateStatus(location.href, 'open', '', '');

					var thisTabIndex = activeTabs.indexOf(thisTab);
					thisTab.isNew = false;
					activeTabs[thisTabIndex] = thisTab;
					chrome.storage.sync.set({
						activeTabs: activeTabs
					});

					if (Math.random() < 0.5) {
						navigatePage();
					} else {
						searchPage();
					}
				}
			}
		});
	});
});

/**
 * Closes the current tab.
 */
function disconnect() {
	chrome.runtime.sendMessage({
		type: 'disconnect'
	}, function (response) {
		updateStatus(location.href, 'remove', '', '');
	});
}

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
	setTimeout(function () {
		$(randomVisit)[0].click();
	}, 1666);

	updateStatus(location.href, 'navigate', '', randomVisit.href);

	setTimeout(function () {
		disconnect();
	}, Math.floor(Math.random() * 15000));
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
		$(randomInput).closest('form').submit();
	}, 1666);

	updateStatus(location.href, 'search', searchTerm, action);

	setTimeout(function () {
		disconnect();
	}, Math.floor(Math.random() * 15000));
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
	});
}