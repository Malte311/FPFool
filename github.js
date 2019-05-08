'use strict';

/*
 * Access to filesystem in order to read and write files.
 */
const fs = require('fs');

/*
 * The file name of the input file.
 */
var resultFile = null;

/*
 * The file name of the output file.
 */
var readmeFile = 'readme.md';

/*
 * Saves the heading of the section we want to update.
 */
var readmeHeading = '# Statistics';

/**
 * Inserts a character at a given position in a string.
 */
String.prototype.insertAt = function (index, char) {
	return this.substring(0, index) + char + this.substring(index);
}

/**
 * Replaces a character at a given position in a string by one or more new characters.
 */
String.prototype.replaceAt = function (index, newChars) {
	return this.substring(0, index) + newChars + this.substring(index + 1);
}

/*
 * Gets the input via command line arguments (note: index 2 is the first command line argument).
 */
process.argv.forEach(function (val, index, array) {
	switch (index) {
		case 2:
			resultFile = val;
			break;
		default:
			return;
	}
});

/*
 * Takes the input and formats it for markdown style. Then we write it into the readme file.
 */
if (resultFile != null && fs.existsSync(resultFile)) {
	var result = fs.readFileSync(resultFile, {
		encoding: 'utf8'
	});
	var numberOfLines = 1;

	// Remove all information before the actual table
	result = result.substring(result.indexOf('Language'));

	// Add markdown column separators at the beginning and end of each line.
	for (var i = result.length - 2; i >= 0; i--) {
		if (result[i] === '\n') {
			result = result.substring(0, i) + '|\n|' + result.substring(i + 1);
			numberOfLines++;
		}
	}
	result = '|' + result.substring(0, result.length - 1) + '|';

	// Calculate index positions for the other column separators.
	var positions = [];
	var lineLength;
	for (var i = 1; i < result.length; i++) {
		if (/^[a-zA-Z]+$/.test(result[i]) && /^\s$/.test(result[i - 1])) {
			positions.push(i);
		}
		if (result[i] === '\n') {
			lineLength = i + 1;
			break;
		}
	}

	// Remove last line
	result = result.substring(0, lineLength * (numberOfLines - 1));
	numberOfLines--;

	// Add the column separators at the calculated index positions.
	for (var i = numberOfLines - 1; i >= 0; i--) {
		for (var j = positions.length - 1; j >= 0; j--) {
			result = result.insertAt(i * lineLength + positions[j], '|');
		}
	}

	// Remove unnecessary dashes
	lineLength += positions.length; // Because we added pipe symbols
	var lineToReplace = result.substring(lineLength * (numberOfLines - 2), lineLength * (numberOfLines - 1));
	lineToReplace = lineToReplace.replace(/-/g, ' ');
	for (var i = 0; i < lineToReplace.length; i++) {
		if (lineToReplace[i] === '|') {
			lineToReplace = lineToReplace.substring(0, i + 1) + '-' + lineToReplace.substring(i + 2);
		}
	}
	lineToReplace = lineToReplace.substring(0, lineToReplace.length - 1); // One dash too much
	result = result.substring(0, lineLength * (numberOfLines - 2)) + lineToReplace +
		result.substring(lineLength * (numberOfLines - 1) - 1);

	// Update the markdown content (assumes that nothing follows after the section we want to update)
	var readme = fs.readFileSync(readmeFile, {
		encoding: 'utf8'
	});
	readme = readme.substring(0, readme.indexOf(readmeHeading) + readmeHeading.length + 1) + '\n' + result;

	// Write back to markdown file
	fs.writeFileSync(readmeFile, readme, {
		encoding: 'utf8'
	});
}