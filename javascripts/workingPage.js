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
 * Executes the script when the page has loaded. This script logs the acitivities performed
 * by the extension.
 */
$(document).ready(function () {
	fetch(dataPath).then(response => response.json()).then(function (json) {
		// Save json content in variable to make it accessible elsewhere
		data = json;

		setDynamicTitle();
		addClickEventToTable('logTable'); // Necessary to make the table sortable

		// Waits for messages from content scripts. The content scripts will inform this script
		// whenever they perform an action, so we can update the status information.
		chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
			if (data.availableActionTypes.hasOwnProperty(request.type)) {
				var action;
				switch (request.type) {
					case data.availableActionTypes.OPEN:
						action = `Opened a new tab.`;
						break;
					case data.availableActionTypes.NAVIGATE:
						action = `Navigated to new url.`;
						break;
					case data.availableActionTypes.REMOVE:
						action = `Closed this tab.`;
						break;
					case data.availableActionTypes.SEARCH:
						action = `Searched for \"${request.searchTerm}\".`;
						break;
					default:
						action = 'Unknown action.';
						break;
				}

				appendTable(sender.tab.id, request.url, request.toUrl, action, request.type);
			}
		});
	});
});

/**
 * Adds the onclick event to a given table, so the table is sortable. We can not execute
 * inline script code, so we are not able to set the onclick event directly in the html
 * file.
 * 
 * @param {string} tableId The id of the table we want to make sortable.
 */
function addClickEventToTable(tableId) {
	$(`#${tableId} thead tr th`).each(function () {
		$(this).click(function () {
			sortTable($(this).attr('num'), tableId);
		});
	});
}

/**
 * Appends a new row to the status table. This row contains the following entries:
 * 
 * @param {number} tabId The id of the tab in which the event occured.
 * @param {string} urlFrom The url on which an event has happened.
 * @param {string} urlTo The url to which we got directed (if we got directed at all).
 * @param {string} action The description of the event.
 * @param {string} type The type of the event.
 */
function appendTable(tabId, urlFrom, urlTo, action, type) {
	var color;
	switch (type) {
		case data.availableActionTypes.OPEN:
			color = '<tr class=\"table-success\">'; // Green
			break;
		case data.availableActionTypes.NAVIGATE:
			color = '<tr class=\"table-info\">'; // Light blue
			break;
		case data.availableActionTypes.REMOVE:
			color = '<tr class=\"table-danger\">'; // Red
			break;
		case data.availableActionTypes.SEARCH:
			color = '<tr class=\"table-warning\">'; // Yellow
			break;
		default:
			color = '<tr class=\"table-active\">'; // Grey
			break;
	}

	$('#statusTableBody').append(
		`
		${color}
			<td>${formatDate(new Date())}</td>
			<td>${tabId}</td>
			<td><a href=\"${urlFrom}\">${urlFrom}</a></td>
			<td><a href=\"${urlTo}\">${urlTo}</a></td>
			<td>${action}</td>
		</tr>
		`
	);
}

/**
 * Formats a given date for printing (we are interested in the time only).
 * 
 * @param {Date} date The date object we want to print. 
 */
function formatDate(date) {
	var hours = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
	var minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
	var seconds = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds();

	return `${hours}:${minutes}:${seconds}`;
}

/**
 * Changes the title dynamically, indicating that the page is doing work.
 */
function setDynamicTitle() {
	const dots = ['.', '..', '...'];
	var currentTitle = document.title;
	var index = 0;

	setInterval(function () {
		document.title = currentTitle + dots[index];
		index = (index + 1) % dots.length;
	}, 500);
}

/**
 * Sorts a table by a specified column.
 * Source: https://www.w3schools.com/howto/howto_js_sort_table.asp
 * 
 * @param {number} n The index of the column to sort by.
 * @param {string} tableId The id of the table we want to sort.
 */
function sortTable(n, tableId) {
	console.log(n);
	var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
	table = document.getElementById(tableId);
	switching = true;
	// Set the sorting direction to ascending:
	dir = "asc";
	/* Make a loop that will continue until
	no switching has been done: */
	while (switching) {
		// Start by saying: no switching is done:
		switching = false;
		rows = table.rows;
		/* Loop through all table rows (except the
		first, which contains table headers): */
		for (i = 1; i < (rows.length - 1); i++) {
			// Start by saying there should be no switching:
			shouldSwitch = false;
			/* Get the two elements you want to compare,
			one from current row and one from the next: */
			x = rows[i].getElementsByTagName("TD")[n];
			y = rows[i + 1].getElementsByTagName("TD")[n];
			/* Check if the two rows should switch place,
			based on the direction, asc or desc: */
			if (dir == "asc") {
				if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
					// If so, mark as a switch and break the loop:
					shouldSwitch = true;
					break;
				}
			} else if (dir == "desc") {
				if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
					// If so, mark as a switch and break the loop:
					shouldSwitch = true;
					break;
				}
			}
		}
		if (shouldSwitch) {
			/* If a switch has been marked, make the switch
			and mark that a switch has been done: */
			rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
			switching = true;
			// Each time a switch is done, increase this count by 1:
			switchcount++;
		} else {
			/* If no switching has been done AND the direction is "asc",
			set the direction to "desc" and run the while loop again. */
			if (switchcount == 0 && dir == "asc") {
				dir = "desc";
				switching = true;
			}
		}
	}
}