'use strict';

/*
 * Dictionary of words to search for.
 */
const dict = ["JavaScript", "HTML", "CSS"];

$(document).ready(function () {
	console.log("Content script ready!");
});

function navigatePage() {
	// Execute only for tabs created by this extension.
	if (false) {
		var links = [];

		$('a').each(function () {
			links.push(this.href);
		});

		var randomVisit = links[Math.floor(Math.random() * links.length)];
		$(randomVisit).click();
	}
}

function searchPage() {
	// Execute only for tabs created by this extension.
	if (false) {
		$(':input[type=text]').each(function () {
			$(this).val(dict[Math.floor(Math.random() * dict.length)]);
			setTimeout(function () {
				$(this).closest('form').submit();
			}, 1666);

			break; // Consider only the first input field.
		});
	}
}