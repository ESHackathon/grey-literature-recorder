'use strict'


/**
 * Connects to the extensions `onClicked` event and either activates the
 * extension or deactivates it.
 */
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.sendMessage(tab.id, {
        type: 'RECORDING_START_STOP'
    });
});

/**
 *
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, {
            type: 'RECORDING_CONTINUE'
        });
    }
});
