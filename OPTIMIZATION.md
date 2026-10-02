# Asset optimization

Run `npm install && npm run build` after editing anything in `frontend/js/` or the CSS files. The build writes `frontend/dist/`.

- JS: the 9 core scripts are combined and minified into `frontend/dist/app.min.js` (1 request instead of 9). Lazy modules are minified into `frontend/dist/lazy/`.
- CSS: `styles.css` and `focus-mode.css` go through PurgeCSS to drop unused rules, then are minified into `frontend/dist/app.min.css` (1 request instead of 2).
- Fonts: JetBrains Mono removed and replaced with the system monospace font. The unused DM Sans 300/italic and Amiri bold are no longer downloaded. Preconnect hints added.
- Images: PNG icons recompressed. A WebP favicon was added, with the PNG kept as a fallback. The other icons stay PNG because the WebP versions were bigger.
- sw.js: now caches the bundles, and the cache version is bumped to jadwal-v4.
- ui.js: the lazy-loader path now works with any bundle filename.
- The old root-level frontend/script.js, state.js, dom.js, config.js and focus-mode.js are not loaded by index.html, so they were left out of the bundle. You can delete them.
