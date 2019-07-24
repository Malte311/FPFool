'use strict';

/*
 * Holds the indexedDB database.
 */
var database;

/**
 * Creates a database, if no database exists yet. Saves the database in the dedicated variable.
 * The database contains the following tables:
 * searchTerms:      searchParams:    thirdParties:               visits:
 * url | keywords    url | params     url | thirdPartyRequests    url | visitCount
 * 
 * @param {function} callback Optional callback function.
 */
function initDatabase(callback) {
	if ('indexedDB' in window) {
		var requestDB = window.indexedDB.open('database', 4);

		requestDB.onupgradeneeded = event => {
			database = requestDB.result;

			for (const table of data.tables) {
				if (!database.objectStoreNames.contains(table)) {
					database.createObjectStore(table, {
						keyPath: 'url'
					});
				}
			}
		};

		requestDB.onsuccess = event => {
			database = requestDB.result;
			typeof callback === 'function' && callback(); // Call callback, if it is defined
		};
	}
}

/**
 * Adds new entries to our indexedDB database.
 * 
 * @param {Object} objectStore The table we want to update.
 * @param {string} key The key of the item we want to update/add.
 * @param {Object} val The new value for the given key.
 * @param {bool} append Specifies if a value should be appended or overwritten.
 * @param {function} callback Optional callback function, executed after updating the database.
 */
function storeInDatabase(objectStore, key, val, append = true, callback) {
	var store = database.transaction(objectStore, 'readwrite').objectStore(objectStore);
	var req = store.get(key);

	req.onsuccess = event => {
		var terms = (req.result != undefined && append) ? req.result.terms.concat([val]) : [val];
		
		var update = store.put({
			url: key,
			terms: terms
		});

		// Call callback, if it is defined
		update.onsuccess = event => {
			typeof callback === 'function' && callback();
		};
	};
}

/**
 * Returns the value for a given key from our indexedDB database.
 * 
 * @param {Object} objectStore The table we want to update.
 * @param {string} key The key of the item we want to update/add.
 * @param {function} callback Mandatory callback function with result from database as parameter.
 * @return {Promise} The corresponding value to the given key.
 */
function getFromDatabase(objectStore, key, callback) {
	var req = database.transaction(objectStore, 'readonly').objectStore(objectStore).get(key);

	req.onsuccess = event => {
		callback(req.result);
	}
}