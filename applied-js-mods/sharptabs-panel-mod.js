// Version v1.1 - 2025-11-11

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

    // Observers
    let toggleObserver = null;
    let toolbarStateObserver = null;

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

        const styleElement = document.createElement("link");
        styleElement.id = "vivaldi-sharptabs-mode-styles";
        styleElement.rel = "stylesheet";
        styleElement.href = "./sharptabs-panel-modes.css";
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

        // Try multiple event types to ensure we catch the click
        toggleButton.addEventListener("click", handleClick, true);
        toggleButton.addEventListener("auxclick", handleClick, true);
        toggleButton.addEventListener("mousedown", handleClick, true);

        // Set both attributes and update our tracking ID
        toggleButton.setAttribute("data-listener-attached", "true");
        toggleButton.setAttribute("data-button-id", newButtonId);
        toggleButtonId = newButtonId; // Store the ID for this button instance

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

    function updateToggleButtonInteractivity() {
        if (!toggleButton) return;

        const isSharpTabsActive = !!getActiveSharpTabsButton();
        const isInactiveMode = currentState === SIDEPANEL_STATES.INACTIVE;

        log("updateToggleButtonInteractivity", "Updating button state", { isSharpTabsActive, currentState });

        // Only show disabled state when in INACTIVE mode AND Sharp Tabs is not active
        if (isInactiveMode && !isSharpTabsActive) {
            // Button should appear disabled
            toggleButton.style.cssText = "-webkit-app-region: no-drag !important; cursor: not-allowed !important; pointer-events: auto !important; opacity: 0.5 !important;";
            toggleButton.setAttribute("title", "Activate the Sharp Tabs sidebar first");
        } else {
            // Button should be interactive (either Sharp Tabs is active, or we're in HOVER/FIXED mode)
            toggleButton.style.cssText = "-webkit-app-region: no-drag !important; cursor: pointer !important; pointer-events: auto !important;";
            toggleButton.removeAttribute("title");
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

            // First pass: Check for Sharp Tabs specific state changes
            mutations.forEach((mutation) => {
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

                    // If panel became inactive (lost active class)
                    if (!isActive && (currentState === SIDEPANEL_STATES.HOVER || currentState === SIDEPANEL_STATES.FIXED)) {
                        log("setupToolbarStateObserver", "Sharp Tabs deactivated - switching to INACTIVE mode");
                        setState(SIDEPANEL_STATES.INACTIVE);
                    }
                    // If panel became active again (gained active class)
                    else if (isActive && currentState === SIDEPANEL_STATES.INACTIVE) {
                        log("setupToolbarStateObserver", "Sharp Tabs activated - restoring mode:", lastActiveMode);
                        setState(lastActiveMode);
                    }
                }
            });

            // Second pass: If no Sharp Tabs change, check for general "no active buttons" condition
            if (!handledSharpTabsChange) {
                const hasActiveButton = toolbarElement.querySelector(SELECTORS.ACTIVE_BUTTON);

                if (!hasActiveButton && (currentState === SIDEPANEL_STATES.HOVER || currentState === SIDEPANEL_STATES.FIXED)) {
                    log("setupToolbarStateObserver", "No active buttons detected in HOVER/FIXED mode, switching to INACTIVE");

                    if (!previousState) {
                        previousState = currentState;
                    }
                    setState(SIDEPANEL_STATES.INACTIVE);
                    updateToggleButtonInteractivity();
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
                // Monitor listener state before re-init
                if (toggleButton && currentState !== SIDEPANEL_STATES.INACTIVE) {
                    // Always re-attach listeners if we're in an active state
                    toggleButton.removeAttribute("data-listener-attached");
                    toggleButton.removeAttribute("data-button-id");
                    attachToggleListeners();
                }

                init();
            }, 7000);
        }
    }, 800);
})();
