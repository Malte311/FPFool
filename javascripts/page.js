'use strict';

window.onload = function () {
	var div = document.getElementById('divID');

	chrome.storage.sync.get(['interval'], function (result) {
		div.innerHTML += result.interval;
	});
};

function setInterval(newInterval) {
	chrome.storage.sync.set({
		interval: newInterval
	});
}