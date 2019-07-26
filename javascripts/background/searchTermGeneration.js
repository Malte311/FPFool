'use strict';

/*
 * Holds the Google suggestion API for completing search terms.
 */
const suggestionAPI = 'http://suggestqueries.google.com/complete/search?client=firefox';

/*
 * Defines the maximum number of iterations when searching for a suggestion. This number should
 * (hopefully) not get reached, but we use it to make 100% sure that we can never land in an
 * endless loop.
 */
const maxRuns = 200;

/**
 * Tries to find a Google search completion suggestion for a given term.
 * 
 * @param {string} term The search term for which we want to find a suggestion.
 * @param {function} callback Mandatory callback function with suggestion as parameter. 
 */
function getSuggestion(term, callback) {
	return getSuggestionRecursive(term, term, 0, [], callback);
}

/**
 * Tries to find a Google search completion suggestion for a given term.
 * 
 * @param {string} original The original term for which we want to find a suggestion.
 * @param {string} current The currently derived term.
 * @param {number} runs The number of iterations done so far.
 * @param {array} alreadyDone Terms which have already been looked at.
 * @param {function} callback Mandatory callback function with suggestion as parameter. 
 */
function getSuggestionRecursive(original, current, runs, alreadyDone, callback) {
	var words = getAllWords(current);
	words.filter(w => w.split(' ').length < original.split(' ').length);
	words.filter(w => !alreadyDone.includes(w));
	alreadyDone.concat(words);

	if (runs < maxRuns) {
		asyncArrLoop(words, (item, inCallback) => {
			requestAPI(suggestionAPI, item, result => {
				if (result == '') { // Nothing found
					inCallback();
					return;
				}
				
				var suggestion = chooseTerm(result, alreadyDone);

				var suggestionWords = suggestion.split(' ');
				var termWords = original.split(' ');
				if (suggestionWords.length == termWords.length &&
					!suggestionWords.some(w => termWords.includes(w))) {
					callback(suggestion); // No inCallback() call: break from loop
				} else {
					inCallback(); // Process next item from words array
				}
			});
		}, () => { // Callback after loop is done
			getSuggestionRecursive(original, suggestion, ++runs, alreadyDone);
		}, 0);
	} else {
		callback('');
	}
}

/**
 * Returns all possible combinations of words for a search term (with the only condition that the
 * words do not change their order).
 * 
 * @param {string} term The term for which we want to get all combinations of words. 
 */
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
 * @param {function} callback Mandatory callback function with the suggestions as parameter.
 */
function requestAPI(api, term, callback) {
	var xmlHttp = new XMLHttpRequest();

	xmlHttp.onreadystatechange = () => {
		if (this.readyState == 4 && this.status == 200) {
			callback(processResponse(this.responseText));
		} else {
			callback('');
		}
	};

	xmlHttp.open('GET', `${api}&q=${term}`, true);
	xmlHttp.send();
}

/**
 * Brings the response from the API into the correct format.
 * 
 * @param {string} text Response text from the API request.
 */
function processResponse(text) {
	/* 
	 * Text looks like this (for term 'hello'):
	 * ["hello",["hello fresh","hello body","hello","hello kitty","hello neighbor",
	 * "hello body code","hello fresh rezepte","helloween","hello again",
	 * "hello fresh gutschein"]]
	 */
	text = text.split(/,(.+)/)[1]; // Split at first comma

	var quoteCount = 0, currentWord = '', suggestions = [];
	for (var i = 0; i < text.length; i++) {
		if (quoteCount % 2 == 1) { // Quotation mark open, word begins here
			currentWord += text.charAt(i);
		} else if (currentWord != '') { // Quotation mark close, word ended here
			suggestions.push(currentWord);
			currentWord = '';
		}

		if (text.charAt(i) == '"')
			quoteCount = (quoteCount + 1) % 2;
	}

	return text;
}

/**
 * Returns a suggestion from a list of suggestions which was not considered before.
 * 
 * @param {Array} suggestions Array of suggestions.
 * @param {Array} alreadyChosen Array of words we already looked at.
 */
function chooseTerm(suggestions, alreadyChosen) {
	// Simply pick the first suggestion which was not already chosen.
	for (var i = 0; i < suggestions.length; i++) {
		if (!alreadyChosen.includes(suggestions[i]))
			return suggestions[i];
	}

	return '';
}