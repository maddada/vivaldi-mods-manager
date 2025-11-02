(function () {
    ("use strict");

    // These shouldn't be changed unless you know what you're doing:
    const config = {
        expandDelay: 0, // time to wait before expanding the panel when mouse enters
        collapseDelay: 0, // time to wait before collapsing the panel when mouse leaves
    };

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
    let noActiveButtonObserver = null;

    // === INITIALIZATION ===
    function init() {
        console.log("[init] Interval check running");

        panelsContainer = document.getElementById("panels-container");
        toggleButton = document.querySelector(".mainbar .button-toolbar.toolbar-spacer-panel button, .mainbar .button-toolbar.toolbar-spacer button");

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
        setupNoActiveButtonObserver();
        setupToolbarClickListener();

        return true;
    }

    function isAlreadyInitialized() {
        return panelsContainer.getAttribute("data-mod-applied") === "true" && toggleButton?.getAttribute("data-mod-applied") === "true";
    }

    function markAsInitialized() {
        panelsContainer.setAttribute("data-mod-applied", "true");
        applyPersistentButtonStyles();
    }

    function applyPersistentButtonStyles() {
        // Add persistent styles for button that work in both PINNED and OVERLAY modes
        const existingStyle = document.getElementById("vivaldi-toggle-button-persistent-styles");
        if (existingStyle) return;

        const styleElement = document.createElement("style");
        styleElement.id = "vivaldi-toggle-button-persistent-styles";
        styleElement.textContent = `
            .button-toolbar.toolbar-spacer-panel button[data-mod-applied="true"] {
                flex-basis: auto !important;
            }

            .mainbar .button-toolbar.toolbar-spacer-panel button[data-mod-applied="true"],
            .mainbar .button-toolbar.toolbar-spacer button[data-mod-applied="true"] {
                pointer-events: auto !important;
                width: 34px !important;
                min-width: 34px !important;
                max-width: 34px !important;
            }
            .mainbar .button-toolbar.toolbar-spacer-panel button[data-mod-applied="true"] .button-icon,
            .mainbar .button-toolbar.toolbar-spacer button[data-mod-applied="true"] .button-icon {
                display: flex !important;
                pointer-events: none !important;
            }
            /* Prevent transparent background override on hover */
            #app .toolbar .toolbar-spacer-panel > button[data-mod-applied="true"]:hover,
            #app .toolbar .toolbar-spacer > button[data-mod-applied="true"]:hover {
                color: var(--colorFg);
                background-color: var(--colorBgDark) !important;
            }

            #switch {
                transition: opacity 0.3s ease-in-out !important;
            }
        `;
        document.head.appendChild(styleElement);
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
                applyStyles();
                addEventListeners();
                addIconToToggleButton("▶︎");
                console.log("[setState] Set state to OVERLAY");
                break;
        }
    }

    // === STYLES ===
    function applyStyles() {
        removeStyles();

        const styleElement = document.createElement("link");
        styleElement.id = "vivaldi-sidebar-styles";
        styleElement.rel = "stylesheet";
        styleElement.href = "./sharptabs-panel-mod.css";
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
            console.log(`[handleMouseLeave] Collapsing panel after ${config.collapseDelay}ms delay`);
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
            toggleButton = document.querySelector(".mainbar .button-toolbar.toolbar-spacer-panel button, .mainbar .button-toolbar.toolbar-spacer button");
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

    function validateAndFixButton() {
        if (!toggleButton) {
            console.log("[validateAndFixButton] Toggle button not found, skipping validation");
            return;
        }

        // Check if button is disabled or missing required attributes
        const isDisabled = toggleButton.disabled;
        const hasModApplied = toggleButton.getAttribute("data-mod-applied") === "true";
        const hasIcon = toggleButton.querySelector(".button-icon");

        if (isDisabled || !hasModApplied || !hasIcon) {
            console.log("[validateAndFixButton] Button state broken, reinitializing. Disabled:", isDisabled, "HasModApplied:", hasModApplied, "HasIcon:", hasIcon);

            // Re-apply the icon based on current state
            const icon = currentState === SIDEPANEL_STATES.PINNED ? "⏺︎" : "▶︎";
            addIconToToggleButton(icon);
        }
    }

    function addIconToToggleButton(iconType, dataModValue = "true") {
        if (!toggleButton) return;

        // Enable the button (remove disabled attribute)
        toggleButton.disabled = false;

        // Create SVG based on icon type
        const svgHTML =
            iconType === "⏺︎"
                ? `<svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                 <circle cx="13" cy="13" r="3.5" fill="currentColor"/>
               </svg>`
                : `<svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                 <path d="M10 8l6 5-6 5V8z" fill="currentColor"/>
               </svg>`;

        const buttonIconSpan = document.createElement("span");
        buttonIconSpan.className = "button-icon";
        buttonIconSpan.setAttribute("aria-hidden", "true");
        buttonIconSpan.style.cssText = "display: flex !important; pointer-events: none !important;";
        buttonIconSpan.innerHTML = svgHTML;

        toggleButton.style = "-webkit-app-region: no-drag !important; cursor: pointer !important; pointer-events: auto !important;";
        toggleButton.innerHTML = "";
        toggleButton.appendChild(buttonIconSpan);
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

    function setupNoActiveButtonObserver() {
        const toolbarElement = document.querySelector("#panels > #switch > div.toolbar");

        if (!toolbarElement) {
            console.log("[setupNoActiveButtonObserver] Toolbar element not found");
            return;
        }

        noActiveButtonObserver = new MutationObserver(() => {
            // Check if there are no active buttons
            const hasActiveButton = toolbarElement.querySelector(".button-toolbar.active");

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
            attributeFilter: ["class"],
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

        if (currentPanelContainerWidth === "0px") {
            console.log("[reactToPanelContainerWidthModification] Width is 0px (entering fullscreen), saving state");

            // If previousState exists, it means the observer just saved the state before switching to PINNED
            // Use that as the state to restore when exiting fullscreen
            stateBeforePanelContainerModification = previousState || currentState;
            console.log("[reactToPanelContainerWidthModification] Saved state:", stateBeforePanelContainerModification);

            setState(SIDEPANEL_STATES.PINNED);
        } else if (firstInit) {
            firstInit = false;
            // Width is not 0px - initialize to overlay state
            console.log("[reactToPanelContainerWidthModification] Initial width is not 0px, setting to overlay");
            setState(stateBeforePanelContainerModification || SIDEPANEL_STATES.OVERLAY);
        } else {
            console.log("[reactToPanelContainerWidthModification] Width changed (exiting fullscreen), restoring state:", stateBeforePanelContainerModification);
            setState(stateBeforePanelContainerModification);

            // Clear previousState to avoid conflicts with button click logic
            previousState = null;
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
                validateAndFixButton();
            }, 5000);
        }
    }

    // === SCRIPT ENTRY POINT ===
    console.log("[SCRIPT START] Vivaldi Sidebar Manager starting execution. Looking for panels-container to initialize styles on it.");
    initInterval = setInterval(initializeManager, 800);
})();

function dedent(css) {
    return css.replace(/^ {4}/gm, "");
}
