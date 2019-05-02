'use strict';

/*
 * Contains dots for displaying dynamic status information.
 */
const dots = ['.', '..', '...'];

$(document).ready(function () {
	setDynamicTitle();
	appendTable("a", "b", "open");

	// chrome.runtime.sendMessage({
	// 	type: 'getStatistics'
	// }, function (response) {
	// 	console.log(response);
	// });
});

function setDynamicTitle() {
	var currentTitle = document.title;
	var index = 0;

	setInterval(function () {
		document.title = currentTitle + dots[index];
		index = (index + 1) % dots.length;
	}, 500);
}

function appendTable(url, action, type) {
	var color = '<tr>';
	switch (type) {
		case 'open':
			color = '<tr class=\"table-success\">'; // Green
			break;
		case 'navigate':
			color = '<tr class=\"table-danger\">'; // Red
			break;
		case 'search':
			color = '<tr class=\"table-warning\">'; // Yellow
			break;
	}

	$('#statusTableBody').append(
		`
		${color}
			<td>${formatDate(new Date())}</td>
			<td>${url}</td>
			<td>${action}</td>
		</tr>
		`
	);
}

/**
 * Formats a given date for printing.
 * @param {Date} date The date object we want to print. 
 */
function formatDate(date) {
	var hours = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
	var minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
	var seconds = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds();

	return `${hours}:${minutes}:${seconds}`;
}