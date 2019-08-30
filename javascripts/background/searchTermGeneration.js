/**
 * @module background script - searchTermGeneration
 */
'use strict';

/**
 * Holds the link to the Google suggestion API for completing search terms.
 */
const suggestionAPI = 'http://suggestqueries.google.com/complete/search?client=firefox';

/**
 * Defines the maximum number of iterations when searching for a suggestion. This number should
 * (hopefully) not get reached, but we use it to make 100% sure that we can never land in an
 * endless loop.
 */
const maxRuns = 20;

/**
 * Tries to find a Google search completion suggestion for a given term.
 * 
 * @param {string} term The search term for which we want to find a suggestion.
 * @param {function} callback Mandatory callback function with suggestion as parameter. 
 */
function getSuggestion(term, callback) {
	getSuggestionRecursive(term, [term], 0, [], callback);
}

/**
 * Tries to find a Google search completion suggestion for a given term.
 * 
 * @param {string} original The original term for which we want to find a suggestion.
 * @param {string[]} wordQueue The terms to look at next.
 * @param {number} runs The number of iterations done so far.
 * @param {string[]} alreadyDone Terms which have already been looked at.
 * @param {function} callback Mandatory callback function with suggestion as parameter. 
 */
function getSuggestionRecursive(original, wordQueue, runs, alreadyDone, callback) {
	if (!wordQueue.length > 0) {
		callback('');
		return;
	}

	var current = wordQueue.shift();

	var words = getAllWords(current);
	words = words.filter(w => w.split(' ').length <= original.split(' ').length);
	words = words.filter(w => !alreadyDone.includes(w));
	words = words.filter(w => w.trim().length > 0);
	words = words.filter((item, pos, self) => self.indexOf(item) == pos);
	
	if (runs < maxRuns && words.length > 0) {
		alreadyDone = alreadyDone.concat(words);

		asyncArrLoop(words, (item, inCallback) => {
			setTimeout(() => { // Make sure Google does not block us
				requestAPI(suggestionAPI, item, result => {
					if (result == '') { // Nothing found
						inCallback();
						return;
					}
					
					var suggestion = chooseTerm(result, alreadyDone);
					if (isValid(original, suggestion)) {
						callback(suggestion); // No inCallback() call: break from loop
					} else {
						wordQueue.push(suggestion);
						inCallback(); // Process next item from words array
					}
				});
			}, 500);
		}, () => { // Callback after loop is done (only if last iteration passed)
			getSuggestionRecursive(original, wordQueue, ++runs, alreadyDone, callback);
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
	xmlHttp.open('GET', `${api}&q=${term}`, true);

	xmlHttp.onreadystatechange = () => {
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
			try {
				callback(processResponse(xmlHttp.responseText));
			} catch (err) {
				callback('');
			}
		}
	};

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
		if (quoteCount % 2 == 1 && text.charAt(i) != '"') { // Quotation mark open, word begins here
			currentWord += text.charAt(i);
		} else if (currentWord != '') { // Quotation mark close, word ended here
			suggestions.push(currentWord.trim());
			currentWord = '';
		}

		if (text.charAt(i) == '"')
			quoteCount = (quoteCount + 1) % 2;
	}

	return suggestions;
}

/**
 * Returns a suggestion from a list of suggestions which was not considered before.
 * 
 * @param {string[]} suggestions Array of suggestions.
 * @param {string[]} alreadyChosen Array of words we already looked at.
 */
function chooseTerm(suggestions, alreadyChosen) {
	suggestions = suggestions.map(e => e.toLowerCase());
	alreadyChosen = alreadyChosen.map(e => e.toLowerCase());

	// Random choice
	while (suggestions.length > 0) {
		var randomIndex = Math.floor(Math.random() * suggestions.length);
		if (!alreadyChosen.includes(suggestions[randomIndex]))
			return suggestions[randomIndex];
		else
			suggestions.splice(randomIndex, 1);
	}

	return '';
}

/**
 * Checks if a suggestion is valid, i.e., it contains the same number of words as the original
 * term and it contains not a single word of the original term.
 * 
 * @param {string} originalTerm The original term.
 * @param {string} suggestionTerm The suggestion to be checked.
 */
function isValid(originalTerm, suggestionTerm) {
	if (!suggestionTerm.trim().length > 0)
		return false;
	
	var suggestionWords = suggestionTerm.split(' ');
	var originalWords = originalTerm.split(' ');

	return suggestionWords.length == originalWords.length && 
		   !suggestionWords.some(w => originalWords.includes(w));
}