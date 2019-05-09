'use strict';

/*
 * Holds all available tabs on the page, so we can iterate over them (e.g. to add onclick events).
 */
const availableTabs = {
	SETTINGS: 'pills-settings-tab',
	STATISTICS: 'pills-statistics-tab'
};

/*
 * Executes the script when the page has loaded. This script allows the user to customize the
 * extension as well as to take a look at some statistics.
 */
$(document).ready(function () {
	// Add onclick events to each tab
	$.each(availableTabs, function (key, value) {
		addClickEventToTab(value);
	});
});

/**
 * Adds the onclick event to a given tab. We can not execute inline script code, so we are not 
 * able to set the onclick event directly in the html file.
 * 
 * @param {string} tabId The id of the tab to which we want to add an onclick event.
 */
function addClickEventToTab(tabId) {
	$(`#${tabId}`).click(function () {
		switch (tabId) {
			case availableTabs.SETTINGS:
				loadSettings();
				break;
			case availableTabs.STATISTICS:
				loadStatistics();
				break;
			default:
				return; // Unknown id
		}
	});
}

/**
 * Loads the content of the settings tab.
 */
function loadSettings() {

}

/**
 * Loads the content of the statistics tab.
 */
function loadStatistics() {
	var visitedSitesCount, clickedLinksCount, keywordSearchCount;
	chrome.runtime.sendMessage({
		type: 'getStatistics'
	}, function (resp) {
		visitedSitesCount = resp.visitedSitesCount != undefined ? resp.visitedSitesCount : 0;
		clickedLinksCount = resp.clickedLinksCount != undefined ? resp.clickedLinksCount : 0;
		keywordSearchCount = resp.keywordSearchCount != undefined ? resp.keywordSearchCount : 0;

		chrome.storage.sync.get([
			'visitedSitesCount', 'clickedLinksCount', 'keywordSearchCount'
		], function (res) {
			$('#visitedSitesCount').html(visitedSitesCount);
			$('#clickedLinksCount').html(clickedLinksCount);
			$('#keywordSearchCount').html(keywordSearchCount);

			$('#visitedSitesCountTmp').html(
				visitedSitesCount - (res.visitedSitesCount != undefined ? res.visitedSitesCount : 0)
			);
			$('#clickedLinksCountTmp').html(
				clickedLinksCount - (res.clickedLinksCount != undefined ? res.clickedLinksCount : 0)
			);
			$('#keywordSearchCountTmp').html(
				keywordSearchCount - (res.keywordSearchCount != undefined ? res.keywordSearchCount : 0)
			);

			numberAnimation(); // Animate the statistical numbers
		});
	});
}

/**
 * Creates an animation to display a number.
 */
function numberAnimation() {
	$('.count').each(function () {
		$(this).prop('Counter', 0).animate({
			Counter: $(this).text()
		}, {
			duration: 750,
			easing: 'swing',
			step: function (now) {
				$(this).text(Math.ceil(now));
			}
		});
	});
}