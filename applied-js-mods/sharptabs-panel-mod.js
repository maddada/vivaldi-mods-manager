(function () {
    ("use strict");

    const SIDEPANEL_STATES = {
        INACTIVE: "inactive",
        HOVER: "hover",
        FIXED: "fixed",
    };

    const SELECTORS = {
        PANELS_CONTAINER: "#panels-container",
        TOGGLE_BUTTON: ".mainbar .button-toolbar.toolbar-spacer-panel button, .mainbar .button-toolbar.toolbar-spacer button",
        TOOLBAR: "#panels > #switch > div.toolbar",
        ACTIVE_BUTTON: ".button-toolbar.active",
        SHARP_TABS_BUTTON: '.button-toolbar.active > button[aria-label^="Sharp Tabs"], .button-toolbar.active > button[aria-label*="/sb.html"]',
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
        console.log(`[${context}] ${message}`, ...args);
    };

    // === STATE VARIABLES ===
    let currentState = SIDEPANEL_STATES.FIXED;
    let previousState = null;
    let transitionGracePeriod = false;
    let stateBeforePanelContainerModification = null;
    let firstInit = true;

    // DOM elements
    let panelsContainer = null;
    let toggleButton = null;

    // Observers
    let toggleObserver = null;
    let noActiveButtonObserver = null;

    // === INITIALIZATION ===
    function init() {
        log("init", "Interval check running");

        panelsContainer = document.getElementById("panels-container");
        toggleButton = document.querySelector(SELECTORS.TOGGLE_BUTTON);

        log("init", "Elements found", {
            panelsContainer: !!panelsContainer,
            toggleButton: !!toggleButton,
            toggleButtonSelector: SELECTORS.TOGGLE_BUTTON
        });

        if (!panelsContainer) {
            return false;
        }

        const alreadyInit = isAlreadyInitialized();

        if (alreadyInit) {
            log("init", "Already loaded, but checking toggle button");
            // Even if already initialized, ensure toggle button listener is attached
            setupToggleButton();
            return true;
        }

        log("init", "Found panels-container, initializing");
        initializePanel();
        markAsInitialized();
        setupToggleButton();
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

    // === STATE MANAGEMENT ===
    function setState(newState) {
        const wasInactive = currentState === SIDEPANEL_STATES.INACTIVE;
        const becomingHover = newState === SIDEPANEL_STATES.HOVER;
        const becomingFixed = newState === SIDEPANEL_STATES.FIXED;

        if (wasInactive && (becomingHover || becomingFixed)) {
            transitionGracePeriod = true;
            log("setState", "Enabling transition grace period");
        }

        currentState = newState;

        if (newState === SIDEPANEL_STATES.INACTIVE) {
            destroy();
            panelsContainer.classList.remove("panel-expanded");
            addIconToToggleButton(ICONS.INACTIVE);
            log("setState", "Set state to INACTIVE");
        } else if (newState === SIDEPANEL_STATES.HOVER) {
            applyStyles(SIDEPANEL_STATES.HOVER);
            addEventListeners();
            addIconToToggleButton(ICONS.HOVER);
            log("setState", "Set state to HOVER");
        } else if (newState === SIDEPANEL_STATES.FIXED) {
            applyStyles(SIDEPANEL_STATES.FIXED);
            addEventListeners();
            addIconToToggleButton(ICONS.FIXED);
            log("setState", "Set state to FIXED");
        }
    }

    // === STYLES ===
    function applyStyles(mode) {
        removeStyles();

        const cssFile = mode === SIDEPANEL_STATES.FIXED ? "./sharptabs-fixed-mode.css" : "./sharptabs-hover-mode.css";

        const styleElement = document.createElement("link");
        styleElement.id = "vivaldi-sidebar-styles";
        styleElement.rel = "stylesheet";
        styleElement.href = cssFile;
        document.head.appendChild(styleElement);

        log("applyStyles", "Styles applied successfully", cssFile);
    }

    function removeStyles() {
        const existingStyle = document.getElementById("vivaldi-sidebar-styles");
        if (existingStyle) existingStyle.remove();
    }

    // === EVENT LISTENERS ===
    function addEventListeners() {
        log("addEventListeners", "Adding event listeners");
        panelsContainer.addEventListener("mouseenter", handleMouseEnter);
        panelsContainer.addEventListener("mouseleave", handleMouseLeave);
    }

    function removeEventListeners() {
        log("removeEventListeners", "Removing event listeners");
        panelsContainer.removeEventListener("mouseenter", handleMouseEnter);
        panelsContainer.removeEventListener("mouseleave", handleMouseLeave);
    }

    // === MOUSE EVENTS ===
    function handleMouseEnter() {
        log("handleMouseEnter", "Triggered", { currentState, gracePeriod: transitionGracePeriod });

        if (currentState === SIDEPANEL_STATES.INACTIVE) return;
        if (transitionGracePeriod) {
            log("handleMouseEnter", "Skipping due to transition grace period");
            return;
        }

        if (!getActiveSharpTabsButton()) {
            log("handleMouseEnter", "No active button found, skipping expansion");
            return;
        }

        if (!panelsContainer.classList.contains("panel-expanded")) {
            panelsContainer.classList.add("panel-expanded");
        }
    }

    function handleMouseLeave() {
        log("handleMouseLeave", "Triggered", { currentState });

        if (currentState === SIDEPANEL_STATES.INACTIVE) return;

        if (transitionGracePeriod) {
            transitionGracePeriod = false;
            log("handleMouseLeave", "Transition grace period cleared");
        }

        panelsContainer.classList.remove("panel-expanded");
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

        toggleObserver = new MutationObserver((mutations, obs) => {
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
        // Only attach if not already attached
        if (toggleButton.hasAttribute("data-listener-attached")) {
            log("attachToggleListeners", "Listener already attached, skipping");
            return;
        }

        log("attachToggleListeners", "Attaching listeners to button", {
            tagName: toggleButton.tagName,
            className: toggleButton.className,
            disabled: toggleButton.disabled,
            style: toggleButton.getAttribute("style")
        });

        const handleClick = (e) => {
            log("toggleButton", "Event triggered", {
                type: e.type,
                button: e.button,
                currentState,
                target: e.target.tagName,
                currentTarget: e.currentTarget.tagName
            });

            e.preventDefault();
            e.stopPropagation();

            // Ensure currentState is initialized
            if (!currentState) {
                currentState = SIDEPANEL_STATES.INACTIVE;
            }

            // For auxclick event (middle/right click)
            if (e.type === "auxclick" && e.button === 1) {
                log("toggleButton", "Middle clicked - switching to INACTIVE");
                setState(SIDEPANEL_STATES.INACTIVE);
                return;
            }

            // For click event (left click only)
            if (e.type === "click" || (e.type === "mousedown" && e.button === 0)) {
                log("toggleButton", "Left clicked");

                const transitions = {
                    [SIDEPANEL_STATES.INACTIVE]: SIDEPANEL_STATES.FIXED,
                    [SIDEPANEL_STATES.FIXED]: SIDEPANEL_STATES.HOVER,
                    [SIDEPANEL_STATES.HOVER]: SIDEPANEL_STATES.FIXED,
                };

                const nextState = transitions[currentState];

                // Only allow transitioning to FIXED or HOVER if Sharp Tabs is active
                if ((nextState === SIDEPANEL_STATES.HOVER || nextState === SIDEPANEL_STATES.FIXED) && !getActiveSharpTabsButton()) {
                    log("toggleButton", "Cannot transition to HOVER/FIXED - no active Sharp Tabs button");
                    return;
                }

                setState(nextState);
            }
        };

        // Try multiple event types to ensure we catch the click
        toggleButton.addEventListener("click", handleClick, true);
        toggleButton.addEventListener("auxclick", handleClick, true);
        toggleButton.addEventListener("mousedown", handleClick, true);

        toggleButton.setAttribute("data-listener-attached", "true");
        log("attachToggleListeners", "Listeners attached successfully");

        // Test if events work at all
        setTimeout(() => {
            log("attachToggleListeners", "Testing button responsiveness", {
                hasListeners: toggleButton.hasAttribute("data-listener-attached"),
                buttonElement: toggleButton
            });
        }, 1000);

        // Add a global listener to detect if clicks are happening at all
        document.addEventListener("mousedown", (e) => {
            if (e.target === toggleButton || toggleButton.contains(e.target)) {
                log("GLOBAL LISTENER", "Click detected on toggle button area", {
                    target: e.target.tagName,
                    button: e.button,
                    toggleButtonMatches: e.target === toggleButton
                });
            }
        }, true);
    }

    function addIconToToggleButton(iconType) {
        log("addIconToToggleButton", "Called", { iconType, buttonExists: !!toggleButton });
        if (!toggleButton) return;

        toggleButton.disabled = false;
        toggleButton.style = "-webkit-app-region: no-drag !important; cursor: pointer !important; pointer-events: auto !important;";

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

        // Ensure listeners are still attached after modifying the button
        // Remove the listener-attached flag so it can be re-attached if needed
        if (!toggleButton.hasAttribute("data-listener-attached")) {
            log("addIconToToggleButton", "Listeners not attached, attaching now");
            attachToggleListeners();
        }
    }

    function setupNoActiveButtonObserver() {
        const toolbarElement = document.querySelector(SELECTORS.TOOLBAR);

        if (!toolbarElement) {
            log("setupNoActiveButtonObserver", "Toolbar element not found");
            return;
        }

        noActiveButtonObserver = new MutationObserver(() => {
            const hasActiveButton = toolbarElement.querySelector(SELECTORS.ACTIVE_BUTTON);

            if (!hasActiveButton && (currentState === SIDEPANEL_STATES.HOVER || currentState === SIDEPANEL_STATES.FIXED)) {
                log("setupNoActiveButtonObserver", "No active buttons detected in HOVER/FIXED mode, switching to INACTIVE");

                if (!previousState) {
                    previousState = currentState;
                }
                setState(SIDEPANEL_STATES.INACTIVE);
            }
        });

        noActiveButtonObserver.observe(toolbarElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
        });
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

    function handleSharpTabsButtonClick(button) {
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
        return document.querySelector(SELECTORS.SHARP_TABS_BUTTON);
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
        removeEventListeners();

        if (toggleObserver) {
            toggleObserver.disconnect();
        }
        if (noActiveButtonObserver) {
            noActiveButtonObserver.disconnect();
        }

        removeStyles();
        log("destroy", "Sidebar manager destroyed");
    }

    log("SCRIPT_START", "Vivaldi Sidebar Manager starting execution");

    let initInterval = setInterval(() => {
        if (init()) {
            log("initializeManager", "Manager initialized successfully, clearing init interval");
            clearInterval(initInterval);

            // Periodic reinitialization check
            setInterval(() => {
                init();
            }, 5000);
        }
    }, 800);
})();
