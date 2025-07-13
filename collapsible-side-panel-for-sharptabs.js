let intervalId;
let expandTimeout;
let collapseTimeout;

const sidebarStyles = `
    :root {
        --width-1: 300px;
        --width-minimized: {currentSidebarWidth};
        --width-hovered: 260px;
    }
    #panels-container.panel-expanded {
        width: var(--width-1) !important;
    }
    #webview-container {
        padding-left: var(--width-minimized) !important;
    }
    #panels-container:not(.panel-expanded) {
        width: var(--width-minimized) !important;
    }
    #panels-container {
        position: absolute !important;
        height: calc(100vh - 83px) !important;
        transition: width 0.1s ease-in-out !important;
    }
    .panel-collapse-guard {
        min-width: var(--width-minimized) !important;
        max-width: var(--width-hovered) !important;
    }
    #panels-container.panel-expanded {
        width: var(--width-hovered) !important;
    }
`;

// State management
const STATES = {
    PINNED: "pinned",
    OVERLAY: "overlay",
    HIDDEN: "hidden",
};

let currentState = STATES.OVERLAY;

function addIconToSidebarButton(iconSVG, dataModValue = "true") {
    const toggleButton = document.querySelector("#panels #switch div.button-toolbar.toolbar-spacer-flexible");
    const svgContainer = document.createElement("div");
    svgContainer.style.cssText = "display: flex; flex-direction: column; align-items: center; height: 100%;";
    const svgElement = document.createElement("div");
    svgElement.innerHTML = iconSVG;
    svgElement.style.cssText = "margin-top: 0; margin-bottom: auto;";
    svgContainer.appendChild(svgElement);
    toggleButton.style = "padding-top: 5px;";
    toggleButton.innerHTML = "";
    toggleButton.appendChild(svgContainer);
    toggleButton.setAttribute("data-mod-applied", dataModValue);
}

function setState(newState, applyStyles, addEventListeners, removeEventListeners, panelsContainer, hiddenSidebarWidth, iconSidebarWidth) {
    console.log("Setting state to:", newState);
    currentState = newState;

    const pinIcon = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="16" height="16" viewBox="27 27 200 200" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path style="opacity:0.973" fill="#fefffe" d="M 146.5,27.5 C 149.425,27.4598 152.091,28.2932 154.5,30C 178,53.5 201.5,77 225,100.5C 227.814,105.006 228.147,109.673 226,114.5C 217.167,123.333 208.333,132.167 199.5,141C 196.2,142.879 192.866,142.879 189.5,141C 187.65,138.982 185.65,137.149 183.5,135.5C 175.848,142.652 168.348,149.985 161,157.5C 161.728,165.782 162.228,174.116 162.5,182.5C 163.771,197.609 159.438,210.776 149.5,222C 145.634,224.12 141.967,223.786 138.5,221C 123.333,205.833 108.167,190.667 93,175.5C 76.1667,192.333 59.3333,209.167 42.5,226C 31.5126,229.343 27.3459,225.509 30,214.5C 47.014,197.653 63.8473,180.653 80.5,163.5C 65.5141,148.014 50.3474,132.681 35,117.5C 33.5432,114.634 33.2099,111.634 34,108.5C 40.8615,100.985 49.3615,96.485 59.5,95C 64.3258,94.4268 69.1592,93.9268 74,93.5C 82.2397,94.2405 90.4064,95.0738 98.5,96C 106.167,88.3333 113.833,80.6667 121.5,73C 118.96,70.7953 116.793,68.2953 115,65.5C 114.21,62.366 114.543,59.366 116,56.5C 125.784,46.211 135.95,36.5443 146.5,27.5 Z"/></g></svg>`;

    switch (newState) {
        case STATES.PINNED:
            // Disable hover functionality
            removeEventListeners();
            const styleElement = document.getElementById("vivaldi-sidebar-styles");
            if (styleElement) styleElement.remove();
            panelsContainer.classList.remove("panel-expanded");
            addIconToSidebarButton(pinIcon);
            console.log("State: PINNED");
            break;

        case STATES.OVERLAY:
            // Enable hover with overlay width
            applyStyles(iconSidebarWidth);
            addEventListeners();
            addIconToSidebarButton(`▶︎`);
            console.log("State: OVERLAY");
            break;

        case STATES.HIDDEN:
            // Enable hover with hidden width
            applyStyles(hiddenSidebarWidth);
            addEventListeners();
            addIconToSidebarButton(`◁`);
            console.log("State: HIDDEN");
            break;
    }
}

function handleLeftClick(setState, applyStyles, addEventListeners, removeEventListeners, panelsContainer, hiddenSidebarWidth, iconSidebarWidth) {
    console.log("Left click - current state:", currentState);

    if (currentState === STATES.PINNED) {
        setState(STATES.OVERLAY, applyStyles, addEventListeners, removeEventListeners, panelsContainer, hiddenSidebarWidth, iconSidebarWidth);
    } else if (currentState === STATES.OVERLAY) {
        setState(STATES.PINNED, applyStyles, addEventListeners, removeEventListeners, panelsContainer, hiddenSidebarWidth, iconSidebarWidth);
    } else if (currentState === STATES.HIDDEN) {
        // If somehow in hidden state, go to pinned when left clicking
        setState(STATES.PINNED, applyStyles, addEventListeners, removeEventListeners, panelsContainer, hiddenSidebarWidth, iconSidebarWidth);
    }
}

function handleMiddleClick(setState, applyStyles, addEventListeners, removeEventListeners, panelsContainer, hiddenSidebarWidth, iconSidebarWidth) {
    console.log("Middle click - current state:", currentState);

    if (currentState === STATES.PINNED) {
        setState(STATES.HIDDEN, applyStyles, addEventListeners, removeEventListeners, panelsContainer, hiddenSidebarWidth, iconSidebarWidth);
    } else if (currentState === STATES.OVERLAY) {
        setState(STATES.HIDDEN, applyStyles, addEventListeners, removeEventListeners, panelsContainer, hiddenSidebarWidth, iconSidebarWidth);
    } else if (currentState === STATES.HIDDEN) {
        setState(STATES.OVERLAY, applyStyles, addEventListeners, removeEventListeners, panelsContainer, hiddenSidebarWidth, iconSidebarWidth);
    }
}

function handleMouseEnter(panelsContainer) {
    console.log("Mouse enter event triggered, current state:", currentState);
    if (currentState === STATES.PINNED) return;

    // Clear any pending collapse timeout
    if (collapseTimeout) {
        clearTimeout(collapseTimeout);
        collapseTimeout = null;
        console.log("Cleared collapse timeout");
    }

    // Check if there's no active button and click the first webpanel button when hovering over the sidebar
    const activeButton = document.querySelector(".button-toolbar.active");
    if (!activeButton) {
        const firstWebpanelButton = document.querySelector(".button-toolbar.button-toolbar-webpanel");
        if (firstWebpanelButton) {
            console.log("No active button found, clicking first webpanel button");
            firstWebpanelButton.click();
        }
    }

    // If already expanded, don't set a new timeout
    if (panelsContainer.classList.contains("panel-expanded")) {
        console.log("Panel already expanded, skipping timeout");
        return;
    }

    // Set expand timeout
    expandTimeout = setTimeout(() => {
        console.log("Expanding panel after 20ms delay");
        panelsContainer.classList.add("panel-expanded");
        expandTimeout = null;
    }, 20);
}

function handleMouseLeave(panelsContainer) {
    console.log("Mouse leave event triggered, current state:", currentState);
    if (currentState === STATES.PINNED) return;

    // Clear any pending expand timeout
    if (expandTimeout) {
        clearTimeout(expandTimeout);
        expandTimeout = null;
        console.log("Cleared expand timeout");
    }

    // Set collapse timeout
    collapseTimeout = setTimeout(() => {
        console.log("Collapsing panel after 300ms delay");
        panelsContainer.classList.remove("panel-expanded");
        collapseTimeout = null;
    }, 300);
}

function addEventListeners(panelsContainer, handleMouseEnterFn, handleMouseLeaveFn) {
    console.log("Adding event listeners");
    panelsContainer.addEventListener("mouseenter", handleMouseEnterFn);
    panelsContainer.addEventListener("mouseleave", handleMouseLeaveFn);
    console.log("Event listeners added");
}

function removeEventListeners(panelsContainer, handleMouseEnterFn, handleMouseLeaveFn) {
    console.log("Removing event listeners");
    panelsContainer.removeEventListener("mouseenter", handleMouseEnterFn);
    panelsContainer.removeEventListener("mouseleave", handleMouseLeaveFn);
    console.log("Event listeners removed");
}

function waitForToggleElement(handleLeftClickFn, handleMiddleClickFn) {
    console.log("Setting up mutation observer for toggle button");
    const observer = new MutationObserver((mutations, obs) => {
        const toggleButton = document.querySelector("#panels #switch div.button-toolbar.toolbar-spacer-flexible");
        console.log("Checking for toggle button:", toggleButton);
        if (toggleButton) {
            console.log("Toggle button found, adding click listeners");
            toggleButton.addEventListener("click", (e) => {
                console.log("Toggle button clicked");
                handleLeftClickFn();
                e.preventDefault();
            });
            toggleButton.addEventListener("auxclick", (e) => {
                console.log("Toggle button middle click event triggered");
                if (e.button === 1) {
                    handleMiddleClickFn();
                    e.preventDefault();
                }
            });
            obs.disconnect();
            console.log("Toggle button found and click listeners attached");
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
    console.log("Mutation observer started");
}

function initHoverSidebar() {
    let hiddenSidebarWidth = "34px";
    let iconSidebarWidth = "72px";

    console.log("Interval check running");
    const panelsContainer = document.getElementById("panels-container");
    const toggleButton = document.querySelector("#panels #switch div.button-toolbar.toolbar-spacer-flexible");
    console.log("Looking for panels-container:", panelsContainer);

    if (panelsContainer) {
        if (panelsContainer.getAttribute("data-mod-applied") === "true" && toggleButton && toggleButton.getAttribute("data-mod-applied") === "true") {
            console.log("Already loaded, clearing interval");
            clearInterval(intervalId);
            return;
        }

        console.log("Found panels-container, clearing interval");
        clearInterval(intervalId);
        panelsContainer.setAttribute("data-mod-applied", true);

        function applyStyles(currentSidebarWidth) {
            console.log("Applying styles with width:", currentSidebarWidth);
            const existingStyleElement = document.getElementById("vivaldi-sidebar-styles");
            if (existingStyleElement) {
                existingStyleElement.remove();
            }
            const styleElement = document.createElement("style");
            styleElement.id = "vivaldi-sidebar-styles";
            styleElement.textContent = sidebarStyles.replace("{currentSidebarWidth}", currentSidebarWidth);
            document.head.appendChild(styleElement);
            console.log("Styles applied successfully");
        }

        // Create bound functions for event handlers
        const handleMouseEnterFn = () => handleMouseEnter(panelsContainer);
        const handleMouseLeaveFn = () => handleMouseLeave(panelsContainer);

        const addEventListenersFn = () => {
            addEventListeners(panelsContainer, handleMouseEnterFn, handleMouseLeaveFn);
        };

        const removeEventListenersFn = () => {
            removeEventListeners(panelsContainer, handleMouseEnterFn, handleMouseLeaveFn);
        };

        const setStateFn = (newState) => {
            setState(newState, applyStyles, addEventListenersFn, removeEventListenersFn, panelsContainer, hiddenSidebarWidth, iconSidebarWidth);
        };

        const handleLeftClickFn = () => {
            handleLeftClick(setStateFn, applyStyles, addEventListenersFn, removeEventListenersFn, panelsContainer, hiddenSidebarWidth, iconSidebarWidth);
        };

        const handleMiddleClickFn = () => {
            handleMiddleClick(setStateFn, applyStyles, addEventListenersFn, removeEventListenersFn, panelsContainer, hiddenSidebarWidth, iconSidebarWidth);
        };

        // Initial setup - start in overlay state
        console.log("Starting initial setup");
        setStateFn(STATES.OVERLAY);
        waitForToggleElement(handleLeftClickFn, handleMiddleClickFn);
        console.log("Initial setup complete");

        setInterval(initHoverSidebar, 5000);
    }
}

(function () {
    "use strict";
    console.log("Script starting execution");
    intervalId = setInterval(initHoverSidebar, 800);
    console.log("Interval set up to check for panels-container");
})();
