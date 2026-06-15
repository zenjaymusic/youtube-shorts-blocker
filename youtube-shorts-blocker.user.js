// ==UserScript==
// @name         YouTube Shorts Blocker
// @namespace    zen
// @version      3.1
// @description  Fully block all Shorts: redirects + feed removal + sidebar
// @match        *://*.youtube.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    function redirectShorts() {
        if (/^https?:\/\/(www\.)?youtube\.com\/shorts/.test(window.location.href)) {
            window.location.href = 'https://www.youtube.com/feed/subscriptions';
        }
    }
    redirectShorts();

    const pushState = history.pushState;
    history.pushState = function() { pushState.apply(this, arguments); redirectShorts(); };
    const replaceState = history.replaceState;
    history.replaceState = function() { replaceState.apply(this, arguments); redirectShorts(); };
    window.addEventListener('yt-navigate-finish', redirectShorts);

    function removeSidebar() {
        document.querySelectorAll('.yt-simple-endpoint[title="Shorts"]').forEach(el => {
            if (el.parentNode && el.parentNode.parentNode) {
                el.parentNode.parentNode.removeChild(el.parentNode);
            }
        });
    }

    function removeFeedShorts() {
        // Remove reel shelf rows
        document.querySelectorAll('ytd-reel-shelf-renderer, grid-shelf-view-model').forEach(el => {
            el.parentNode && el.parentNode.removeChild(el);
        });

        // Remove individual short items — and then clean up their empty section wrapper
        document.querySelectorAll('[is-shorts], [is-reel-item-style-avatar-circle], ytd-reel-item-renderer').forEach(el => {
            const section = el.closest('ytd-rich-section-renderer');
            if (section && section.parentNode) {
                section.parentNode.removeChild(section);
            } else {
                el.parentNode && el.parentNode.removeChild(el);
            }
        });

        // Search results linking to /shorts/
        document.querySelectorAll('ytd-video-renderer:has([href*="/shorts/"])').forEach(el => {
            el.parentNode && el.parentNode.removeChild(el);
        });

        // Clean up any remaining empty ytd-rich-section-renderer containers
        document.querySelectorAll('ytd-rich-section-renderer').forEach(el => {
            if (!el.querySelector('ytd-rich-shelf-renderer:not([is-shorts])') && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }

    function removeAll() {
        removeSidebar();
        removeFeedShorts();
    }

    let timeoutId;
    function handleMutations(mutationsList) {
        for (let mutation of mutationsList) {
            const t = mutation.target;
            if (
                t.id === 'progress' ||
                t.tagName === 'YTD-VIDEO-RENDERER' ||
                (t.parentElement && (t.parentElement.id === 'page-manager' || t.parentElement.id === 'primary'))
            ) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(removeAll, 500);
                break;
            }
        }
    }

    function init() {
        removeAll();
        const targetNode = document.querySelector('#page-manager');
        if (targetNode) {
            const observer = new MutationObserver(handleMutations);
            observer.observe(targetNode, { childList: true, attributes: true, subtree: true });
        }
    }

    if (document.querySelector('#page-manager')) {
        init();
    } else {
        const waitForPageManager = new MutationObserver(() => {
            if (document.querySelector('#page-manager')) {
                waitForPageManager.disconnect();
                init();
            }
        });
        waitForPageManager.observe(document.body, { childList: true, subtree: true });
    }

})();
