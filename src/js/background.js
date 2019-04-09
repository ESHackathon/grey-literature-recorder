'use strict'


/**
 * Connects to the extensions `onClicked` event and either activates the
 * extension or deactivates it.
 */
chrome.browserAction.onClicked.addListener(function(tab) {
    let message = {
        type: 'RECORDING'
    }

    chrome.tabs.sendMessage(tab.id, message);
});
