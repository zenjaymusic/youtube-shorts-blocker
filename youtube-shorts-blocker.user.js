// ==UserScript==
// @name         YouTube Shorts Blocker
// @namespace    zen
// @version      3.7
// @description  Fully block all Shorts: redirects + feed + sidebar + no scroll jump
// @match        *://*.youtube.com/*
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==
(function() {
    'use strict';

    GM_addStyle(`
        ytd-rich-shelf-renderer[is-shorts],
        ytd-reel-shelf-renderer,
        ytm-shorts-lockup-view-model,
        ytm-shorts-lockup-view-model-v2,
        ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
        ytd-rich-section-renderer:empty,
        ytd-rich-section-renderer:not(:has(ytd-rich-shelf-renderer:not([is-shorts]))):not(:has(ytd-rich-item-renderer)) {
            display: none !important;
        }

        ytd-rich-grid-renderer,
        #contents.ytd-rich-grid-renderer,
        ytd-page-manager {
            overflow-anchor: none !important;
        }
    `);

    // --- REDIRECT ---
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

    // --- SIDEBAR ---
    function removeSidebar() {
        document.querySelectorAll('.yt-simple-endpoint[title="Shorts"]').forEach(el => {
            if (el.parentNode?.parentNode) el.parentNode.parentNode.removeChild(el.parentNode);
        });
    }

    // --- FEED ---
    function removeFeedShorts() {
        const toRemove = new Set();

        document.querySelectorAll('ytd-rich-shelf-renderer[is-shorts]').forEach(el => {
            toRemove.add(el.closest('ytd-rich-section-renderer') || el);
        });
        document.querySelectorAll('[is-shorts]').forEach(el => {
            toRemove.add(el.closest('ytd-rich-section-renderer') || el);
        });
        document.querySelectorAll(
            'ytd-reel-shelf-renderer, ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2'
        ).forEach(el => toRemove.add(el));
        document.querySelectorAll('ytd-video-renderer:has([href*="/shorts/"])').forEach(el => toRemove.add(el));

        // Remove section wrappers that have no regular video content
        document.querySelectorAll('ytd-rich-section-renderer').forEach(el => {
            if (
                !el.querySelector('ytd-rich-shelf-renderer:not([is-shorts])') &&
                !el.querySelector('ytd-rich-item-renderer')
            ) {
                toRemove.add(el);
            }
        });

        toRemove.forEach(el => el.parentNode && el.remove());
    }

    function removeAll() {
        removeSidebar();
        removeFeedShorts();
    }

    // --- OBSERVER ---
    let timeoutId;
    function handleMutations(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'is-shorts') {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(removeAll, 100);
                return;
            }
            const t = mutation.target;
            if (
                t.id === 'progress' ||
                t.tagName === 'YTD-VIDEO-RENDERER' ||
                t.tagName === 'YTD-RICH-SECTION-RENDERER' ||
                (t.parentElement && (t.parentElement.id === 'page-manager' || t.parentElement.id === 'primary'))
            ) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(removeAll, 300);
                return;
            }
        }
    }

    function init() {
        removeAll();
        const target = document.querySelector('#page-manager') || document.body;
        new MutationObserver(handleMutations).observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['is-shorts'],
        });
    }

    if (document.querySelector('#page-manager')) {
        init();
    } else {
        const wait = new MutationObserver(() => {
            if (document.querySelector('#page-manager')) { wait.disconnect(); init(); }
        });
        wait.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

})();
