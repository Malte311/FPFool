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
	return 'test';
	// return getSuggestionRecursive(term, term, 0, []);
}

function getSuggestionRecursive(original, current, runs, alreadyDone) {
	var words = getAllWords(current);
	alreadyDone.concat(words);
	var found = null;
	if (runs++ < 200) {
		words.forEach((val, ind, arr) => {
			requestAPI(suggestionAPI, val).then((result) => {
				if (result == ' ')
					return;

				var suggestion = chooseTerm(result, alreadyDone);
				alreadyDone.push(suggestion);

				var suggestionWords = suggestion.split(' ');
				var termWords = original.split(' ');

				if (suggestionWords.length == termWords.length &&
					!suggestionWords.some(w => termWords.includes(w))) {
					found = suggestion;
					return;
				} else {
					getSuggestion(original, suggestion, runs, alreadyDone);
				}
			});
			if (found != null)
				return;
		});
	}

	return found != null ? found : ' ';
}

function getAllWords(term) {
	var powerset = [];

	var words = term.split(' ');
	var currWord = '';
	for (var i = 0; i < words.length; i++) {
		currWord += words[i];
		powerset.push(words[i]);
		for (var j = i + 1; j < words.length; j++) {
			currWord += (' ' + words[j]);
			powerset.push(currWord);
		}
		currWord = '';
	}

	return powerset;
}

/**
 * Requests the Google suggestion API for a given term.
 * 
 * @param {string} api The Google suggestion API.
 * @param {string} term The term which should get completed.
 */
async function requestAPI(api, term) {
	return await new Promise((resolve, reject) => {
		var http = new XMLHttpRequest();

		http.onreadystatechange = function () {
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
					} else if (currentWord != '') { // Quotation mark close, word ended here
						suggestions.push(currentWord);
						currentWord = '';
					}

					if (response.charAt(i) == '"')
						quoteCount = (quoteCount + 1) % 2;
				}

				resolve(suggestions);
			} else {
				resolve(' ');
			}
		};

		http.open('GET', `${api}&q=${term}`, true);
		http.send();
	});
}