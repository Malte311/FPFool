'use strict';

/*
 * Holds the Google suggestion API for completing search terms.
 */
const suggestionAPI = 'http://suggestqueries.google.com/complete/search?client=firefox';

/**
 * Returns a suggestion from a list of suggestions which was not considered before.
 * 
 * @param {Array} suggestions Array of suggestions.
 * @param {Array} alreadyChosen Array of words we already looked at.
 */
function chooseTerm(suggestions, alreadyChosen) {
	for (var i = 0; i < suggestions.length; i++) {
		if (!alreadyChosen.includes(suggestions[i]))
			return suggestions[i];
	}

	return null;
}

/**
 * Tries to find a Google search completion suggestion for a given term.
 * 
 * @param {string} term The search term for which we want to find a suggestion.
 */
function getSuggestion(term) {
	var words = term.split(' ');
	var finished = false;
	var maxRuns = 200;
	while (!finished && maxRuns > 0) {

		maxRuns--;
	}
}

/**
 * Requests the Google suggestion API for a given term.
 * 
 * @param {string} api The Google suggestion API.
 * @param {string} term The term which should get completed.
 */
function requestAPI(api, term) {
	return await new Promise((resolve, reject) => {
		var http = new XMLHttpRequest();

		http.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				/* Split at first comma, because the answer looks like this (for term 'hello'):
				* ["hello",["hello fresh","hello body","hello","hello kitty","hello neighbor",
				* "hello body code","hello fresh rezepte","helloween","hello again",
				* "hello fresh gutschein"]]
				*/
				var response = this.responseText.split(/,(.+)/)[1];
				var quoteCount = 0;
				var currentWord = '';
				var suggestions = [];
				for (var i = 0; i < response.length; i++) {
					if (quoteCount % 2 == 1) { // Quotation mark open, word begins here
						currentWord += response.charAt(i);
					}
					else if (currentWord != '') { // Quotation mark close, word ended here
						suggestions.push(currentWord);
						currentWord = '';
					}

					if (response.charAt(i) == '"')
						quoteCount = (quoteCount + 1) % 2;
				}

				resolve(suggestions);
			}
		};
		
		http.open('GET', `${api}&q=${term}`, true);
		http.send();
	});
}