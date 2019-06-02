'use strict'

const STEP_SEARCH_INPUT = 1;
const STEP_SELECT_ELEMENT = 2;
const STEP_ANNOTATE = 3;
const STEP_PAGER = 4
const STEP_CONFIRM = 5;
const STEPS = {}

STEPS[STEP_SEARCH_INPUT] = 'Select search string input.';
STEPS[STEP_SELECT_ELEMENT] = 'Select the first element from the list of results.';
STEPS[STEP_ANNOTATE] = 'Click on elements within your selected item to annotate them.';
STEPS[STEP_PAGER] = 'Select the pager.';
STEPS[STEP_CONFIRM] = 'Check correct items have been matched?';

const stepNoElement = document.getElementById('stepNo');
const stepTextElement = document.getElementById('stepText');

let currentStep = 1;


/**
 * Shows and hides actions depending on the current step that we are on.
 */
function showActions() {
    document.getElementById('btnAnnotationsDone').style.display = 'none';
    document.getElementById('btnExport').style.display = 'none';

    switch (currentStep) {
        case STEP_ANNOTATE:
            document.getElementById('btnAnnotationsDone').style.display = 'inline-block';
            break;

        case STEP_CONFIRM:
            document.getElementById('btnExport').style.display = 'inline-block';
            break;
    }
}


/***
 * Changes the current status with the step number. Updates the step's
 * message for the user as well.
 */
function updateStepText() {
    stepNoElement.innerText = currentStep.toString();
    stepTextElement.innerText = STEPS[currentStep];
    showActions();
}


/**
 * Adds a listener for any messages being communicated in the extension and handles
 * it.
 */
chrome.runtime.onMessage.addListener(function(request) {
    switch (request.type) {
        case 'STEP_NEXT':
            currentStep += 1;
            updateStepText();
            break;

        case 'STEP_PREV':
            currentStep -= 1;
            updateStepText();
            break;
    }
});


/**
 * Alerts the extension that the user is closing and cancelling the session.
 */
document.getElementById('btnClose').addEventListener('click', function () {
    if (confirm('Are you sure you want to cancel this recording?')) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(
                tabs[0].id, {
                type: 'STOP_RECORDING'
            });
        });
    }
});


/**
 * Let's the app tab know that we need to move to the confirmation step now.
 */
document.getElementById('btnAnnotationsDone').addEventListener('click', function () {
    currentStep += 1;
    updateStepText();

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(
            tabs[0].id, {
                type: 'STEP_PAGER'
            });
    });
});


/**
 * Let's the app tab know that we need to move to the confirmation step now.
 */
document.getElementById('btnExport').addEventListener('click', function () {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(
            tabs[0].id, {
                type: 'STEP_EXPORT'
            });
    });
});
