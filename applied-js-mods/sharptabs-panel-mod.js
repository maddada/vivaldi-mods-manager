/* Version v1.2 - 2025-11-23 */
/* 1.2: Fixed full screen youtube videos having a line on the left side of the video */

(function () {
    ("use strict");

    const SIDEPANEL_STATES = {
        INACTIVE: "inactive",
        HOVER: "hover",
        FIXED: "fixed",
    };

    const SELECTORS = {
        PANELS_CONTAINER: "#panels-container",
        // TOGGLE_BUTTON: ".mainbar .button-toolbar.toolbar-spacer-panel button, .mainbar .button-toolbar.toolbar-spacer button",
        TOGGLE_BUTTON: ".mainbar .toolbar-mainbar.toolbar-visible .button-toolbar.toolbar-spacer-panel button, .mainbar .toolbar-mainbar.toolbar-visible .button-toolbar.toolbar-spacer button",
        TOOLBAR: "#panels > #switch > div.toolbar",
        ACTIVE_BUTTON: ".button-toolbar.active",
        SHARP_TABS_BUTTON: '.button-toolbar > button[aria-label^="Sharp Tabs"], .button-toolbar > button[aria-label*="/sb.html"]',
        ACTIVE_SHARP_TABS_BUTTON: '.button-toolbar.active > button[aria-label^="Sharp Tabs"], .button-toolbar.active > button[aria-label*="/sb.html"]',
    };

    const ICONS = {
        INACTIVE: "⏺︎",
        HOVER: "▶︎",
        FIXED: "■",
    };

    const PANEL_WIDTH = {
        CLOSED: "35px",
        COLLAPSED: "0px",
    };

    // These short delays smooth out toolbar "active" flicker and DOM replacement races
    // that can otherwise leave the toggle stuck in a blocked state while Sharp Tabs is open.
    const INTERACTIVITY_RESYNC_DELAY_MS = 120;
    const INACTIVE_CONFIRM_DELAY_MS = 200;

    const log = (context, message, ...args) => {
        // console.log(`[${context}] ${message}`, ...args);
    };

    // === STATE VARIABLES ===
    let currentState = SIDEPANEL_STATES.FIXED;
    let previousState = null;
    let lastActiveMode = SIDEPANEL_STATES.FIXED; // Track last non-inactive mode (Fixed or Hover)
    let stateBeforePanelContainerModification = null;
    let firstInit = true;

    // DOM elements
    let panelsContainer = null;
    let toggleButton = null;
    let toggleButtonId = null; // Track unique identifier for the button element
    let appElement = null;
    // Track last blocked state to avoid resync loops when the toolbar is unstable.
    let wasToggleBlocked = false;

    // Observers
    let toggleObserver = null;
    let toolbarStateObserver = null;

    // Store the current click handler reference for cleanup
    let currentClickHandler = null;

    // Resync timers
    let interactivityResyncTimer = null;
    let inactiveConfirmTimer = null;

    // CSS Classes for modes
    const MODE_CLASSES = {
        [SIDEPANEL_STATES.FIXED]: "sharptabs-fixed-mode",
        [SIDEPANEL_STATES.HOVER]: "sharptabs-hover-mode",
    };

    // === INITIALIZATION ===
    function init() {
        log("init", "Interval check running");

        panelsContainer = document.getElementById("panels-container");
        toggleButton = document.querySelector(SELECTORS.TOGGLE_BUTTON);
        appElement = document.getElementById("app");

        log("init", "Elements found", {
            panelsContainer: !!panelsContainer,
            toggleButton: !!toggleButton,
            appElement: !!appElement,
            toggleButtonSelector: SELECTORS.TOGGLE_BUTTON,
        });

        if (!panelsContainer || !appElement) {
            return false;
        }

        const alreadyInit = isAlreadyInitialized();

        if (alreadyInit) {
            log("init", "Already loaded, but checking toggle button and observer");
            // Even if already initialized, ensure toggle button listener is attached
            setupToggleButton();

            // Also ensure the toolbar state observer is still active
            if (!toolbarStateObserver) {
                log("init", "Observer not found, re-initializing");
                setupToolbarStateObserver();
            }

            return true;
        }

        log("init", "Found panels-container, initializing");
        initializePanel();
        markAsInitialized();
        setupToggleButton();
        setupToolbarStateObserver();
        setupToolbarClickListener();

        return true;
    }

    function isAlreadyInitialized() {
        return panelsContainer.getAttribute("data-mod-applied") === "true" && toggleButton?.getAttribute("data-mod-applied") === "true";
    }

    function markAsInitialized() {
        panelsContainer.setAttribute("data-mod-applied", "true");
        applyPersistentButtonStyles();
        loadModeStyles();
    }

    function applyPersistentButtonStyles() {
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

    function loadModeStyles() {
        const existingStyle = document.getElementById("vivaldi-sharptabs-mode-styles");
        if (existingStyle) {
            log("loadModeStyles", "Styles already loaded");
            return;
        }

        const styleElement = document.createElement("style");
        styleElement.id = "vivaldi-sharptabs-mode-styles";
        styleElement.textContent = MODE_STYLES_CSS;
        document.head.appendChild(styleElement);

        log("loadModeStyles", "Mode styles loaded successfully");
    }

    // === STATE MANAGEMENT ===
    function setState(newState) {
        currentState = newState;

        if (newState === SIDEPANEL_STATES.INACTIVE) {
            destroy();
            panelsContainer.classList.remove("panel-expanded");
            removeModeClasses();
            addIconToToggleButton(ICONS.INACTIVE);
            log("setState", "Set state to INACTIVE");
        } else if (newState === SIDEPANEL_STATES.HOVER) {
            lastActiveMode = SIDEPANEL_STATES.HOVER; // Remember this mode
            setModeClass(SIDEPANEL_STATES.HOVER);
            addIconToToggleButton(ICONS.HOVER);
            log("setState", "Set state to HOVER");
        } else if (newState === SIDEPANEL_STATES.FIXED) {
            lastActiveMode = SIDEPANEL_STATES.FIXED; // Remember this mode
            setModeClass(SIDEPANEL_STATES.FIXED);
            addIconToToggleButton(ICONS.FIXED);
            log("setState", "Set state to FIXED");
        }
    }

    // === STYLES ===
    function setModeClass(mode) {
        if (!appElement) {
            log("setModeClass", "App element not found!");
            return;
        }

        // Remove all mode classes first
        removeModeClasses();

        // Add the new mode class
        const modeClass = MODE_CLASSES[mode];
        if (modeClass) {
            appElement.classList.add(modeClass);
            log("setModeClass", "Mode class applied", { mode, modeClass });
        }
    }

    function removeModeClasses() {
        if (!appElement) return;

        Object.values(MODE_CLASSES).forEach((className) => {
            appElement.classList.remove(className);
        });

        log("removeModeClasses", "All mode classes removed");
    }

    // === TOGGLE BUTTON ===
    function setupToggleButton() {
        log("setupToggleButton", "Called", { buttonExists: !!toggleButton });

        if (toggleButton) {
            log("setupToggleButton", "Button found, attaching listeners");
            attachToggleListeners();
            return;
        }

        log("setupToggleButton", "Button not found, waiting for it");
        waitForToggleElement();
    }

    function waitForToggleElement() {
        log("waitForToggleElement", "Setting up mutation observer for toggle button");

        toggleObserver = new MutationObserver((_mutations, obs) => {
            toggleButton = document.querySelector(SELECTORS.TOGGLE_BUTTON);

            if (toggleButton) {
                log("waitForToggleElement", "Toggle button found");
                attachToggleListeners();
                obs.disconnect();
            }
        });

        toggleObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function attachToggleListeners() {
        console.log(`[attachToggleListeners] Called, button exists: ${!!toggleButton}`);

        if (!toggleButton) {
            console.log(`[attachToggleListeners] ERROR: No toggleButton found!`);
            return;
        }

        // Remove old listeners if they exist
        if (currentClickHandler) {
            console.log(`[attachToggleListeners] Removing old listeners`);
            toggleButton.removeEventListener("click", currentClickHandler, true);
            toggleButton.removeEventListener("auxclick", currentClickHandler, true);
            toggleButton.removeEventListener("mousedown", currentClickHandler, true);
        }

        // CRITICAL: Remove disabled attribute if we're in an active mode
        if (currentState !== SIDEPANEL_STATES.INACTIVE) {
            const wasDisabled = toggleButton.hasAttribute("disabled");
            toggleButton.removeAttribute("disabled");
            toggleButton.disabled = false;
            if (wasDisabled) {
                console.log(`[attachToggleListeners] Removed disabled attribute (was blocking clicks!)`);
            }
        }

        // Generate a unique ID for this button element instance
        const newButtonId = `btn_${Date.now()}_${Math.random()}`;

        log("attachToggleListeners", "Attaching listeners to button", {
            tagName: toggleButton.tagName,
            className: toggleButton.className,
            disabled: toggleButton.disabled,
            style: toggleButton.getAttribute("style"),
        });

        const handleClick = (e) => {
            console.log(`[handleClick] type=${e.type} button=${e.button} state=${currentState}`);

            log("toggleButton", "Event triggered", {
                type: e.type,
                button: e.button,
                currentState,
                target: e.target.tagName,
                currentTarget: e.currentTarget.tagName,
            });

            // Don't react to clicks if Sharp Tabs isn't active
            const isSharpTabsActive = getActiveSharpTabsButton();
            if (!isSharpTabsActive) {
                console.log(`[handleClick] Sharp Tabs NOT active - ignoring`);
                log("toggleButton", "Sharp Tabs not active - ignoring click");
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            // Ensure currentState is initialized
            if (!currentState) {
                currentState = SIDEPANEL_STATES.INACTIVE;
            }

            // For auxclick event (middle click)
            if (e.type === "auxclick" && e.button === 1) {
                let nextState;

                if (currentState === SIDEPANEL_STATES.INACTIVE) {
                    // Restore last active mode (Fixed or Hover)
                    nextState = lastActiveMode;
                    log("toggleButton", "Middle clicked from INACTIVE - restoring last active mode:", lastActiveMode);
                } else {
                    // From Fixed or Hover, go to Inactive
                    nextState = SIDEPANEL_STATES.INACTIVE;
                    log("toggleButton", "Middle clicked - switching to INACTIVE");
                }

                setState(nextState);
                return;
            }

            // For click event (left click only)
            if (e.type === "click" || (e.type === "mousedown" && e.button === 0)) {
                console.log(`[LEFT-CLICK] Processing from ${currentState}`);
                log("toggleButton", "Left clicked");

                let nextState;

                if (currentState === SIDEPANEL_STATES.INACTIVE) {
                    // Restore last active mode (Fixed or Hover)
                    nextState = lastActiveMode;
                    log("toggleButton", "Restoring last active mode:", lastActiveMode);
                } else if (currentState === SIDEPANEL_STATES.FIXED) {
                    nextState = SIDEPANEL_STATES.HOVER;
                } else if (currentState === SIDEPANEL_STATES.HOVER) {
                    nextState = SIDEPANEL_STATES.FIXED;
                }

                console.log(`[LEFT-CLICK] Changing ${currentState} → ${nextState}`);
                setState(nextState);
            }
        };

        // Store the handler reference for future cleanup
        currentClickHandler = handleClick;

        // Try multiple event types to ensure we catch the click
        toggleButton.addEventListener("click", handleClick, true);
        toggleButton.addEventListener("auxclick", handleClick, true);
        toggleButton.addEventListener("mousedown", handleClick, true);

        // Set both attributes and update our tracking ID
        toggleButton.setAttribute("data-listener-attached", "true");
        toggleButton.setAttribute("data-button-id", newButtonId);
        toggleButtonId = newButtonId; // Store the ID for this button instance

        console.log(`[attachToggleListeners] Listeners attached successfully`);
        log("attachToggleListeners", "Listeners attached successfully");

        // Test if events work at all
        setTimeout(() => {
            log("attachToggleListeners", "Testing button responsiveness", {
                hasListeners: toggleButton.hasAttribute("data-listener-attached"),
                buttonElement: toggleButton,
            });
        }, 1000);

        // Add a global listener to detect if clicks are happening at all
        document.addEventListener(
            "mousedown",
            (e) => {
                if (e.target === toggleButton || toggleButton.contains(e.target)) {
                    console.log(`[GLOBAL] mousedown detected button=${e.button} state=${currentState}`);
                    log("GLOBAL LISTENER", "Click detected on toggle button area", {
                        target: e.target.tagName,
                        button: e.button,
                        toggleButtonMatches: e.target === toggleButton,
                    });
                }
            },
            true
        );
    }

    function addIconToToggleButton(iconType) {
        log("addIconToToggleButton", "Called", { iconType, buttonExists: !!toggleButton });

        if (!toggleButton) return;

        toggleButton.disabled = false;

        let svgHTML;
        switch (iconType) {
            case ICONS.INACTIVE:
                svgHTML = `
                <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="13" cy="13" r="3.5" fill="currentColor"/>
                </svg>`;
                break;
            case ICONS.FIXED:
                svgHTML = `
                <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                    <rect x="9" y="9" width="8" height="8" fill="currentColor"/>
                </svg>`;
                break;
            case ICONS.HOVER:
            default:
                svgHTML = `
                <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 8l6 5-6 5V8z" fill="currentColor"/>
                </svg>`;
                break;
        }

        const buttonIconSpan = document.createElement("span");
        buttonIconSpan.className = "button-icon";
        buttonIconSpan.setAttribute("aria-hidden", "true");
        buttonIconSpan.style.cssText = "display: flex !important; pointer-events: none !important;";
        buttonIconSpan.innerHTML = svgHTML;

        toggleButton.innerHTML = "";
        toggleButton.appendChild(buttonIconSpan);
        toggleButton.setAttribute("data-mod-applied", "true");

        // Check if attributes survived the innerHTML modification
        const hasListenerAfter = toggleButton.hasAttribute("data-listener-attached");
        const hasButtonIdAfter = toggleButton.hasAttribute("data-button-id");

        // Ensure listeners are still attached after modifying the button
        if (!hasListenerAfter || !hasButtonIdAfter || toggleButton.getAttribute("data-button-id") !== toggleButtonId) {
            log("addIconToToggleButton", "Listeners not attached, attaching now");

            // Remove the attributes first to force re-attachment
            toggleButton.removeAttribute("data-listener-attached");
            toggleButton.removeAttribute("data-button-id");

            attachToggleListeners();
        }

        // Update the button's interactivity state
        updateToggleButtonInteractivity();
    }

    // Re-check interactivity after a short delay in case .active or the toolbar button
    // was applied/replaced after our first pass.
    function scheduleInteractivityResync(reason, delay = INTERACTIVITY_RESYNC_DELAY_MS) {
        if (interactivityResyncTimer) return;

        interactivityResyncTimer = setTimeout(() => {
            interactivityResyncTimer = null;
            log("interactivityResync", "Re-running updateToggleButtonInteractivity", { reason });
            updateToggleButtonInteractivity();
        }, delay);
    }

    function cancelInactiveConfirmation(reason) {
        if (!inactiveConfirmTimer) return;

        clearTimeout(inactiveConfirmTimer);
        inactiveConfirmTimer = null;
        log("inactiveConfirm", "Cancelled pending INACTIVE confirmation", { reason });
    }

    // Avoid forcing INACTIVE on brief toolbar class drops; confirm after a short delay.
    function scheduleInactiveConfirmation(reason) {
        if (currentState === SIDEPANEL_STATES.INACTIVE) return;

        if (inactiveConfirmTimer) {
            clearTimeout(inactiveConfirmTimer);
        }

        inactiveConfirmTimer = setTimeout(() => {
            inactiveConfirmTimer = null;
            const isSharpTabsActive = !!getActiveSharpTabsButton();
            const isActiveMode = currentState === SIDEPANEL_STATES.HOVER || currentState === SIDEPANEL_STATES.FIXED;

            if (!isSharpTabsActive && isActiveMode) {
                log("inactiveConfirm", "No active Sharp Tabs after delay - switching to INACTIVE", { reason });
                setState(SIDEPANEL_STATES.INACTIVE);
                updateToggleButtonInteractivity();
            } else {
                log("inactiveConfirm", "Active detected - skipping INACTIVE", { reason, isSharpTabsActive });
            }
        }, INACTIVE_CONFIRM_DELAY_MS);
    }

    function updateToggleButtonInteractivity() {
        if (!toggleButton) return;

        const isSharpTabsActive = !!getActiveSharpTabsButton();
        const isInactiveMode = currentState === SIDEPANEL_STATES.INACTIVE;

        log("updateToggleButtonInteractivity", "Updating button state", { isSharpTabsActive, currentState });

        // Only block when we are truly inactive and Sharp Tabs is not active.
        // A resync is scheduled the first time we enter blocked state to clear stale UI
        // if the toolbar "active" class arrives slightly later.
        const shouldBlock = isInactiveMode && !isSharpTabsActive;

        // Only show disabled state when in INACTIVE mode AND Sharp Tabs is not active
        if (shouldBlock) {
            // Button should appear disabled
            toggleButton.style.cssText = "-webkit-app-region: no-drag !important; cursor: not-allowed !important; pointer-events: auto !important; opacity: 0.5 !important;";
            toggleButton.setAttribute("title", "Activate the Sharp Tabs sidebar first");
            if (!wasToggleBlocked) {
                scheduleInteractivityResync("blocked-state");
            }
            wasToggleBlocked = true;
        } else {
            // Button should be interactive (either Sharp Tabs is active, or we're in HOVER/FIXED mode)
            toggleButton.style.cssText = "-webkit-app-region: no-drag !important; cursor: pointer !important; pointer-events: auto !important;";
            toggleButton.removeAttribute("title");
            wasToggleBlocked = false;
        }
    }

    function setupToolbarStateObserver() {
        // Disconnect existing observer if it exists
        if (toolbarStateObserver) {
            log("setupToolbarStateObserver", "Disconnecting existing observer");
            toolbarStateObserver.disconnect();
            toolbarStateObserver = null;
        }

        // Find the toolbar element
        const toolbarElement = document.querySelector(SELECTORS.TOOLBAR);

        if (!toolbarElement) {
            log("setupToolbarStateObserver", "Toolbar element not found, will retry");
            setTimeout(() => {
                setupToolbarStateObserver();
            }, 1000);
            return;
        }

        log("setupToolbarStateObserver", "Setting up unified toolbar state observer");

        toolbarStateObserver = new MutationObserver((mutations) => {
            // Track if we handled a Sharp Tabs specific state change
            let handledSharpTabsChange = false;
            let sawToolbarChildListChange = false;

            // First pass: Check for Sharp Tabs specific state changes
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    sawToolbarChildListChange = true;
                    return;
                }

                if (mutation.type === "attributes" && mutation.attributeName === "class") {
                    const target = mutation.target;

                    // Check if this is a button-toolbar element
                    if (!target.classList.contains("button-toolbar")) {
                        return;
                    }

                    // Check if it contains a Sharp Tabs button
                    const button = target.querySelector("button");
                    const ariaLabel = button?.getAttribute("aria-label");
                    const isSharpTabs = ariaLabel && (ariaLabel.startsWith("Sharp Tabs") || ariaLabel.includes("/sb.html"));

                    if (!isSharpTabs) {
                        return;
                    }

                    const isActive = target.classList.contains("active");
                    const oldValue = mutation.oldValue || "";
                    const wasActive = oldValue.includes("active");

                    // Only process if active state actually changed
                    if (isActive === wasActive) {
                        return;
                    }

                    log("setupToolbarStateObserver", `Sharp Tabs panel ${isActive ? "activated" : "deactivated"}`);

                    handledSharpTabsChange = true;

                    // Update toggle button interactivity based on Sharp Tabs state
                    updateToggleButtonInteractivity();

                    // If panel became inactive (lost active class), confirm before switching
                    if (!isActive && (currentState === SIDEPANEL_STATES.HOVER || currentState === SIDEPANEL_STATES.FIXED)) {
                        log("setupToolbarStateObserver", "Sharp Tabs deactivated - scheduling INACTIVE confirmation");
                        if (!previousState) {
                            previousState = currentState;
                        }
                        scheduleInactiveConfirmation("sharp-tabs-deactivated");
                    }
                    // If panel became active again (gained active class)
                    else if (isActive) {
                        cancelInactiveConfirmation("sharp-tabs-activated");
                        if (currentState === SIDEPANEL_STATES.INACTIVE) {
                            log("setupToolbarStateObserver", "Sharp Tabs activated - restoring mode:", lastActiveMode);
                            setState(lastActiveMode);
                        }
                    }
                }
            });

            if (sawToolbarChildListChange) {
                // Toolbar nodes can be replaced without class mutations; resync to keep
                // the toggle icon/interactivity correct when Sharp Tabs is still open.
                log("setupToolbarStateObserver", "Toolbar structure changed - resyncing interactivity");
                updateToggleButtonInteractivity();
                scheduleInteractivityResync("toolbar-childList");

                if (getActiveSharpTabsButton()) {
                    cancelInactiveConfirmation("toolbar-childList-active");
                }
            }

            // Second pass: If no Sharp Tabs change, check for general "no active buttons" condition
            if (!handledSharpTabsChange) {
                const hasActiveButton = toolbarElement.querySelector(SELECTORS.ACTIVE_BUTTON);

                if (!hasActiveButton && (currentState === SIDEPANEL_STATES.HOVER || currentState === SIDEPANEL_STATES.FIXED)) {
                    log("setupToolbarStateObserver", "No active buttons detected in HOVER/FIXED mode, scheduling INACTIVE confirmation");
                    if (!previousState) {
                        previousState = currentState;
                    }
                    scheduleInactiveConfirmation("no-active-buttons");
                }
            }
        });

        // Observe the toolbar element with subtree to catch all descendant changes
        toolbarStateObserver.observe(toolbarElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
            attributeOldValue: true,
        });

        log("setupToolbarStateObserver", "Observer initialized successfully");
    }

    function setupToolbarClickListener() {
        const toolbarElement = document.querySelector(SELECTORS.TOOLBAR);

        if (!toolbarElement) {
            log("setupToolbarClickListener", "Toolbar element not found");
            return;
        }

        toolbarElement.addEventListener("click", (event) => {
            const clickedButton = event.target.closest("button");

            if (!clickedButton) return;

            log("toolbarClick", "Button clicked", {
                aria_label: clickedButton.getAttribute("aria-label"),
                name: clickedButton.name,
            });

            if (isSharpTabsButton(clickedButton)) {
                handleSharpTabsButtonClick(clickedButton);
            } else {
                handleNonSharpTabsButtonClick();
            }
        });
    }

    function handleSharpTabsButtonClick(_button) {
        log("handleSharpTabsButtonClick", "Sharp Tabs button clicked");

        if (getActiveSharpTabsButton()) {
            log("handleSharpTabsButtonClick", "Active - restoring previous state");
            setState(previousState || SIDEPANEL_STATES.INACTIVE);
            previousState = null;
        } else {
            log("handleSharpTabsButtonClick", "Inactive");
            const currentWidth = getCurrentPanelContainerWidth();
            if (currentWidth === PANEL_WIDTH.CLOSED) {
                previousState = currentState;
                setState(SIDEPANEL_STATES.INACTIVE);
            } else {
                setState(previousState);
                previousState = null;
            }
        }
    }

    function handleNonSharpTabsButtonClick() {
        log("handleNonSharpTabsButtonClick", "Non-Sharp Tabs button clicked");

        if (!previousState) previousState = currentState;
        setState(SIDEPANEL_STATES.INACTIVE);
        updateToggleButtonInteractivity();
    }

    function getCurrentPanelContainerWidth() {
        const style = panelsContainer.getAttribute("style") || "";
        const match = style.match(/width:\s*(\d+(?:\.\d+)?px)/);
        return match ? match[1] : null;
    }

    function isSharpTabsButton(button) {
        const ariaLabel = button.getAttribute("aria-label");
        if (!ariaLabel) return false;
        return ariaLabel.startsWith("Sharp Tabs") || ariaLabel.includes("/sb.html");
    }

    function getActiveSharpTabsButton() {
        return document.querySelector(SELECTORS.ACTIVE_SHARP_TABS_BUTTON);
    }

    function initializePanel() {
        // Check current width of panels-container to determine initial state
        const currentWidth = getCurrentPanelContainerWidth();

        log("initializePanel", "Panel container width:", currentWidth);

        if (currentWidth === PANEL_WIDTH.COLLAPSED) {
            log("initializePanel", "Width is 0px (entering fullscreen), saving state");
            stateBeforePanelContainerModification = previousState || currentState;
            setState(SIDEPANEL_STATES.INACTIVE);
        } else if (firstInit) {
            firstInit = false;
            log("initializePanel", "Initial width is not 0px, setting to fixed");
            setState(stateBeforePanelContainerModification || SIDEPANEL_STATES.FIXED);
        } else {
            log("initializePanel", "Width changed, restoring state:", stateBeforePanelContainerModification);
            setState(stateBeforePanelContainerModification);
            previousState = null;
        }
    }

    function destroy() {
        if (toggleObserver) {
            toggleObserver.disconnect();
        }

        removeModeClasses();
        log("destroy", "Sidebar manager destroyed (toolbarStateObserver kept active)");
    }

    log("SCRIPT_START", "Vivaldi Sidebar Manager starting execution");

    let initInterval = setInterval(() => {
        if (init()) {
            log("init", "Manager initialized successfully");
            clearInterval(initInterval);

            // Periodic reinitialization check with listener monitoring
            setInterval(() => {
                console.log(`[7s-interval] Running, state=${currentState}, button=${!!toggleButton}`);
                // Monitor listener state before re-init
                if (toggleButton && currentState !== SIDEPANEL_STATES.INACTIVE) {
                    console.log(`[7s-interval] Re-attaching listeners`);
                    // Always re-attach listeners if we're in an active state
                    toggleButton.removeAttribute("data-listener-attached");
                    toggleButton.removeAttribute("data-button-id");
                    attachToggleListeners();
                }

                init();
            }, 7000);
        }
    }, 800);


    const MODE_STYLES_CSS = `
/* Version v1.2 - 2025-11-23 */
/* 1.2: Fixed full screen youtube videos having a line on the left side of the video */

/*
    ============================================
        SHARPTABS PANEL MODES
        Combined CSS for Fixed and Hover modes
    ============================================
*/

#app #browser:is(.normal, .maximized) #switch {
    will-change: flex-basis, opacity, width;
    transition: flex-basis 0.3s ease-in-out, opacity 0.3s ease-in-out, width 0.3s ease-in-out !important;
}

#webview-container {
    will-change: padding-left;
    transition: padding-left 0.13s ease-in-out !important;
}

#app #browser:is(.normal, .maximized) #panels-container {
    will-change: width;
    height: 100%;
}

/* ============================= FIXED MODE ============================================ */
/* This mode hides Vivaldi's panel's bar and just keeps the SharpTabs extension shown */
/* It also sets the side bar to be narrower than the minimum default allowed value of 260px */

#app.sharptabs-fixed-mode {
    --width-full: 220px;
    --width-minimized: 77px;
    --width-hovered: 220px;
    --animation-speed: 0.2s;
    --transition-web-panel: transform var(--animation-speed) ease-in-out, width var(--animation-speed) ease-in-out;

    /* IMPORTANT: Incase you face any issues with the panel placement
    then adjust these values like shown in the video: */
    --shift-vivaldi-panel-bar-left: 0px;
    --shift-vivaldi-page: 200px;
}

#app.sharptabs-fixed-mode #browser:is(.normal, .maximized) #switch {
    width: 0 !important;
    flex-basis: 0 !important;
    opacity: 0 !important;
}

#app.sharptabs-fixed-mode #browser:is(.normal, .maximized) #main.left .panel-group .panel-collapse-guard {
    min-width: 100% !important;
    max-width: 100% !important;
}

/* Adjust this to set the panel width when in "fixed mode" (square icon shown) */
#app.sharptabs-fixed-mode #browser:is(.normal, .maximized) #panels-container {
    position: absolute !important;
    /* Static panel width, comment if 260px minimum + resizing + hidden vivaldi panels bar is desired */
    width: 200px !important;
    transform: translateX(calc(100% + var(--shift-vivaldi-panel-bar-left-expanded)));
    height: 100%;
}

#app.sharptabs-fixed-mode #browser:is(.normal, .maximized) #webview-container {
    padding-left: var(--shift-vivaldi-page) !important;
}

/* Hide the resize handle + comment if 260px minimum + resizing is desired */
#app.sharptabs-fixed-mode #browser:is(.normal, .maximized) #panels-container > button.SlideBar--FullHeight {
    display: none;
}

/* ============================= HOVER MODE ============================================ */
/* This mode collaapses the panel on the left side showing only the icons of each tab */
/* The panel expands when you hover. You'll see a circle icon in the Sharp Tabs mode button */

#app.sharptabs-hover-mode {
    --width-full: 220px;
    --width-minimized: 77px;
    --width-hovered: 220px;

    /* IMPORTANT: Incase you face any issues with the panel placement
    then adjust these values like shown in the video: */
    --shift-vivaldi-panel-bar-left-collapsed: 0px;
    --shift-vivaldi-panel-bar-left-expanded: 39px;
    --shift-vivaldi-page: 39px;
}

#app.sharptabs-hover-mode #browser:is(.normal, .maximized).density-on {
    --shift-vivaldi-panel-bar-left-collapsed: 0px !important;
    --shift-vivaldi-panel-bar-left-expanded: 38px !important;
    --shift-vivaldi-page: 38px !important;
}

/* When the panel hover mode is active, hide the panel's buttons */
#app.sharptabs-hover-mode #browser:is(.normal, .maximized) #switch {
    width: 0 !important;
    flex-basis: 0 !important;
    opacity: 0 !important;
}

/* Uncomment the following code if you want to keep the panel buttons when you hover over the collapsed sidebar: */
/*
    #app.sharptabs-hover-mode:not(:hover) #switch {
        width: 0 !important;
        flex-basis: 0 !important;
        opacity: 0 !important;
    }
*/

#app.sharptabs-hover-mode #browser:is(.normal, .maximized) #panels-container {
    position: absolute !important;
    will-change: width;
    width: var(--width-minimized) !important;
    transform: translateX(calc(-100% + var(--shift-vivaldi-panel-bar-left-expanded)));
    transition: transform 0.2s ease-in-out, width 0.2s ease-in-out !important;
}

#app.sharptabs-hover-mode #browser:is(.normal, .maximized) .panel-collapse-guard {
    min-width: var(--width-minimized) !important;
    max-width: var(--width-hovered) !important;
}

#app.sharptabs-hover-mode #browser:is(.normal, .maximized) #panels-container:hover {
    width: var(--width-hovered) !important;
    transform: translateX(var(--shift-vivaldi-panel-bar-left-collapsed));
}

/* shift page to the right (confirmed) */
#app.sharptabs-hover-mode #browser:is(.normal, .maximized) #webview-container {
    padding-left: var(--shift-vivaldi-page) !important;
}

/* Make the side panel not resizeable in overlay mode */
/* Makes cursor not change when hovering side panel */
#app.sharptabs-hover-mode #browser:is(.normal, .maximized) #panels-container > button.SlideBar--FullHeight {
    display: none;
}
/*# sourceURL=sharptabs-panel-modes.css */
`;
})();
