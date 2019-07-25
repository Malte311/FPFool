'use strict';

/**
 * Keeps track of third party requests, so we can visit suspicious sites if we want to.
 */
function monitorThirdPartyRequests() {
	// Listener scope on all urls
	var urls = {
		urls: ['http://*/*', 'https://*/*']
	};

	chrome.webRequest.onBeforeRequest.addListener(det => {
		if (det.type == 'script' && det.initiator != undefined) {
			// Ignore extension page
			var startInd = det.initiator.indexOf('.') + 1;
			var urlExtension = det.initiator.match(/\.[a-z]{2,3}($|\/)/);
			var endInd = urlExtension != null ? det.initiator.indexOf(urlExtension[0]) : -1;

			// We are only interested in third party sites, so we ignore first party requests.
			if (endInd > 0 && !det.url.includes(det.initiator.substring(startInd, endInd))) {
				var key = getKeyFromUrl(det.initiator);

				getFromDatabase('thirdParties', key, result => {
					// Request already existing, do not save it again
					if (result != undefined && result.value.includes(det.url))
						return;
					
					storeInDatabase('thirdParties', key, det.url, true, () => {
						processRequest(det);
					});
				});
			}
		}
	}, urls, ['requestBody']);
}

/**
 * Checks if a given third party request matches a request from another site and adds this other
 * site to the queue (if the site is not already contained in the queue).
 * 
 * @param {object} det The third party request we want to process.
 */
function processRequest(det) {
	getAllDatabaseEntries('thirdParties', result => {
		// Find other websites that use the same third party and are not added to the queue yet
		for (const entry of result) {
			if (!entry.url.includes(det.initiator.substring(startInd, endInd)) &&
				entry.value.includes(det.url) && !queue.includes(entry.url)) {
				
				queue.push(entry.url);

				// Restart loop if queue was empty before and connection limit is not reached yet.
				if (!(queue.length > 1) && todayCount < connectionLimit) {
					restartLoop(5000 * Math.random() + 10000); // 10 to 15 seconds
				}
			}
		}
	});
}