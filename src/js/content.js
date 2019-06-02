'use strict'

const STEP_SEARCH_INPUT = 1;
const STEP_SELECT_ELEMENT = 2;
const STEP_ANNOTATE = 3;
const STEP_PAGER = 4
const STEP_CONFIRM = 5;

const IFRAME_ID = 'crx_glsr_ui';
const CLOSE_BTN_ID = 'crx_glsr_close';
const CLOSE_BTN_IMG_ID = 'crx_glsr_close_img';
const CLOSE_BTN_CLASSNAME = 'crx_glsr_close';
const VEIL_CLASSNAME = 'crx_glsr_veil';
const MOUSE_HOVERED_CLASSNAME = 'crx_glsr_hovered';
const MOUSE_SELECTED_CLASSNAME = 'crx_glsr_selected';
const MOUSE_SELECTED_ALT_CLASSNAME = 'crx_glsr_selected_alt';
const ANNOTATE_HOVERED_CLASSNAME = 'crx_glsr_annotate_hovered';
const ANNOTATED_CLASSNAME = 'crx_glsr_annotated';

let searchString = '';
let selectedElement = null;
let pagerElement = null;
let annotations = [];
let frameUI = null;
let step = STEP_SEARCH_INPUT;
let start = false;


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
    searchString = '';
    selectedElement = null;
    pagerElement = null;
    annotations = [];
    step = STEP_SEARCH_INPUT;
    start = false;

    // Remove all hovered classes.
    removeClass(MOUSE_HOVERED_CLASSNAME);

    // Remove all selected classes.
    removeClass(MOUSE_SELECTED_CLASSNAME);

    // Remove all selected match classes.
    removeClass(MOUSE_SELECTED_ALT_CLASSNAME);

    // Remove all annotated classes.
    removeClass(ANNOTATE_HOVERED_CLASSNAME);
    removeClass(ANNOTATED_CLASSNAME);
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

    // removeClass(MOUSE_SELECTED_ALT_CLASSNAME);

    for (let elem of document.getElementsByClassName(className)) {
        if (elem.classList.contains(MOUSE_SELECTED_CLASSNAME)) {
            continue;
        }

        elem.classList.add(MOUSE_SELECTED_CLASSNAME)
    }
}


function showUI() {
    const appUrl = chrome.runtime.getURL('../views/app.html');

    frameUI = document.createElement("iframe");
    frameUI.id = IFRAME_ID;
    frameUI.name = IFRAME_ID;
    frameUI.src = appUrl;
    frameUI.style = "position: fixed; user-select: none; top: 12px; right: 12px; bottom: initial; left: initial; " +
        "width: 320px; height: 194px; border: 0px; z-index: 2147483646; clip: auto; display: block !important;"
    document.body.appendChild(frameUI);
}


function hideUI() {
    clearSelections();

    if (frameUI === null) {
        return;
    }

    document.body.removeChild(frameUI);
}


function selectSearchString(e) {
    e.target.blur();
    searchString = e.target.value;
    step = STEP_SELECT_ELEMENT;

    chrome.runtime.sendMessage( {
        type: 'STEP_NEXT'
    });
}


function selectBaseElement(e) {
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

    step = STEP_ANNOTATE;

    chrome.runtime.sendMessage({
        type: 'STEP_NEXT'
    });

    showVeil();
}


function selectPagerElement(e) {
    pagerElement = e.target;
    step = STEP_CONFIRM;

    chrome.runtime.sendMessage({
        type: 'STEP_NEXT'
    });
}


function showVeil() {
    const closeBtnUrl = chrome.runtime.getURL('../img/icon_close.svg');
    const outline = 3;
    const closeSize = 14;
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

    const closeBtnImg = document.createElement('img')
    closeBtnImg.id = CLOSE_BTN_IMG_ID;
    closeBtnImg.name = CLOSE_BTN_IMG_ID;
    closeBtnImg.src = closeBtnUrl;
    closeBtnImg.width = 18;
    closeBtnImg.height = 18;

    const closeBtn = document.createElement('div');
    closeBtn.classList.add(CLOSE_BTN_CLASSNAME);
    closeBtn.id = CLOSE_BTN_ID;
    closeBtn.name = CLOSE_BTN_ID;
    closeBtn.style = 'top: ' + (rect.top - closeSize) + 'px; left: ' + (rect.left + (rect.width / 2) - closeSize) + 'px;';
    closeBtn.appendChild(closeBtnImg);

    document.body.appendChild(closeBtn);
    document.body.appendChild(veilTop);
    document.body.appendChild(veilRight);
    document.body.appendChild(veilBottom);
    document.body.appendChild(veilLeft);
}


function hideVeil() {
    removeClass(CLOSE_BTN_CLASSNAME);
    removeClass(VEIL_CLASSNAME);
}


function showExport() {
    if (!start) return;

    const data = {
        date: new Date().toISOString(),
        url: window.location.href,
        searchTerm: searchString,
        data: []
    };

    const elements = document.getElementsByClassName(MOUSE_SELECTED_CLASSNAME);
    data.data = Array.prototype.map.call(elements, function(element) {
        const elemData = {
            links: []
        };

        annotations.forEach(function (annotation) {
            const className = annotation['className']
                .replace(ANNOTATED_CLASSNAME, '')
                .trim();
            const annotatedElements = element.getElementsByClassName(className);

            if (annotatedElements.length > 0) {
                const annotatedElement = annotatedElements[0]
                elemData[annotation['title']] = annotatedElement.innerText;

                if (annotatedElement.tagName === 'A') {
                    elemData.links.push(annotatedElement.href);
                }
            }
        });

        return elemData;
    });

    console.log(data);

    hideVeil();
    clearSelections();
    hideUI();

    // const exprtUrl = chrome.runtime.getURL('../img/export.jpg');
    //
    // const exportImg = document.createElement('img');
    // exportImg.classList.add('export-img');
    // exportImg.src = exprtUrl;
    //
    // document.body.appendChild(exportImg);
}

/**
 * Highlights the current div that the mouse pointer is hovering over.
 */
document.addEventListener('mousemove', function (e) {
    if (!start || e.target.classList.contains(VEIL_CLASSNAME)) {
        return;
    }

    switch (step) {
        case STEP_SEARCH_INPUT:
            removeClass(MOUSE_HOVERED_CLASSNAME);

            if (e.target.tagName === 'INPUT') {
                e.target.classList.add(MOUSE_HOVERED_CLASSNAME);
            }
            break;

        case STEP_SELECT_ELEMENT:
            removeClass(MOUSE_HOVERED_CLASSNAME);
            e.target.classList.add(MOUSE_HOVERED_CLASSNAME);
            break;

        case STEP_ANNOTATE:
            removeClass(ANNOTATED_CLASSNAME);
            e.target.classList.add(ANNOTATED_CLASSNAME);
            break;

        case STEP_PAGER:
            removeClass(MOUSE_HOVERED_CLASSNAME);
            e.target.classList.add(MOUSE_HOVERED_CLASSNAME);
    }
}, false);


/**
 * Set the selected state of the clicked element.
 */
document.addEventListener('click', function (e) {
    if (!start || (
        step !== STEP_SEARCH_INPUT &&
        step !== STEP_SELECT_ELEMENT &&
        step !== STEP_ANNOTATE &&
        step !== STEP_PAGER)) {
        return;
    }

    // Check if the user is removing their selection. If they are,
    // clear the page and go back a step.
    if (e.target.id === CLOSE_BTN_ID || e.target.id === CLOSE_BTN_IMG_ID) {
        hideVeil();
        clearSelections();
        chrome.runtime.sendMessage( {
            type: 'STEP_PREV'
        });
        return;
    } else if (e.target.tagName === 'A') {
        e.preventDefault();
    }

    if (step === STEP_SEARCH_INPUT && searchString.length === 0) {
        selectSearchString(e);
    } else if (step === STEP_SELECT_ELEMENT && selectedElement === null) {
        selectBaseElement(e);
    } else if (step === STEP_PAGER && pagerElement === null) {
        selectPagerElement(e);
    } else if (step === STEP_ANNOTATE ) {
        if (e.target.classList.contains(VEIL_CLASSNAME)) {
            return;
        }

        const title = window.prompt('Title', '');

        if (title === null || title.trim().length === 0) {
            return;
        }

        annotations.push({
            title: title,
            className: e.target.className,
            id: e.target.id
        });
        e.target.classList.add(ANNOTATE_HOVERED_CLASSNAME);
    }
});


/**
 * Adds a listener for any messages being communicated in the extension and handles
 * it.
 */
chrome.runtime.onMessage.addListener(function(request) {
    switch (request.type) {
        case 'RECORDING_START_STOP':
            start = !start;
            step = STEP_SEARCH_INPUT
            start ? showUI() : hideUI();
            break;

        case 'STOP_RECORDING':
        case 'RECORDING_CANCEL':
            hideVeil();
            clearSelections();
            hideUI();
            break;

        case 'STEP_PAGER':
            step = STEP_PAGER
            if (selectedElement !== null) {
                hideVeil();
                highlightSimilarElements();
            }
            break;

        case 'STEP_CONFIRM':
            step = STEP_CONFIRM
            if (selectedElement !== null) {
                hideVeil();
                highlightSimilarElements();
            }
            break;

        case 'STEP_EXPORT':
            showExport()
            break;
    }
});


window.onresize = function() {
    if (!start) {
        return;
    }

    hideVeil();
    showVeil();
};
