'use strict';

/*
 * Keeps track of third party websites which might be interesting to visit.
 */
var thirdParties = new Map();

/**
 * Keeps track of third party requests, so we can visit suspicious sites if we want to.
 */
function monitorThirdPartyRequests() {
	chrome.webRequest.onBeforeRequest.addListener(det => {
		const excludedTypes = ['stylesheet', 'image']; // Reduce unnecessary effort
		if (!excludedTypes.includes(det.type) && det.initiator != undefined) {
			// We are only interested in third party sites, so we ignore first party requests.
			// (otherwise we would get way too many requests to consider)
			var startInd = det.initiator.indexOf('.') + 1;
			var urlExtension = det.initiator.match(/\.[a-z]{2,3}($|\/)/);
			var endInd = urlExtension != null ? det.initiator.indexOf(urlExtension[0]) : -1;
			if (endInd > 0 && !det.url.includes(det.initiator.substring(startInd, endInd))) {
				var val = thirdParties.get(det.initiator);
				thirdParties.set(
					det.initiator,
					val != undefined ?
					(val.includes(det.url) ? val : val.concat([det.url])) : [det.url]
				);

				// Find other websites that use the same third party and are not added to the
				// queue yet
				for (const [key, val] of thirdParties) {
					if (!key.includes(det.initiator.substring(startInd, endInd)) &&
						val.includes(det.url) && !queue.includes(key)) {
						queue.push(key);
						// Restart loop if queue was empty before and maximum number of
						// connections is not reached yet.
						if (!(queue.length > 1) && todayCount < connectionLimit) {
							restartLoop(5000 * Math.random() + 10000); // 10 to 15 seconds
						}
					}
				}
			}
		}
	}, {
			urls: ['http://*/*', 'https://*/*']
		},
		['requestBody']
	);
}