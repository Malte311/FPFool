'use strict';

/*
 * Holds the path to the data.json file.
 */
const dataPath = '../data/data.json';

/*
 * Saves the content of the data.json file.
 */
var data;

/*
 * Executes the script when the page has loaded. This script allows the user to customize the
 * extension as well as to take a look at some statistics.
 */
$(document).ready(function () {
	fetch(dataPath).then(response => response.json()).then(function (json) {
		// Save json content in variable to make it accessible elsewhere
		data = json;

		// Add onclick events to each tab
		$.each(data.availableTabs, function (key, value) {
			addClickEventToTab(value);
		});

		// Update statistics in real time
		chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
			if (request.type != undefined && request.type.startsWith('inc')) {
				loadStatistics(false);
			}
		});

		// On startup, the settings tab is active
		loadSettings();
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
			case data.availableTabs.SETTINGS:
				loadSettings();
				break;
			case data.availableTabs.STATISTICS:
				loadStatistics(true);
				break;
			default:
				return; // Unknown id
		}
	});
}

/**
 * Creates an info alert inside a given div. The alert disappears after some time.
 * 
 * @param {string} divId The id of the div to which we append the alert.
 * @param {string} text The text which should be displayed inside of the alert.
 */
function createInfoAlert(divId, text) {
	$(`#${divId}`).html(`
		<br>
		<div class="alert alert-info" role="alert">
			${text}			
		</div>
	`);

	setTimeout(function () {
		$(`#${divId}`).html(''); // Remove alert after a short time
	}, 5000);
}

/**
 * Creates a tooltip for a given text.
 * 
 * @param {string} text The text to which we want to add a tooltip.
 * @param {string} tooltip The tooltip on hovering over the text.
 * @return {string} The html string containing the text with its tooltip.
 */
function createTooltip(text, tooltip) {
	return `<span rel=\"tooltip\" title=\"${tooltip}\">${text}</span>`;
}

/**
 * Loads the content of the settings tab.
 */
function loadSettings() {
	chrome.storage.sync.get(Object.values(data.availableSettings), function (res) {
		$('#activeAlgorithm').text(res.activeAlgorithm != undefined ?
			res.activeAlgorithm :
			data.availableAlgorithms.DEFAULT
		);
		showAlgorithmExplanation(); // Displays what the algorithm does.

		$('#algorithmDropdown').html(''); // Clear before appending new things
		$.each(data.availableAlgorithms, function (key, value) {
			$('#algorithmDropdown').append(`
				<a class=\"dropdown-item\" id=\"${key}\" href=\"#\">${value}</a>
			`);
		});

		$('#algorithmDropdown').children().each(function () {
			$(this).click(function () {
				var key = $(this).attr('id');
				$('#activeAlgorithm').text(data.availableAlgorithms[key]);
				chrome.storage.sync.set({
					[data.availableSettings.activeAlgorithm]: data.availableAlgorithms[key]
				}, function (res) {
					showAlgorithmExplanation();
					createInfoAlert('infoDisplayDiv',
						'Algorithm changed successfully! The changes will take effect on restart.'
					);
				});
			});
		});

		$.each(data.availableSettings, function (key, value) {
			$(`#${value}Slider`).attr('value', res[value] != undefined ? res[value] : 1);
			$(`#${value}Slider`).val(res[value] != undefined ? res[value] : 1);
			$(`#${value}SliderVal`).text($(`#${value}Slider`).val());
			$(`#${value}Slider`).change(function () {
				chrome.storage.sync.set({
					[value]: $(`#${value}Slider`).val()
				}, function (res) {
					createInfoAlert('infoDisplayDiv',
						'Your changes have been saved! The changes will take effect on restart.'
					);
				});
			});
			$(`#${value}Slider`).on('input', function () {
				$(`#${value}SliderVal`).text($(`#${value}Slider`).val());
			});
		});

		$("[rel='tooltip'], .tooltip").tooltip(); // Adds tooltips
	});
}

/**
 * Loads the content of the statistics tab.
 * 
 * @param {bool} animate Specifies if the statistics should be animated or not.
 */
function loadStatistics(animate) {
	// Tells the content script to reset all variables and to save the new state in the storage.
	$('#resetBtn').click(function () {
		chrome.runtime.sendMessage({
			type: 'resetStatistics'
		}, function (response) {
			loadStatistics(false); // Reload statistics afterwards
		});
	});

	chrome.runtime.sendMessage({
		type: 'getStatistics'
	}, function (resp) {
		chrome.storage.sync.get(Object.values(data.availableStatistics), function (res) {
			// All time
			$.each(data.availableStatistics, function (key, value) {
				$(`#${value}`).html(resp[key] != undefined ? resp[value] : 0);
			});

			// Current session (idea: Subtract the number in the storage from the number in the
			// variable because the variable is kept up to date and we only write back to storage
			// when quitting the application)
			$.each(data.availableStatisticsTmp, function (key, value) {
				$(`#${value}`).html(
					(resp[key] != undefined ? parseInt(resp[value]) : 0) -
					(res[key] != undefined ? parseInt(res[value]) : 0)
				);
			});

			if (animate) {
				numberAnimation(); // Animate the statistical numbers
			}
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

/**
 * Diplays a brief information about the currently selected algorithm, so the user knows what
 * the algorithm does.
 */
function showAlgorithmExplanation() {
	chrome.storage.sync.get(data.availableSettings.activeAlgorithm, function (res) {
		switch (res.activeAlgorithm) {
			case data.availableAlgorithms.NAVIGATE:
				$('#algorithmSelectPara').html(`
					The navigation algorithm visits webpages and navigates on them, e.g.
					by clicking on links.
				`);
				break;
			case data.availableAlgorithms.SEARCH:
				$('#algorithmSelectPara').html(`
					The search algorithm visits webpages and searches for keywords on them.
				`);
				break;
			case data.availableAlgorithms.DEFAULT: // Same as default case
			default:
				$('#algorithmSelectPara').html(`
					The default algorithm simply visits webpages, but does not perform any 
					actions on them.
				`);
				break;
		}
	});
}