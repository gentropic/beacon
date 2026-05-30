# beacon

A tiny installable PWA that turns a URL or text into a QR code, and — its reason
for existing in the [GCU](https://gentropic.org) stack — turns a **capsule** share
link into the *smallest scannable* QR automatically.

One `index.html` plus an icon, a manifest, and a service worker. No backend, no
tracking, no build step, no dependencies. Drop it on any static host.

## What it does

- **URL / text → QR.** Type, paste, or share something in; a QR renders live.
- **Share Target.** Once installed, the OS share sheet can send a URL or text
  straight into beacon — it arrives prefilled and the QR is already drawn. Share
  a link from any app, get a QR.
- **Share the QR back out** as a PNG via `navigator.share`, or **copy the text**.
- **Installable PWA** — offline shell, theme color, maskable icon, self-hosted
  fonts (Barlow + Space Mono). Works fully offline after first load.

## Capsule auto-optimization

This is the part that earns beacon its place in the stack.

A **capsule** (see [`gentropic/cradle`](https://github.com/gentropic/cradle) →
`SPEC-capsule.md` / `CAPSULES.md`) is a share URL whose fragment carries
deflate-compressed content inline — the kind of link ep, the cradle bootloader,
and other GCU tools produce (`…#i:d<base64url>` or `…#q:d<base45>`). When you
share one of those to beacon, it doesn't just QR-encode the string verbatim:

1. **Detects** that the fragment is a capsule.
2. **Re-encodes** the payload to the `q:` (base45) form — a plain base re-encoding
   of the *same compressed bytes*, no decompression, no idea what's inside.
3. **Emits a two-segment QR**: the URL + scheme framing in Byte mode, the base45
   payload in **Alphanumeric** mode. base45's alphabet is exactly the QR
   alphanumeric charset, so the payload packs at 5.5 bits/char instead of Byte
   mode's 8 — a **~16–22% smaller code** for the same content. Often the
   difference between a QR that scans casually from across a table and one that
   doesn't.

A quiet note appears when this kicks in (`✦ capsule — QR-optimized · 37×37 → 31×31`,
or "too large as plain text" when the byte-mode version wouldn't even fit). The
textarea, Copy, and Share-text are untouched — only the **QR image** is optimized,
because base64url stays the nicer form for pasting a link into chat. Non-capsule
input behaves exactly as a plain QR generator. It Just Works when you share a
capsule to it; you don't toggle anything.

## Deploy (GitHub Pages)

1. Push to the repo.
2. **Settings → Pages → Source: `main` / root**.
3. Open `https://<user>.github.io/<repo>/` (or the custom domain).

No `.nojekyll` needed. Every path in `index.html`, `manifest.webmanifest`, and
`sw.js` is relative (`./…`), so it works at the domain root, a subpath, or a custom
domain unchanged.

## Files

| Path | Purpose |
|---|---|
| `index.html` | App shell, the vendored QR encoder (Kazuhiko Arase's `qrcode-generator`, MIT), and the capsule machinery |
| `manifest.webmanifest` | PWA manifest (incl. the `share_target` declaration) |
| `sw.js` | Service worker — precaches the shell for offline |
| `icon.svg` / `icon-{192,512}.png` / `apple-touch-icon.png` | Icons |
| `fonts/*.woff2` | Self-hosted Barlow + Space Mono (latin subset) |

## Maintenance notes

- **Bump `VERSION` in `sw.js`** on every deploy that changes a precached asset
  (currently `beacon-v1`). The `activate` handler deletes the stale cache so
  installed users pick up the change.
- The capsule logic (base64url decode, base45 encode, the `q:` fragment escaping)
  is inlined and mirrors the reference in `gentropic/cradle`'s `CAPSULES.md` and
  ep's `src/js/capsule.js`. If the capsule wire format ever changes, keep those in
  sync. When `@gcu/capsule` becomes a published package, this can shrink to an import.

## License

MIT — see [LICENSE](LICENSE). © Geoscientific Chaos Union.
