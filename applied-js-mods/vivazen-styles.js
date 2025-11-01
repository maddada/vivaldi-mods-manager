(function () {
    window.vivazenStyles = /*CSS*/ `
    /* ========== CSS VARIABLES ========== */
    :root {
        /* User Settings */
        --use-theme: false;
        --auto-hide-tab_bar: false;
        --auto-hide-address_bar: false;
        --auto-hide-bookmark_bar: false;
        --auto-hide-web-panel: true;

        /* Layout Heights & Positions */
        --titlebar-height: 0px;
        --status_bar-height: 0px;
        --tab_bar-height: 42px;
        --tab_bar-height-stacked: 75px;
        --address_bar-height: 40px;
        --bookmark_bar-height: 29px;
        --tab_bar-height-top: 0px;
        --address_bar-height-top: 0px;
        --bookmark_bar-height-top: 0px;
        --tab_bar-height-bottom: 0px;
        --address_bar-height-bottom: 0px;
        --bookmark_bar-height-bottom: 0px;

        --is-hovering: none;
        --tab-width-stacked: 500px;
        --tab-width-normal: 250px;

        /* Animation & Transitions */
        --transition-main: transform 0.2s linear, height 0.2s ease;
        --transition-web-panel: transform 0.2s ease-in-out, width 0.2s ease-in-out;

        /* Background Configuration */
        --background: linear-gradient(90deg, #064547, #46bf7e, #06938c, #064547);
        --background-size: 100vw 100vh;
        --color: #ffffff;
        --address-input-shadow: #ffffff21;
    }

    #browser {
        container-type: inline-size;
        container-name: translate;
        overflow: clip;

        /* Auto-hide position calculations for top elements */
        --auto-hide-tab-Y-top: 0px;
        --auto-hide-address-Y-top: 0px;
        --auto-hide-bookmark-Y-top: 0px;
        --tab-Y-top: calc(0px - var(--auto-hide-tab-Y-top));
        --address-Y-top: calc(var(--tab_bar-height-top) - var(--auto-hide-tab-Y-top) - var(--auto-hide-address-Y-top));
        --bookmark-Y-top: calc(
            (var(--tab_bar-height-top) + var(--address_bar-height-top)) - var(--auto-hide-tab-Y-top) - var(--auto-hide-address-Y-top) - var(--auto-hide-bookmark-Y-top)
        );

        /* Auto-hide position calculations for bottom elements */
        --auto-hide-tab-Y-bottom: 0px;
        --auto-hide-address-Y-bottom: 0px;
        --auto-hide-bookmark-Y-bottom: 0px;
        --tab-Y-bottom: calc(0px + var(--auto-hide-tab-Y-bottom) - var(--status_bar-height));
        --address-Y-bottom: calc(-1 * (var(--tab_bar-height-bottom) - var(--auto-hide-tab-Y-bottom) - var(--auto-hide-address-Y-bottom)));
        --bookmark-Y-bottom: calc(
            -1 * (var(--tab_bar-height-bottom) + var(--address_bar-height-bottom)) + var(--auto-hide-tab-Y-bottom) + var(--auto-hide-address-Y-bottom) +
                var(--auto-hide-bookmark-Y-bottom)
        );
        --header-hover-height: 10px;
        --footer-hover-height: 10px;
        --tab-margin-top: 0px;
        --address-margin-top: 0px;
        --bookmark-margin-top: 0px;
        --margin-start: calc(var(--address-margin-top) + var(--bookmark-margin-top) + var(--header-hover-height));
        --tab-margin-bottom: 0px;
        --address-margin-bottom: 0px;
        --bookmark-margin-bottom: 0px;
        --margin-end: calc(var(--address-margin-bottom) + var(--bookmark-margin-bottom) + var(--footer-hover-height));
    }

    /* ========== BASIC LAYOUT ELEMENTS ========== */
    #main {
        overflow: visible;
        z-index: 8;
        display: grid;
    }

    /* Fullscreen mode */
    #browser.fullscreen .mainbar {
        display: none !important;
    }

    #header,
    #footer,
    .mainbar,
    .bookmark-bar {
        transition: var(--transition-main);
        z-index: 10;
    }

    .inner {
        grid-row: 1;
        margin-block-start: var(--margin-start);
        margin-block-end: var(--margin-end);
        overflow: clip !important;
    }

    #footer {
        overflow: visible !important;
        border: none !important;

        > .toolbar-statusbar {
            z-index: 12;
            background-color: var(--colorWindowBg);
        }
    }
    #panels-container {
        z-index: 8 !important;
    }
    .extension-popup,
    .tooltip,
    .mainbar:has(.OmniDropdown),
    .StatusInfo {
        z-index: 100 !important;
    }

    .tabbar-wrapper:empty {
        display: none !important;
    }

    #header,
    #header *,
    #footer,
    #footer *,
    .bookmark-bar,
    .bookmark-bar * {
        -webkit-app-region: no-drag !important;
    }

    #browser:has(#header #pagetitle) {
        --header-hover-height: 0px;
    }
    #browser:not(.address-top):not(.bookmark-bar-top):not(.tabs-top) {
        --titlebar-height: 28px;
        --header-hover-height: 0px;
    }

    #browser:not(.address-bottom):not(.bookmark-bar-bottom):not(.tabs-bottom) {
        --footer-hover-height: 0px;
    }

    #browser:has(#footer > .toolbar-statusbar) {
        --status_bar-height: 34px;
        --footer-hover-height: 0px;
    }

    /* ========== TABS POSITIONING ========== */
    #browser.tabs-top {
        --tab_bar-height-top: var(--tab_bar-height);
        --tab-margin-top: var(--tab_bar-height);
        --header-hover-height: 0px;

        &:has(.tabbar-wrapper #tabs-tabbar-container #tabs-subcontainer) {
            --tab-margin-top: var(--tab_bar-height-stacked);
            --tab_bar-height-top: var(--tab_bar-height-stacked);
        }
    }

    #browser.tabs-bottom {
        --tab_bar-height-bottom: var(--tab_bar-height);
        --tab-margin-bottom: var(--tab_bar-height);
        --footer-hover-height: 0px;

        &:has(.tabbar-wrapper #tabs-tabbar-container #tabs-subcontainer) {
            --tab-margin-bottom: var(--tab_bar-height-stacked);
            --tab_bar-height-bottom: var(--tab_bar-height-stacked);
        }
    }

    /* ========== ADDRESS BAR POSITIONING ========== */
    #browser.address-top {
        &:not(.tabs-top) {
            --address_bar-height: 54px;
            --auto-hide-address-Y-top: 54px;
        }
        --address_bar-height-top: var(--address_bar-height);
        --auto-hide-address-Y-top: 0px !important;
        --address-margin-top: var(--address_bar-height);
        --header-hover-height: 0px;
    }
    #browser.address-bottom {
        --auto-hide-address-Y-bottom: 0px;
        --address_bar-height-bottom: var(--address_bar-height);
        --address-margin-bottom: var(--address_bar-height);
        --footer-hover-height: 0px;
    }

    /* ========== BOOKMARK BAR POSITIONING ========== */
    #browser.bookmark-bar-top {
        --auto-hide-bookmark-Y-top: 0px;
        --bookmark-margin-top: var(--bookmark_bar-height);
        --header-hover-height: 0px;
    }

    #browser.bookmark-bar-bottom {
        --auto-hide-bookmark-Y-bottom: 0px;
        --bookmark-margin-bottom: var(--bookmark_bar-height);
        --footer-hover-height: 0px;

        .bookmark-bar {
            align-self: self-end;
        }
    }

    #browser {
        --tab_bar-height-top: 0px !important;
        --tab_bar-height-bottom: 0px !important;
    }

    #browser:not(.tabs-top):not(.address-top):not(.bookmark-bar-top) {
        --margin-start: 0px;
    }

    #header:empty {
        display: block !important;
        z-index: 9;
    }

    #browser:not(.tabs-bottom):not(.address-bottom):not(.bookmark-bar-bottom) footer#footer {
        display: none;
    }

    footer#footer {
        display: block !important;
        z-index: 8;
        flex: 0 0 auto;
    }

    #browser.tabs-bottom footer#footer {
        display: flex !important;

        .toolbar-statusbar {
            background-color: var(--colorTabBar, transparent);
        }
    }

    /* ========== TABS LEFT & RIGHT STYLING ========== */
    #browser.tabs-left,
    #browser.tabs-right {
        .tabbar-wrapper #tabs-tabbar-container {
            width: var(--tab-width-normal) !important;
            display: flex;
            transition: all 0.3s ease;
            overflow: hidden;
            * {
                opacity: 1;
            }
        }
        .tabbar-wrapper #tabs-tabbar-container:has(#tabs-subcontainer) {
            width: var(--tab-width-stacked) !important;
        }
        .tabbar-wrapper #tabs-container {
            width: var(--tab-width-normal);
            flex: none;
            grid-column: 2;
            grid-row: 1;
            justify-self: end;
        }

        .tabbar-wrapper #tabs-subcontainer {
            grid-column: 1;
            grid-row: 1;
            width: var(--tab-width-normal);
            transition: width 0.3s ease;
        }

        @starting-style {
            .tabbar-wrapper #tabs-subcontainer {
                width: 0px;
            }
        }

        .tabbar-wrapper #tabs-subcontainer .tab-strip {
            width: var(--tab-width-normal);
        }
    }

    /* ========== ADDRESS BAR ========== */
    #browser.address-top {
        .mainbar {
            width: 100vw;
            position: absolute;
            transform: translateY(calc(var(--address-Y-top)));
        }
    }
    #browser.address-bottom {
        .mainbar {
            width: 100vw;
            position: absolute;
            height: var(--address_bar-height);
            transform: translateY(var(--address-Y-bottom));
            align-self: end;
        }
    }
    /* Address bar positioning for non-auto-hide elements */
    .mainbar {
        z-index: 10;
    }

    /* ========== BOOKMARK BAR ========== */
    #browser.bookmark-bar-top {
        .bookmark-bar {
            width: 100vw;
            position: absolute;
            transform: translateY(var(--bookmark-Y-top));
        }
    }
    #browser.bookmark-bar-bottom {
        .bookmark-bar {
            width: 100vw;
            position: absolute;
            transform: translateY(var(--bookmark-Y-bottom));
        }
    }
    /* Bookmark bar positioning for non-auto-hide elements */
    .bookmark-bar {
        z-index: 10;
    }

    /* ========== WEB PANEL ========== */
    div#panels-container {
        transition: var(--transition-web-panel) !important;
        will-change: width;
        position: absolute !important;
        height: 100%;

        &.overlay {
            width: max-content !important;
            right: auto !important;

            #panels {
                width: max-content;
                overflow: hidden;
                contain: content;
            }

            .panel-group {
                left: 0 !important;
                position: relative !important;
                top: 0;
                width: auto;
                bottom: 0;
                background-color: var(--colorBgAlphaBlur);
            }
        }

        &.left {
            transform: translateX(calc(-100% + 43px));
        }
        &.right {
            transform: translateX(calc(100vw - 10px));
        }
    }

    #browser {
        &:has(div#panels-container.left:hover),
        &.tabs-left:has(div#panels-container.left):has(:is(.inner .tabbar-wrapper):hover) {
            div#panels-container.left {
                transform: translateX(0);
            }
            #tabs-tabbar-container.left {
                transform: translateX(calc(0% + 41px));
            }
            #tabs-tabbar-container > * {
                opacity: 1;
            }
        }

        &:has(div#panels-container.right:hover),
        &.tabs-right:has(div#panels-container.right):has(:is(.inner .tabbar-wrapper):hover) {
            div#panels-container.right {
                transform: translateX(calc(100vw - 100%));
            }
            #tabs-tabbar-container.right {
                transform: translateX(calc(-100% - 31px));
            }
            #tabs-tabbar-container > * {
                opacity: 1;
            }
        }
    }

    `;
})();