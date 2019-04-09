'use strict'

const stepMessage = document.getElementById('stepMessage');


function updateStepMessage(message) {
    stepMessage.innerText = message;
}

function setSelectedState() {
    updateStepMessage('Annotate regions...');
}

function setAnnotatedState() {
    updateStepMessage('Check correct items have been matched?');
}


/**
 * Adds a listener for any messages being communicated in the extension and handles
 * it.
 */
chrome.runtime.onMessage.addListener(function(request) {
    switch (request.type) {
        case 'SELECTED':
            setSelectedState();
            break;

        case 'ANNOTATED':
            setAnnotatedState();
            break;

        default:
            console.log('Request type not recognised: ', request);
    }
});
