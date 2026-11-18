"""Offline service worker, cue sheet, credits. Each test uses its own browser context, closed on teardown."""
import re

import pytest

from conftest import ROOT
from motion_helpers import EXPECTED_STEPS

EXCLUDED_DIRS = {"tests", "tools"}


def _site_files():
    files = []
    for path in ROOT.rglob("*"):
        rel = path.relative_to(ROOT)
        if not path.is_file() or rel.as_posix() == "sw.js":
            continue
        if any(part.startswith(".") or part in EXCLUDED_DIRS or part == "__pycache__" for part in rel.parts):
            continue
        if rel.name.startswith("serve.") or rel.suffix == ".md":
            continue
        files.append(rel.as_posix())
    return files


@pytest.fixture
def offline_page(browser):
    context = browser.new_context(viewport={"width": 1920, "height": 1080}, service_workers="allow")
    page = context.new_page()
    page.errors = []
    page.on("pageerror", lambda error: page.errors.append(str(error)))
    try:
        yield page, context
    finally:
        try:
            page.evaluate("navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister())))")
        except Exception:
            pass
        context.close()


def _ready_online(page, site_url, suffix=""):
    page.goto(site_url + "index.html" + suffix)
    page.wait_for_function("() => Boolean(window.__deck)", timeout=30_000)
    page.evaluate("() => window.__deck.ready")
    page.evaluate("() => navigator.serviceWorker.ready.then(() => true)")


def test_sw_serves_offline(offline_page, site_url):
    page, context = offline_page
    _ready_online(page, site_url)
    context.set_offline(True)
    page.reload()
    page.wait_for_function("() => Boolean(window.__deck)", timeout=30_000)
    page.evaluate("() => window.__deck.ready")
    assert page.locator(".reveal .slides > section").count() == 15
    assert page.errors == []
    broken = page.evaluate("() => [...document.images].filter(i => i.naturalWidth === 0).map(i => i.src)")
    assert broken == []


def test_receiver_url_offline(offline_page, site_url):
    page, context = offline_page
    _ready_online(page, site_url)
    context.set_offline(True)
    page.goto(site_url + "index.html?receiver")
    page.wait_for_function("() => Boolean(window.__deck)", timeout=30_000)
    page.evaluate("() => window.__deck.ready")
    assert page.locator(".reveal .slides > section").count() == 15


def test_precache_complete():
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    cached = set(re.findall(r'"([^"\n]+)"', sw[sw.index("PRECACHE"):]))
    missing = [f for f in _site_files() if f not in cached]
    assert missing == []


def test_cues_lists_24(page, site_url):
    page.goto(site_url + "cues.html")
    page.wait_for_function("() => document.body.dataset.ready === '1'", timeout=30_000)
    assert page.inner_text("body").count("▶ คลิก") == sum(EXPECTED_STEPS.values())


def test_credits():
    text = (ROOT / "credits.html").read_text(encoding="utf-8")
    for needle in ["Apicha.t, CC BY-SA 3.0", "Shane WP Wongperk, CC BY-SA 4.0", "© OpenStreetMap contributors",
                   "Lucide", "ISC", "reveal.js", "MIT", "GSAP", "Anuphan", "Inter", "Noto Sans Thai",
                   "SIL Open Font License"]:
        assert needle in text, needle
