# dhun. — Installable Music PWA

A polished, dependency-free Progressive Web App for discovering YouTube music via Google's official APIs and playing personal audio files without ads.

## Features

- Installable on Android/Chrome or iOS/Safari as a home-screen web app
- Music discovery, 6 verified handpicked song links, mood categories and recommendations
- Full YouTube music video search with a user-provided **YouTube Data API v3** key
- Popular music videos in India through YouTube Data API `videos.list`
- Official, **visible** YouTube IFrame Player API for playback and its built-in YouTube controls
- Play queue, next/previous, shuffle, repeat, liked songs, recently played tracks and custom playlists
- Import local audio files, keep them in the phone's browser storage (IndexedDB), and play them ad-free/offline
- Local playback Media Session support (when supported by device/browser)
- Responsive mobile/desktop interface, service worker cache, PWA manifest and icons
- No advertisements added by this website

## Important limitations

**YouTube can still show its own advertisements.** This app does not remove YouTube ads, bypass restrictions, extract streams, or run hidden/background YouTube audio. YouTube's terms prohibit those behaviors. Official YouTube videos are shown in an embedded player, and some videos forbid embedding. Local imported files, by contrast, play through the device's own audio player with no app-inserted ads.

Without a key, the included handpicked YouTube tracks play and searching filters this limited sample/local collection. A YouTube Data API key is required for full-catalog YouTube search and up-to-date recommendations.

The PWA interface caches for offline use, but **YouTube playback and searching require internet**. Imported local music can be played offline. The browser may evict stored local files when low on storage; retain a personal backup.

## Run locally

You need no build tools or npm installation. Serve the folder via an HTTP server:

```bash
cd dhun-pwa
python -m http.server 8000
```

Open **http://localhost:8000** in Chrome. The install prompt will work on `localhost`; on a phone, use a deployed **HTTPS** link for installation.

> Opening `index.html` by file:// is not supported for service workers, and the YouTube player may not work correctly.

## Enable YouTube search

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Under **APIs & Services → Library**, enable **YouTube Data API v3**.
4. Under **APIs & Services → Credentials**, create an **API key**.
5. Restrict the key to **YouTube Data API v3** and to the website's HTTP referrers (your deployed URL + localhost for testing, when applicable). Be aware that HTTP-referrer restricted keys are visible to browser users and should be quota-limited. For a public multi-user app, use a securely managed backend proxy and server-side rate limiting instead of exposing a key.
6. In dhun., choose **Settings → Connect YouTube**. Paste and save the key. The key is held only in this browser's `localStorage`.

## Deploy FREE using GitHub Pages

1. Create a new public repository (e.g. `dhun-pwa`).
2. Upload the **contents** of this folder to its root (index.html, app.js, styles.css, sw.js, manifest and assets).
3. GitHub repository → **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Choose `main` and `/ (root)`; Save.
5. Open the generated HTTPS URL on Android Chrome, then choose browser menu → **Install app** / **Add to Home screen**. On iPhone Safari, choose Share → **Add to Home Screen**.
6. Create/restrict your API key to that actual Pages URL, then paste it into dhun Settings.

All PWA paths are relative, so a GitHub Pages repository subpath is supported.

## Architecture

- `index.html`: accessible app shell and icon sprite
- `styles.css`: fully responsive theme
- `app.js`: UI, YouTube API integrations, playlists, local audio IndexedDB storage
- `sw.js`: same-origin app shell offline cache (doesn't intercept YouTube streams)
- `manifest.webmanifest` + `assets`: PWA install metadata, application icons

## Notes

- This project has no backend, login, subscription, ad blocker, downloader, or trackers.
- Browser storage is specific to the origin + browser, so favourites/playlists/local imports are not automatically synced across phones.
- If users can access a browser API key, they can sometimes copy it. Use quota controls and referrer restrictions or a server-side implementation for production.
- For stable usage, a browser with good PWA support is recommended.