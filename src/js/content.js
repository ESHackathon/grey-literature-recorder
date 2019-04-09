'use strict'

const IFRAME_ID = 'crx_glsr_ui';
const VEIL_CLASSNAME = 'crx_glsr_veil';
const MOUSE_HOVERED_CLASSNAME = 'crx_glsr_hovered';
const MOUSE_SELECTED_CLASSNAME = 'crx_glsr_selected';
const MOUSE_SELECTED_ALT_CLASSNAME = 'crx_glsr_selected_alt';

let selectedElement = null;
let frameUI = null;
let isRecording = false;


/**
 * Removes the class for the given `className` for all the elements that is found
 * in the document with that name.
 * @param className
 */
function removeClass(className) {
    const elements = document.getElementsByClassName(className);

    while (elements[0]) {
        elements[0].classList.remove(className);
    }
}


/**
 * Clear the current selection.
 */
function clearSelections() {
    // Remove all hovered classes.
    removeClass(MOUSE_HOVERED_CLASSNAME);

    // Remove all selected classes.
    removeClass(MOUSE_SELECTED_CLASSNAME);

    // Remove all selected match classes.
    removeClass(MOUSE_SELECTED_ALT_CLASSNAME);
}


/**
 * Highlights all the elements by the name of the class present on the passed
 * in `selectedElem`.
 */
function highlightSimilarElements() {
    if (selectedElement === null) {
        return;
    }

    let className = selectedElement.className
        .replace(MOUSE_SELECTED_CLASSNAME, '')
        .replace(MOUSE_HOVERED_CLASSNAME, '')
        .trim();

    removeClass(MOUSE_SELECTED_ALT_CLASSNAME);

    for (let elem of document.getElementsByClassName(className)) {
        if (elem.classList.contains(MOUSE_SELECTED_CLASSNAME)) {
            continue;
        }

        elem.classList.add(MOUSE_SELECTED_ALT_CLASSNAME)
    }
}


function showUI() {
    const url = chrome.runtime.getURL('../views/app.html');

    frameUI = document.createElement("iframe");
    frameUI.id = IFRAME_ID;
    frameUI.name = IFRAME_ID;
    frameUI.src = url;
    frameUI.style = "position: fixed; user-select: none; top: 12px; right: 12px; bottom: initial; left: initial; width: 320px; height: 400px; border: 0px; z-index: 2147483646; clip: auto; display: block !important;"
    document.body.appendChild(frameUI);
}


function hideUI() {
    if (frameUI === null) {
        return;
    }

    document.body.removeChild(frameUI);
}


function showVeil() {
    const outline = 3;
    const rect = selectedElement.getBoundingClientRect();

    const veilTop = document.createElement('div');
    veilTop.classList.add(VEIL_CLASSNAME);
    veilTop.style = 'top: 0; right: 0; left: 0; height: ' + (rect.top - outline) + 'px;';

    const veilRight = document.createElement('div');
    veilRight.classList.add(VEIL_CLASSNAME);
    veilRight.style = 'top: 0; right: 0; bottom: 0; width: ' + (window.innerWidth - rect.width - rect.left - outline) + 'px;';

    const veilBottom = document.createElement('div');
    veilBottom.classList.add(VEIL_CLASSNAME);
    veilBottom.style = 'right: 0; bottom: 0; left: 0; height: ' + (window.innerHeight - rect.height - rect.top - outline) + 'px;';

    const veilLeft = document.createElement('div');
    veilLeft.classList.add(VEIL_CLASSNAME);
    veilLeft.style = 'top: 0; bottom: 0; left: 0; width: ' + (rect.left - outline) + 'px;';

    document.body.appendChild(veilTop);
    document.body.appendChild(veilRight);
    document.body.appendChild(veilBottom);
    document.body.appendChild(veilLeft);
}


function hideVeil() {
    removeClass(VEIL_CLASSNAME);
}

/**
 * Highlights the current div that the mouse pointer is hovering over.
 */
document.addEventListener('mousemove', function (e) {
    if (!isRecording || selectedElement !== null) {
        return;
    }

    // For NPE checking, we check safely. We need to remove the class name
    // Since we will be styling the new one after.
    removeClass(MOUSE_HOVERED_CLASSNAME);

    // Add a hovered class name to the element. So we can style it.
    e.target.classList.add(MOUSE_HOVERED_CLASSNAME);
}, false);


/**
 * Set the selected state of the clicked element.
 */
document.addEventListener('click', function (e) {
    if (!isRecording) {
        return;
    }

    if (selectedElement !== null) {
        hideVeil();
        highlightSimilarElements();
        chrome.runtime.sendMessage( {
            type: 'ANNOTATED'
        });
        return;
    }

    removeClass(MOUSE_SELECTED_CLASSNAME);

    if (e.target.className.trim().length === 0) {
        alert('Selected item has no "id" or "classes" to distinguished ' +
            'it. It cannot be selected.');
        clearSelections();
        return;
    }

    selectedElement = e.target;
    selectedElement.classList.remove(MOUSE_HOVERED_CLASSNAME);
    selectedElement.classList.add(MOUSE_SELECTED_CLASSNAME);

    chrome.runtime.sendMessage( {
        type: 'SELECTED'
    });

    showVeil();
});


/**
 * Adds a listener for any messages being communicated in the extension and handles
 * it.
 */
chrome.runtime.onMessage.addListener(function(request) {
    if (request.type !== 'RECORDING') {
        return;
    }

    isRecording = !isRecording;
    clearSelections();

    if (isRecording) {
        showUI();
    } else {
        hideUI();
    }
});

window.onresize = function() {
    if (!isRecording) {
        return;
    }

    hideVeil();
    showVeil();
};

