"""Screenshots of every motion state, for review.

    python tests/shots.py <id> [<id> ...] --out <dir>
    python tests/shots.py --all --out <dir>

For each slide it saves <id>-0.png (the enter, finished) and <id>-<i>.png (click step i, finished), at
1920x1080 in headless Chrome. It starts and stops its own server and browser.
"""
import argparse
import http.server
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from playwright.sync_api import sync_playwright  # noqa: E402

from conftest import AWAIT_READY, READY_TIMEOUT_MS, _QuietServer, _RepoHandler  # noqa: E402
from layout import ORDER  # noqa: E402

IDLE = "() => !window.__deck.motion.isPlaying()"
FADE_MS = 450


def shoot(page, base, slide_id, out):
    page.goto(f"{base}index.html#/{ORDER.index(slide_id)}")
    page.wait_for_function("() => Boolean(window.__deck && window.__deck.ready)", timeout=READY_TIMEOUT_MS)
    page.evaluate(AWAIT_READY, READY_TIMEOUT_MS)
    steps = page.evaluate("id => document.querySelectorAll(`#${id} .motion-step`).length", slide_id)
    saved = []
    for i in range(steps + 1):
        if i:
            page.keyboard.press("PageDown")
            page.wait_for_function(f"() => window.__deck.motion.state().step === {i}", timeout=5_000)
        page.wait_for_function(IDLE, timeout=5_000)
        page.wait_for_timeout(FADE_MS if i == 0 else 100)
        path = out / f"{slide_id}-{i}.png"
        page.screenshot(path=str(path))
        saved.append(path)
    return saved


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("ids", nargs="*", help="slide ids, as in deck.json order")
    parser.add_argument("--all", action="store_true", help="every slide")
    parser.add_argument("--out", required=True, type=Path, help="output directory")
    args = parser.parse_args(argv)
    ids = ORDER if args.all else args.ids
    unknown = [i for i in ids if i not in ORDER]
    if not ids or unknown:
        parser.error(f"give slide ids from {ORDER} or --all" + (f"; unknown: {unknown}" if unknown else ""))
    args.out.mkdir(parents=True, exist_ok=True)

    server = _QuietServer(("127.0.0.1", 0), _RepoHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(channel="chrome", headless=True)
            try:
                context = browser.new_context(viewport={"width": 1920, "height": 1080})
                for slide_id in ids:
                    page = context.new_page()
                    page.on("pageerror", lambda e, s=slide_id: errors.append(f"{s}: {e}"))
                    page.on("console", lambda m, s=slide_id: m.type == "error" and errors.append(f"{s}: {m.text}"))
                    try:
                        for path in shoot(page, f"http://127.0.0.1:{server.server_port}/", slide_id, args.out):
                            print(path)
                    finally:
                        page.close()
                context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    for error in errors:
        print("ERROR", error, file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
