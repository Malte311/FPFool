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
$(document).ready(() => {
	fetch(dataPath).then(response => response.json()).then(json => {
		// Save json content in variable to make it accessible elsewhere
		data = json;

		// Add onclick events to each tab
		$.each(data.availableTabs, (key, value) => {
			addClickEventToTab(value);
		});

		// On startup, the settings tab is active (because it is the first one)
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
	$(`#${tabId}`).click(() => {
		switch (tabId) {
			case data.availableTabs.SETTINGS:
				loadSettings();
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

	setTimeout(() => {
		$(`#${divId}`).html(''); // Remove alert after a short time
	}, 5000);
}

/**
 * Loads the content of the settings tab.
 */
function loadSettings() {
	chrome.storage.sync.get(Object.values(data.availableSettings), res => {
		$('#activeAlgorithm').text(res.activeAlgorithm != undefined ?
			res.activeAlgorithm :
			data.availableAlgorithms.DEFAULT
		);
		showAlgorithmExplanation(); // Displays what the algorithm does.

		$('#algorithmDropdown').html(''); // Clear before appending new things
		$.each(data.availableAlgorithms, (key, value) => {
			$('#algorithmDropdown').append(`
				<a class=\"dropdown-item\" id=\"${key}\" href=\"#\">${value}</a>
			`);
		});

		$('#algorithmDropdown').children().each(() => {
			$(this).click(() => {
				var key = $(this).attr('id');
				$('#activeAlgorithm').text(data.availableAlgorithms[key]);
				chrome.storage.sync.set({
					[data.availableSettings.activeAlgorithm]: data.availableAlgorithms[key]
				}, res => {
					showAlgorithmExplanation();
					createInfoAlert('infoDisplayDiv',
						'Algorithm changed successfully! The changes will take effect on restart.'
					);
				});
			});
		});

		$.each(data.availableSettings, (key, value) => {
			$(`#${value}Slider`).val(res[value] != undefined ? res[value] : 1);
			$(`#${value}Slider`).attr('value', res[value] != undefined ? res[value] : 1);
			$(`#${value}SliderVal`).text($(`#${value}Slider`).val());
			$(`#${value}Slider`).change(() => {
				chrome.storage.sync.set({
					[value]: $(`#${value}Slider`).val()
				}, res => {
					createInfoAlert('infoDisplayDiv',
						'Your changes have been saved! The changes will take effect on restart.'
					);
				});
			});
			$(`#${value}Slider`).on('input', () => {
				$(`#${value}SliderVal`).text($(`#${value}Slider`).val());
			});
		});
	});
}


/**
 * Diplays a brief information about the currently selected algorithm, so the user knows what
 * the algorithm does.
 */
function showAlgorithmExplanation() {
	chrome.storage.sync.get(data.availableSettings.activeAlgorithm, res => {
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