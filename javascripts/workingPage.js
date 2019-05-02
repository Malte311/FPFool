'use strict';

/*
 * Contains dots for displaying dynamic status information.
 */
const dots = ['.', '..', '...'];

/*
 * Contains all the possible request types. A request type indicates what action was performed.
 * 
 * requestType.OPEN: Indicates that a new connection towards an url was established.
 * requestType.NAVIGATE: Indicates that there was a klick on a link on a webpage.
 * requestType.REMOVE: Indicates that a tab has been closed.
 * requestType.SEARCH: Indicates that there was a search for specific keyword(s) on a webpage.
 */
const requestType = {
	OPEN: 'open',
	NAVIGATE: 'navigate',
	REMOVE: 'remove',
	SEARCH: 'search'
};

/*
 * Executes the script when the page has loaded. This script logs the acitivities performed
 * by the extension.
 */
$(document).ready(function () {
	setDynamicTitle();

	// Waits for messages from content scripts. The content scripts will inform this script
	// whenever they perform an action, so we can update the status information.
	chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
		if (requestType.hasOwnProperty(request.type)) {
			var action;
			switch (request.type) {
				case requestType.OPEN:
					action = `Opened a new tab to <a href=\"${request.url}\">${request.url}</a>.`;
					break;
				case requestType.NAVIGATE:
					action = `Navigated to <a href=\"${request.toUrl}\">${request.toUrl}</a>.`;
					break;
				case requestType.REMOVE:
					action = `Closed the tab with <a href=\"${request.url}\">${request.url}</a>.`;
					break;
				case requestType.SEARCH:
					action = `
						Searched for \"${request.searchTerm}\" on 
						<a href=\"${request.url}\">${request.url}</a>. <br>
						Redirection to <a href=\"${request.toUrl}\">${request.toUrl}</a>.
					`;
					break;
				default:
					action = 'Unknown action.';
					break;
			}

			appendTable(request.url, action, request.type);
		}
	});
});

/**
 * Appends a new row to the status table. This row contains the following entries:
 * 
 * @param {string} url The url on which an event has happened.
 * @param {string} action The description of the event.
 * @param {string} type The type of the event.
 */
function appendTable(url, action, type) {
	var color;
	switch (type) {
		case requestType.OPEN:
			color = '<tr class=\"table-success\">'; // Green
			break;
		case requestType.NAVIGATE:
			color = '<tr class=\"table-info\">'; // Light blue
			break;
		case requestType.REMOVE:
			color = '<tr class=\"table-danger\">'; // Red
			break;
		case requestType.SEARCH:
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
			<td><a href=\"${url}\">${url}</a></td>
			<td>${action}</td>
		</tr>
		`
	);
}

/**
 * Formats a given date for printing.
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
	var currentTitle = document.title;
	var index = 0;

	setInterval(function () {
		document.title = currentTitle + dots[index];
		index = (index + 1) % dots.length;
	}, 500);
}