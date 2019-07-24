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
 * extension.
 */
$(document).ready(() => {
	fetch(dataPath).then(response => response.json()).then(json => {
		// Save json content in variable to make it accessible elsewhere
		data = json;

		// Add onclick events to each tab
		for (const tab of data.availableTabs) {
			addClickEventToTab(tab);
		}

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
			case 'pills-settings-tab':
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
	$(`#${divId}`).html(
		`<br>
		<div class="alert alert-info" role="alert">
			${text}			
		</div>`
	);

	setTimeout(() => {
		$(`#${divId}`).html(''); // Remove alert after a short time
	}, 5000);
}

/**
 * Loads the content of the settings tab.
 */
function loadSettings() {
	chrome.storage.sync.get(data.availableSettings, result => {
		for (const setting of data.availableSettings) {
			$(`#${setting}Slider`).val(result[setting] != undefined ? result[setting] : 1);
			$(`#${setting}Slider`).attr('value', result[setting] != undefined ? result[setting] : 1);
			$(`#${setting}SliderVal`).text($(`#${setting}Slider`).val());

			$(`#${setting}Slider`).change(() => {
				chrome.storage.sync.set({
					[setting]: $(`#${setting}Slider`).val()
				}, result => {
					createInfoAlert('infoDisplayDiv',
						'Your changes have been saved! The changes will take effect on restart.'
					);
				});
			});

			$(`#${setting}Slider`).on('input', () => {
				$(`#${setting}SliderVal`).text($(`#${setting}Slider`).val());
			});
		}
	});
}