(function () {
    "use strict";

    // Settings that you can configure
    const userConfig = {
        expandDelay: 0, // time to wait before expanding the panel when mouse enters
        collapseDelay: 0, // time to wait before collapsing the panel when mouse leaves
        transitionAnimation: "0.2s ease-in-out", // animation speed for the panel
    };

    // These shouldn't be changed unless you know what you're doing:
    const config = {
        ...userConfig,
        reinitInterval: 5000,
        initCheckInterval: 800,
        minimizedWidth: "76px",
        expandedWidth: "260px",
        fullWidth: "300px",
    };

    function isBookmarksBarEnabled() {
        return document.querySelector("#main > div.bookmark-bar.default") !== null;
    }

    function calculateHeight() {
        return `calc(100vh - 83px ${!isBookmarksBarEnabled() ? "+ 29px" : ""})`;
    }

    // State constants
    const SIDEPANEL_STATES = {
        PINNED: "pinned",
        OVERLAY: "overlay",
    };

    let firstInit = true;

    // Sidepanel state management
    let currentState = SIDEPANEL_STATES.OVERLAY;
    let previousState = null;
    let transitionGracePeriod = false;

    let buttonClicked = false;
    let alreadyRanReactToPanelContainerWidthModification = false;

    // Panel Container state management
    let stateBeforePanelContainerModification = null;

    // Timeouts
    let expandTimeout = null;
    let collapseTimeout = null;

    // DOM elements
    let panelsContainer = null;
    let toggleButton = null;

    // Observers
    let buttonObserver = null;
    let toggleObserver = null;
    let panelObserver = null;
    let bookmarksObserver = null;
    let noActiveButtonObserver = null;

    // === INITIALIZATION ===
    function init() {
        console.log("[init] Interval check running");

        panelsContainer = document.getElementById("panels-container");
        toggleButton = document.querySelector("#panels #switch div.button-toolbar.toolbar-spacer-flexible");

        if (!panelsContainer) {
            return false;
        }

        if (isAlreadyInitialized()) {
            console.log("[init] Already loaded, skipping initialization");
            return true;
        }

        console.log("[init] Found panels-container, initializing");
        reactToPanelContainerWidthModification();
        markAsInitialized();
        setupToggleButton();
        setupPanelWidthObserver();
        setupBookmarksBarObserver();
        setupNoActiveButtonObserver();
        setupToolbarClickListener();

        return true;
    }

    function isAlreadyInitialized() {
        return panelsContainer.getAttribute("data-mod-applied") === "true" && toggleButton?.getAttribute("data-mod-applied") === "true";
    }

    function markAsInitialized() {
        panelsContainer.setAttribute("data-mod-applied", "true");
    }

    // === STATE MANAGEMENT ===
    function setState(newState) {
        const wasPinned = currentState === SIDEPANEL_STATES.PINNED;
        const becomingOverlay = newState === SIDEPANEL_STATES.OVERLAY;

        // Set grace period when transitioning from PINNED to OVERLAY
        if (wasPinned && becomingOverlay) {
            transitionGracePeriod = true;
            console.log("[setState] Enabling transition grace period");
        }

        currentState = newState;

        switch (newState) {
            case SIDEPANEL_STATES.PINNED:
                removeEventListeners();
                removeStyles();
                panelsContainer.classList.remove("panel-expanded");
                addIconToToggleButton("⏺︎");
                console.log("[setState] Set state to PINNED");
                break;

            case SIDEPANEL_STATES.OVERLAY:
                applyStyles(config.minimizedWidth);
                addEventListeners();
                addIconToToggleButton("▶︎");
                console.log("[setState] Set state to OVERLAY");
                break;
        }
    }

    // === STYLES ===
    function applyStyles(sidebarWidth) {
        console.log("[applyStyles] Applying styles with width:", sidebarWidth);

        removeStyles();

        const styles = dedent(
            /*CSS*/ `
            :root {
                --width-1: ${config.fullWidth};
                --width-minimized: ${sidebarWidth};
                --width-hovered: ${config.expandedWidth};
            }
            #panels-container.panel-expanded {
                width: var(--width-1) !important;
            }
            #webview-container {
                padding-left: 43px !important;
            }
            #panels-container:not(.panel-expanded) {
                width: var(--width-minimized) !important;
            }
            #panels-container {
                position: absolute !important;
                height: ${calculateHeight()} !important;
                transition: width ${config.transitionAnimation} !important;
                will-change: width;
            }
            .panel-collapse-guard {
                min-width: var(--width-minimized) !important;
                max-width: var(--width-hovered) !important;
            }
            #panels-container.panel-expanded {
                width: var(--width-hovered) !important;
            }

        ` + window.vivazenStyles
        );

        const styleElement = document.createElement("style");
        styleElement.id = "vivaldi-sidebar-styles";
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);

        console.log("[applyStyles] Styles applied successfully");
    }

    function removeStyles() {
        const existingStyle = document.getElementById("vivaldi-sidebar-styles");
        if (existingStyle) existingStyle.remove();
    }

    // === EVENT LISTENERS ===
    function addEventListeners() {
        console.log("[addEventListeners] Adding event listeners");
        panelsContainer.addEventListener("mouseenter", handleMouseEnter);
        panelsContainer.addEventListener("mouseleave", handleMouseLeave);
        console.log("[addEventListeners] Event listeners added");
    }

    function removeEventListeners() {
        console.log("[removeEventListeners] Removing event listeners");
        panelsContainer.removeEventListener("mouseenter", handleMouseEnter);
        panelsContainer.removeEventListener("mouseleave", handleMouseLeave);
        console.log("[removeEventListeners] Event listeners removed");
    }

    // === MOUSE EVENTS ===
    function handleMouseEnter() {
        console.log("[handleMouseEnter] Mouse enter event triggered, current state:", currentState, "grace period:", transitionGracePeriod);
        if (currentState === SIDEPANEL_STATES.PINNED) return;

        // Skip expansion during grace period
        if (transitionGracePeriod) {
            console.log("[handleMouseEnter] Skipping due to transition grace period");
            return;
        }

        clearTimeoutByType("collapse");

        if (!getActiveSharpTabsButton()) {
            console.log("[handleMouseEnter] No active button found, skipping expansion");
            return;
        }

        if (panelsContainer.classList.contains("panel-expanded")) {
            console.log("[handleMouseEnter] Panel already expanded, skipping timeout");
            return;
        }

        expandTimeout = setTimeout(() => {
            console.log("[handleMouseEnter] Expanding panel after 20ms delay");
            panelsContainer.classList.add("panel-expanded");
            expandTimeout = null;
        }, config.expandDelay);
    }

    function handleMouseLeave() {
        console.log("[handleMouseLeave] Mouse leave event triggered, current state:", currentState);
        if (currentState === SIDEPANEL_STATES.PINNED) return;

        // Clear grace period when mouse leaves
        if (transitionGracePeriod) {
            transitionGracePeriod = false;
            console.log("[handleMouseLeave] Transition grace period cleared");
        }

        clearTimeoutByType("expand");

        collapseTimeout = setTimeout(() => {
            console.log("[handleMouseLeave] Collapsing panel after 200ms delay");
            panelsContainer.classList.remove("panel-expanded");
            collapseTimeout = null;
        }, config.collapseDelay);
    }

    function clearTimeoutByType(type) {
        if (type === "expand" && expandTimeout) {
            clearTimeout(expandTimeout);
            expandTimeout = null;
            console.log("[clearTimeoutByType] Cleared expand timeout");
        }
        if (type === "collapse" && collapseTimeout) {
            clearTimeout(collapseTimeout);
            collapseTimeout = null;
            console.log("[clearTimeoutByType] Cleared collapse timeout");
        }
    }

    // === TOGGLE BUTTON ===
    function setupToggleButton() {
        if (toggleButton) {
            attachToggleListeners();
            return;
        }

        waitForToggleElement();
    }

    function waitForToggleElement() {
        console.log("[waitForToggleElement] Setting up mutation observer for toggle button");

        toggleObserver = new MutationObserver((mutations, obs) => {
            toggleButton = document.querySelector("#panels #switch div.button-toolbar.toolbar-spacer-flexible");
            console.log("[waitForToggleElement] Checking for toggle button:", toggleButton);

            if (toggleButton) {
                console.log("[waitForToggleElement] Toggle button found, adding click listeners");
                attachToggleListeners();
                obs.disconnect();
                console.log("[waitForToggleElement] Toggle button found and click listeners attached");
            }
        });

        toggleObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });

        console.log("[waitForToggleElement] Mutation observer started");
    }

    function attachToggleListeners() {
        toggleButton.addEventListener("click", (e) => {
            console.log("[attachToggleListeners] Toggle button clicked");
            e.preventDefault();

            console.log("[handleLeftClick] Left click - current state:", currentState);

            // temp fix for bug
            if (!currentState) currentState = SIDEPANEL_STATES.PINNED;

            // Toggle between PINNED and OVERLAY
            const transitions = {
                [SIDEPANEL_STATES.PINNED]: SIDEPANEL_STATES.OVERLAY,
                [SIDEPANEL_STATES.OVERLAY]: SIDEPANEL_STATES.PINNED,
            };

            const nextState = transitions[currentState];

            // Only allow transitioning to OVERLAY if Sharp Tabs is active
            if (nextState === SIDEPANEL_STATES.OVERLAY && !getActiveSharpTabsButton()) {
                console.log("[handleLeftClick] Cannot transition to OVERLAY - no active Sharp Tabs button");
                return;
            }

            if (nextState === SIDEPANEL_STATES.PINNED) {
                console.log("[handleLeftClick] Setting state to PINNED from handleLeftClick function");
            }
            setState(nextState);
        });
    }

    function addIconToToggleButton(icon, dataModValue = "true") {
        if (!toggleButton) return;

        const svgContainer = document.createElement("div");
        svgContainer.style.cssText = "display: flex; flex-direction: column; align-items: center; height: 100%;";

        const svgElement = document.createElement("div");
        svgElement.innerHTML = icon;
        svgElement.style.cssText = "margin-top: 0; margin-bottom: auto;";

        svgContainer.appendChild(svgElement);
        toggleButton.style = "padding-top: 5px;";
        toggleButton.innerHTML = "";
        toggleButton.appendChild(svgContainer);
        toggleButton.setAttribute("data-mod-applied", dataModValue);
    }

    function setupPanelWidthObserver() {
        console.log("[setupPanelWidthObserver] Setting up panel width observer");

        // Create observer to watch for style changes on panels-container
        panelObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                console.log("[setupPanelWidthObserver] Panel element changed, mutation details:", mutation);
                if (mutation.type === "attributes" && mutation.attributeName === "style") {
                    setTimeout(() => {
                        if (!alreadyRanReactToPanelContainerWidthModification) {
                            reactToPanelContainerWidthModification();
                            alreadyRanReactToPanelContainerWidthModification = true;
                            setTimeout(() => {
                                alreadyRanReactToPanelContainerWidthModification = false;
                            }, 100);
                        }
                    }, 50);
                }
            });
        });

        // Start observing
        panelObserver.observe(panelsContainer, {
            attributes: true,
            attributeFilter: ["style"],
        });

        console.log("[setupPanelWidthObserver] Panel width observer started");
    }

    function setupBookmarksBarObserver() {
        console.log("[setupBookmarksBarObserver] Setting up bookmarks bar observer");

        let previousBookmarksBarState = isBookmarksBarEnabled();

        // Create observer to watch for DOM changes that might affect bookmarks bar
        bookmarksObserver = new MutationObserver((mutations) => {
            const currentBookmarksBarState = isBookmarksBarEnabled();

            if (currentBookmarksBarState !== previousBookmarksBarState) {
                console.log("[setupBookmarksBarObserver] Bookmarks bar state changed from", previousBookmarksBarState, "to", currentBookmarksBarState);
                previousBookmarksBarState = currentBookmarksBarState;

                // Re-apply styles with new height calculation if not in PINNED state
                if (currentState !== SIDEPANEL_STATES.PINNED) {
                    console.log("[setupBookmarksBarObserver] Re-applying styles due to bookmarks bar change");
                    applyStyles(config.minimizedWidth);
                }
            }
        });

        // Start observing the main container for changes
        const mainContainer = document.querySelector("#main");
        if (mainContainer) {
            bookmarksObserver.observe(mainContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["class", "style"],
            });
            console.log("[setupBookmarksBarObserver] Bookmarks bar observer started");
        } else {
            console.log("[setupBookmarksBarObserver] Main container not found, observer not started");
        }
    }

    function setupNoActiveButtonObserver() {
        const toolbarElement = document.querySelector("#panels > #switch > div.toolbar");

        if (!toolbarElement) {
            console.log("[setupNoActiveButtonObserver] Toolbar element not found");
            return;
        }

        noActiveButtonObserver = new MutationObserver(() => {
            // Check if there are no active buttons
            const hasActiveButton = toolbarElement.querySelector('.button-toolbar.active');

            if (!hasActiveButton && currentState === SIDEPANEL_STATES.OVERLAY) {
                console.log("[setupNoActiveButtonObserver] No active buttons detected while in OVERLAY mode, switching to PINNED");

                // Save current state (same pattern as non-Sharp Tabs button click at line 453)
                if (!previousState) {
                    previousState = currentState;
                }
                setState(SIDEPANEL_STATES.PINNED);
            }
        });

        noActiveButtonObserver.observe(toolbarElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        });

        console.log("[setupNoActiveButtonObserver] No active button observer started");
    }

    // === TOOLBAR CLICK LISTENER ===
    function setupToolbarClickListener() {
        const toolbarElement = document.querySelector("#panels > #switch > div.toolbar");

        if (!toolbarElement) {
            console.log("[setupToolbarClickListener] Toolbar element not found");
            return;
        }

        toolbarElement.addEventListener("click", (event) => {
            buttonClicked = true;
            setTimeout(() => {
                buttonClicked = false;
            }, 100);

            // Check if the clicked element is a button or inside a button
            const clickedButton = event.target.closest("button");

            if (clickedButton) {
                console.log("[Toolbar Click] Button clicked:", {
                    element: clickedButton,
                    name: clickedButton.name || "no name",
                    ariaLabel: clickedButton.getAttribute("aria-label") || "no aria-label",
                    title: clickedButton.title || "no title",
                    id: clickedButton.id || "no id",
                    className: clickedButton.className || "no classes",
                });

                if (isSharpTabsButton(clickedButton)) {
                    console.log("[Toolbar Click] Sharp Tabs button clicked");
                    if (getActiveSharpTabsButton()) {
                        console.log("[Toolbar Click] Sharp Tabs button clicked and active");
                        setState(previousState || SIDEPANEL_STATES.PINNED);
                        previousState = null;
                    } else {
                        console.log("[Toolbar Click] Sharp Tabs button clicked and inactive");
                        const currentPanelContainerWidth = getCurrentPanelContainerWidth();
                        if (currentPanelContainerWidth === "35px") {
                            // Sharp Tabs Closed so just do pinned and save prev
                            previousState = currentState;
                            setState(SIDEPANEL_STATES.PINNED);
                        } else {
                            setState(previousState);
                            previousState = null;
                        }
                    }
                } else {
                    console.log("[Toolbar Click] Non-Sharp Tabs button clicked");

                    if (!previousState) previousState = currentState;
                    setState(SIDEPANEL_STATES.PINNED);
                }
            } else {
                console.log("[Toolbar Click] Non-button element clicked:", event.target);
            }
        });

        console.log("[setupToolbarClickListener] Toolbar click listener attached");
    }

    // === UTILITY METHODS ===
    function getCurrentPanelContainerWidth() {
        const style = panelsContainer.getAttribute("style") || "";
        const match = style.match(/width:\s*(\d+(?:\.\d+)?px)/);
        return match ? match[1] : null;
    }

    function isSharpTabsButton(button) {
        return button.getAttribute("aria-label").startsWith("Sharp Tabs") || button.getAttribute("aria-label").includes("/sb.html");
    }

    function getActiveSharpTabsButton() {
        return document.querySelector('.button-toolbar.active > button[aria-label^="Sharp Tabs"], .button-toolbar.active > button[aria-label*="/sb.html"]');
    }

    function reactToPanelContainerWidthModification() {
        if (buttonClicked) {
            console.log("[reactToPanelContainerWidthModification] Button clicked, skipping width modification");
            return;
        }

        // Check if user is manually resizing the panel
        const isManuallyResizing = panelsContainer.classList.contains("resizing");

        if (isManuallyResizing && currentState === SIDEPANEL_STATES.PINNED) {
            console.log("[reactToPanelContainerWidthModification] Manual resizing detected in pinned mode, maintaining current state");
            return;
        }

        // Check current width of panels-container to determine initial state
        const currentPanelContainerWidth = getCurrentPanelContainerWidth();

        console.log("[reactToPanelContainerWidthModification] Panel container width changed to:", currentPanelContainerWidth);

        stateBeforePanelContainerModification = currentState;

        if (currentPanelContainerWidth === "0px") {
            console.log("[reactToPanelContainerWidthModification] Initial width is 0px, setting to pinned with overlay saved");

            setState(SIDEPANEL_STATES.PINNED);
        } else if (firstInit) {
            firstInit = false;
            // Width is not 0px - initialize to overlay state
            console.log("[reactToPanelContainerWidthModification] Initial width is not 0px, setting to overlay");
            setState(stateBeforePanelContainerModification || SIDEPANEL_STATES.OVERLAY);
        } else {
            console.log("[reactToPanelContainerWidthModification] Initial width is not 0px, setting to pinned");
            setState(stateBeforePanelContainerModification);
        }
    }

    // === CLEANUP ===
    function destroy() {
        // Clear timeouts
        clearTimeoutByType("expand");
        clearTimeoutByType("collapse");

        // Remove event listeners
        removeEventListeners();

        // Disconnect observers
        if (buttonObserver) {
            buttonObserver.disconnect();
        }
        if (toggleObserver) {
            toggleObserver.disconnect();
        }
        if (panelObserver) {
            panelObserver.disconnect();
        }
        if (bookmarksObserver) {
            bookmarksObserver.disconnect();
        }
        if (noActiveButtonObserver) {
            noActiveButtonObserver.disconnect();
        }

        // Remove styles
        removeStyles();

        console.log("[destroy] Sidebar manager destroyed");
    }

    // === INITIALIZATION AND MANAGEMENT ===
    let initInterval;

    function initializeManager() {
        console.log("[initializeManager] Attempting to initialize manager");

        if (init()) {
            console.log("[initializeManager] Manager initialized successfully, clearing init interval");
            clearInterval(initInterval);

            // Set up periodic reinitialization check to handle sidepanel
            setInterval(() => {
                init();
            }, config.reinitInterval);
        }
    }

    // === SCRIPT ENTRY POINT ===
    console.log("[SCRIPT START] Vivaldi Sidebar Manager starting execution. Looking for panels-container to initialize styles on it.");
    initInterval = setInterval(initializeManager, config.initCheckInterval);
})();

function dedent(css) {
    return css.replace(/^ {4}/gm, "");
}
