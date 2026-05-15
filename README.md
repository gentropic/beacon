# Switchboard QR

A tiny installable PWA that turns a URL or text into a QR code. No backend, no
tracking, no build step — a single `index.html` plus an icon, a manifest, and a
service worker.

## Features

- **Single page, zero dependencies.** Drop the files on any static host.
- **Installable PWA** with offline shell, theme-color, maskable icon.
- **Web Share Target.** Once installed, the OS share sheet can send a URL or
  text straight into the app — it appears prefilled and the QR renders.
- **Share rendered QR back out** via `navigator.share` (PNG file).
- **Copy text** to clipboard.
- Self-hosted fonts (Barlow, Space Mono) — works fully offline after first load.

## Deploy to GitHub Pages

1. Push to a repo (e.g. `beacon`).
2. Repo **Settings → Pages → Source: `main` / root**.
3. Wait a minute, then open `https://<user>.github.io/<repo>/`.

That's it — no `.nojekyll` needed (no underscore-prefixed files in this repo).

Because every path in `index.html`, `manifest.webmanifest`, and `sw.js` is
relative (`./…`), the same files also work under a custom domain or at any
subpath.

## Files

| Path                    | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `index.html`            | App shell + QR generator (vendored)      |
| `manifest.webmanifest`  | PWA manifest                             |
| `sw.js`                 | Service worker (precaches shell)         |
| `icon.svg`              | Source icon                              |
| `icon-192.png`          | Manifest icon (192×192)                  |
| `icon-512.png`          | Manifest icon (512×512, also maskable)   |
| `apple-touch-icon.png`  | iOS home-screen icon (180×180)           |
| `fonts/*.woff2`         | Self-hosted Barlow + Space Mono (latin)  |

## Updating the service worker

Bump `VERSION` in `sw.js` on every deploy that changes a precached asset. The
activate handler will delete the stale cache.

## License

MIT — see [LICENSE](LICENSE).
