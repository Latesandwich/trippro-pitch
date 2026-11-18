# TripPRO pitch

The TripPRO pitch deck (15 slides, in Thai) as a static website for presenting live, built with reveal.js and GSAP and published with GitHub Pages at https://latesandwich.github.io/trippro-pitch/.

## Present

Open the URL in Chrome or Edge (Safari is untested). Press `S` for the speaker window (notes, cues, timer); show the main window on the projector.

## Keys

- Right arrow, Space, PageDown: next click or slide. Left arrow, PageUp: back.
- `S` speaker window, `F` full screen, `O` overview, `B` black screen, `?` help.
- Add `?static` to the URL to see every slide finished, `?reduced` to skip animations.
- `cues.html` is a printable A4 cue sheet (one line per slide plus every click).

## Before the pitch

Open the URL once while online. The service worker then caches the whole deck, so it opens with no signal. Reload once after any update.

## Offline backup

Download the repository as a ZIP, unpack it, and run `serve.cmd` (Windows) or `serve.command` (macOS). It serves the folder at http://localhost:8000/. The speaker window needs http, not `file://`.

## Fix a typo

Edit the slide text in `slides/<id>.html` (speaker notes are its `<aside>`), commit, and push. Then run `python tools/precache.py` before committing so the offline cache picks up the change.

## Sync from the artifact

`python tools/import_artifact.py` re-imports the slides from the original artifact. Run `python tools/precache.py` afterwards.

## Development

- `python tools/fetch_vendor.py` downloads reveal.js 5.1.0, GSAP 3.13.0 and the Anuphan, Inter and Noto Sans Thai fonts into `vendor/` and `fonts/`, writes `css/fonts.css`, and pins every downloaded file's sha256 in `vendor/MANIFEST.json`. The downloads are committed, so the site never loads anything from a CDN.
- `python -m pytest -q` runs the tests. They need pytest, Playwright for Python and an installed Google Chrome.
- `python tools/precache.py` regenerates the offline file list and version in `sw.js`. Run it last.

## Credits

See `credits.html`: photos by Apicha.t (CC BY-SA 3.0) and Shane WP Wongperk (CC BY-SA 4.0), map data © OpenStreetMap contributors, Lucide icons (ISC), reveal.js (MIT), GSAP, and the Anuphan, Inter and Noto Sans Thai fonts (SIL Open Font License).
