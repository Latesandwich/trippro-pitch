"""Shared fixtures: a local HTTP server for the repo and a headless Chrome page.

Both shut down on teardown, so no server or browser outlives the test run.
"""
import http.server
import sys
import threading
from pathlib import Path

import pytest
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
READY_TIMEOUT_MS = 30_000

# Resolves once window.__deck.ready settles, with a bound: page.evaluate has no timeout of its own.
AWAIT_READY = """ms => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`not ready after ${ms} ms`)), ms);
  window.__deck.ready.then(
    () => { clearTimeout(timer); resolve(); },
    error => { clearTimeout(timer); reject(error); },
  );
})"""


class _RepoHandler(http.server.SimpleHTTPRequestHandler):
    """Serves the repo root without logging, with MIME types that don't depend on the Windows registry."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".css": "text/css",
        ".html": "text/html",
        ".js": "text/javascript",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        pass


class _QuietServer(http.server.ThreadingHTTPServer):
    """Ignores clients that hang up mid-response (a page closed while an image was still loading).

    The default listen backlog of 5 drops connections when the deck fetches its 15 slides at once."""

    request_queue_size = 128

    def handle_error(self, request, client_address):
        if isinstance(sys.exc_info()[1], ConnectionError):
            return
        super().handle_error(request, client_address)


@pytest.fixture(scope="session")
def site_url():
    """Base URL, ending in '/', of an http.server on 127.0.0.1 at a free port serving the repo root."""
    server = _QuietServer(("127.0.0.1", 0), _RepoHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


@pytest.fixture(scope="session")
def browser():
    """One headless Chrome (the installed Chrome channel) for the whole run."""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=True)
        try:
            yield browser
        finally:
            browser.close()


@pytest.fixture
def page(browser):
    """A fresh 1920x1080 page in its own context; page.errors collects console errors and page errors."""
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()
    page.errors = []

    def on_console(message):
        if message.type == "error":
            url = message.location.get("url")
            page.errors.append(f"{message.text} [{url}]" if url else message.text)

    page.on("console", on_console)
    page.on("pageerror", lambda error: page.errors.append(str(error)))
    try:
        yield page
    finally:
        context.close()


def _open_deck(page, site_url, hash=""):
    """Go to site_url + 'index.html' + hash and wait for window.__deck.ready (set up by js/app.js)."""
    page.goto(site_url + "index.html" + hash)
    try:
        # Boolean on purpose: given the promise itself, wait_for_function would wait on it, bypassing AWAIT_READY.
        page.wait_for_function("() => Boolean(window.__deck && window.__deck.ready)", timeout=READY_TIMEOUT_MS)
        page.evaluate(AWAIT_READY, READY_TIMEOUT_MS)
    except PlaywrightError as error:
        pytest.fail(f"window.__deck.ready failed: {error.message}\npage errors: {page.errors}")


@pytest.fixture
def open_deck():
    """open_deck(page, site_url, hash="") -> None; hash is appended as is, e.g. "#/2" or "?static"."""
    return _open_deck
