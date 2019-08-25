'use strict'

const STEP_SEARCH_INPUT = 1;
const STEP_SELECT_ELEMENT = 2;
const STEP_ANNOTATE = 3;
const STEP_PAGER = 4
const STEP_CONFIRM = 5;
const STEP_GETTING_DATA = 6;
const STEP_SAVE = 7;

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
 * Gets the environment details.
 */
function getEnvironment() {
    // **
    // * Get OS details.
    // **
    let osName = '';

    if (navigator.appVersion.indexOf("Win")!=-1) osName="Windows";
    else if (navigator.appVersion.indexOf("Mac")!=-1) osName="MacOS";
    else if (navigator.appVersion.indexOf("X11")!=-1) osName="UNIX";
    else if (navigator.appVersion.indexOf("Linux")!=-1) osName="Linux";

    // **
    // * Get Browser details.
    // **
    let nVer = navigator.appVersion;
    let nAgt = navigator.userAgent;
    let browserName  = navigator.appName;
    let fullVersion  = ''+parseFloat(navigator.appVersion);
    let majorVersion = parseInt(navigator.appVersion,10);
    let nameOffset, verOffset, ix;

    if ((verOffset=nAgt.indexOf("Opera")) !== -1) {
        browserName = "Opera";
        fullVersion = nAgt.substring(verOffset+6);
        if ((verOffset=nAgt.indexOf("Version")) !== -1)
            fullVersion = nAgt.substring(verOffset+8);
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset=nAgt.indexOf("MSIE")) !== -1) {
        browserName = "Microsoft Internet Explorer";
        fullVersion = nAgt.substring(verOffset+5);
    }
    // In Chrome, the true version is after "Chrome"
    else if ((verOffset=nAgt.indexOf("Chrome")) !== -1) {
        browserName = "Chrome";
        fullVersion = nAgt.substring(verOffset+7);
    }
    // In Safari, the true version is after "Safari" or after "Version"
    else if ((verOffset=nAgt.indexOf("Safari")) !== -1) {
        browserName = "Safari";
        fullVersion = nAgt.substring(verOffset+7);

        if ((verOffset=nAgt.indexOf("Version")) !== -1)
            fullVersion = nAgt.substring(verOffset+8);
    }
    // In Firefox, the true version is after "Firefox"
    else if ((verOffset=nAgt.indexOf("Firefox")) !== -1) {
        browserName = "Firefox";
        fullVersion = nAgt.substring(verOffset+8);
    }
    // In most other browsers, "name/version" is at the end of userAgent
    else if ((nameOffset=nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/')))
    {
        browserName = nAgt.substring(nameOffset,verOffset);
        fullVersion = nAgt.substring(verOffset + 1);

        if (browserName.toLowerCase() === browserName.toUpperCase()) {
            browserName = navigator.appName;
        }
    }
    // trim the fullVersion string at semicolon/space if present
    if ((ix=fullVersion.indexOf(";")) !== -1)
        fullVersion=fullVersion.substring(0,ix);
    if ((ix=fullVersion.indexOf(" ")) !== -1)
        fullVersion=fullVersion.substring(0,ix);

    majorVersion = parseInt('' + fullVersion,10);
    if (isNaN(majorVersion)) {
        fullVersion  = '' + parseFloat(navigator.appVersion);
        majorVersion = parseInt(navigator.appVersion,10);
    }

    return {
        osName,
        browserName,
        fullVersion,
        majorVersion,
        appName: navigator.appName,
        userAgent: navigator.userAgent
    }
}


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
 * Clears the browser storage items created.
 */
function clearStorage() {
    localStorage.removeItem('className');
    localStorage.removeItem('pagerClass');
    localStorage.removeItem('pagerId');
    localStorage.removeItem('annotations');
    localStorage.removeItem('totalPages');
    localStorage.removeItem('data');
    localStorage.removeItem('currentPage');
    localStorage.removeItem('nextUrl');
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

    for (let elem of document.getElementsByClassName(className)) {
        if (elem.classList.contains(MOUSE_SELECTED_CLASSNAME)) {
            continue;
        }

        elem.classList.add(MOUSE_SELECTED_CLASSNAME);
    }

    localStorage.setItem('className', className);
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
    clearStorage();

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
        clearStorage();
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


function selectPagerElement(elem, first) {
    const pagerId = elem.id;
    let pagerClass = elem.className;

    pagerClass = pagerClass
        .replace(MOUSE_HOVERED_CLASSNAME, '')
        .replace(MOUSE_SELECTED_CLASSNAME, '')

    if (pagerId === '' && pagerClass === '' && first)
    {
        if (elem.parentElement && (elem.parentElement.id !== '' || elem.parentElement.className !== '')) {
            selectPagerElement(elem.parentElement, false);
            return;
        } else if (elem.childNodes.length > 0 && (elem.childNodes[0].id !== '' || elem.childNodes[0].className !== '')) {
            selectPagerElement(elem.childNodes[0], false);
            return;
        }
    } else if (pagerId === '' && pagerClass === '' && !first) {
        alert('The pager has no discernible ID or Class names. You will have do to each page manually.')
    }

    pagerElement = elem;
    step = STEP_CONFIRM;

    localStorage.setItem('pagerId', pagerId);
    localStorage.setItem('pagerClass', pagerClass);

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


function getNextPageURL() {
    if (!start) return;

    const totalPages = parseInt(localStorage.getItem('totalPages'));
    let currentPage = localStorage.getItem('currentPage');
    let next = false;

    if (!currentPage) {
        currentPage = 1;
    } else {
        currentPage = parseInt(currentPage);
    }

    if (currentPage > totalPages) {
        return null;
    }

    if (pagerElement === null) {
        return null;
    }

    for (let elem of pagerElement.getElementsByTagName('a')) {
        const page = parseInt(elem.innerText.trim());

        if (page > currentPage) {
            next = true;
        }

        if (next) {
            localStorage.setItem('currentPage', page);
            return elem.getAttribute('href');
        }
    }

    return null;
}


function getData() {
    if (!start) return;

    let data = localStorage.getItem('data');

    if (data === null) {
        data = {
            date: new Date().toISOString(),
            url: window.location.href,
            searchTerm: searchString,
            environment: getEnvironment(),
            data: []
        };
    } else {
        data = JSON.parse(data);
    }

    const elements = document.getElementsByClassName(MOUSE_SELECTED_CLASSNAME);
    const newData = Array.prototype.map.call(elements, function(element) {
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

    data.data.push(...newData);
    const nextUrl = getNextPageURL();

    if (nextUrl !== null && nextUrl !== undefined) {
        localStorage.setItem('data', JSON.stringify(data));
        localStorage.setItem('nextUrl', nextUrl);
        window.location.href = nextUrl;
    } else {
        chrome.runtime.sendMessage({
            type: 'STEP_NEXT'
        });
    }
}


function checkContinue() {
    const nextUrl = localStorage.getItem('nextUrl');
    const className = localStorage.getItem('className');
    const pagerId = localStorage.getItem('pagerId');
    const pagerClass = localStorage.getItem('pagerClass');
    const currentUrl = window.location.pathname + window.location.search;

    if (nextUrl === currentUrl) {
        start = true;
        step = STEP_GETTING_DATA;

        // Annotations
        annotations = JSON.parse(localStorage.getItem('annotations'));

        // Select items from the results list.
        for (let elem of document.getElementsByClassName(className)) {
            if (elem.classList.contains(MOUSE_SELECTED_CLASSNAME)) {
                continue;
            }

            elem.classList.add(MOUSE_SELECTED_CLASSNAME);
        }

        // Select the pager element.
        if (pagerId !== '') {
            pagerElement = document.getElementById(pagerId);
        } else if (pagerClass !== '') {
            pagerElement = document.getElementsByClassName(pagerClass);

            if (pagerElement.length > 0) {
                pagerElement = pagerElement[0];
            }
        }

        showUI();

        chrome.runtime.sendMessage({
            type: 'SET_STEP',
            step: step
        });

        getData();
    }
}


function createFiles(data) {
    let csvData = '';

    annotations.forEach(function (annotation) {
        csvData += '"' + annotation['title'] + '",'
    });

    csvData += '\r\n';

    data.data.forEach(function (data) {
        annotations.forEach(function (annotation) {
            let item = data[annotation['title']]

            if (!item) {
                item = ''
            } else {
                item = item.replace(/\r?\n|\r/g, ' ')
            }

            csvData += '"' + item + '",'
        });
        csvData += '\r\n';
    });

    const utc = new Date().toJSON().slice(0,10).replace(/-/g,'/');
    const blob = new Blob([csvData], {type: 'text/plain;charset=utf-8'});
    saveAs(blob, 'grey_lit_recorder_session_' + utc + '.csv');

    hideVeil();
    hideUI();
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
        clearStorage();

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
        selectPagerElement(e.target, true);
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
        localStorage.setItem('annotations', JSON.stringify(annotations));
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

        case 'STEP_GET_DATA':
            localStorage.setItem('totalPages', request.totalPages);
            getData();
            break;

        case 'RECORDING_CONTINUE':
            checkContinue();
            break;

        case 'STEP_SAVE':
            createFiles()
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
