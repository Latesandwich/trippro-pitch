"""Shared checks for the per-slide motion modules (Tasks 5-8).

Usage in tests/test_motion_t<N>.py:

    from motion_helpers import check_slide

    def test_scenario_motion(page, site_url):
        check_slide(page, site_url, "scenario")
        ...slide-specific assertions...

Text assertions must compare against the slide's own imported HTML (slide_html(id)), never literals.
"""
import re

from conftest import _open_deck
from layout import ORDER, ROOT, box_mismatches, deck_boxes, deck_styles, load_reference, style_mismatches

EXPECTED_STEPS = {
    "cover": 0, "persona": 0, "hands": 3, "idea": 1, "product": 3,
    "setup": 2, "scenario": 3, "proof": 2, "unique": 1, "market": 1,
    "shop": 2, "model": 3, "breakeven": 3, "team": 0, "close": 0,
}
assert sum(EXPECTED_STEPS.values()) == 24 and list(EXPECTED_STEPS) == ORDER

THAI = re.compile(r"[฀-๿]")
IDLE = "() => !window.__deck.motion.isPlaying()"
STATE = "() => window.__deck.motion.state()"
FADE_MS = 450  # reveal's 0.4 s fade between slides


def slide_html(slide_id):
    """The imported slides/<id>.html, as text, for comparing slide text."""
    return (ROOT / "slides" / f"{slide_id}.html").read_text(encoding="utf-8")


def wait_idle(page, timeout=5_000):
    page.wait_for_function(IDLE, timeout=timeout)


def open_slide(page, site_url, slide_id, query=""):
    """Fresh forward entry onto slide_id (its enter plays); returns once the enter has finished."""
    if page.url != "about:blank":
        page.goto("about:blank")
    _open_deck(page, site_url, f"{query}#/{ORDER.index(slide_id)}")
    wait_idle(page)
    page.wait_for_timeout(FADE_MS)


def play_step(page, slide_id, i):
    """Press PageDown once and wait until click step i has finished playing."""
    page.keyboard.press("PageDown")
    page.wait_for_function(f"() => window.__deck.motion.state().step === {i}", timeout=5_000)
    wait_idle(page)
    assert page.evaluate(STATE) == {"slide": slide_id, "step": i}


def module_steps(page, slide_id):
    """The steps array of js/slides/<id>.js, as the page loaded it."""
    return page.evaluate("""async id => {
        const all = (await import(new URL('js/slides/index.js', location.href))).default;
        const def = all.find(m => m.id === id);
        return def ? def.steps : null;
    }""", slide_id)


def check_slide(page, site_url, slide_id):
    """The shared motion contract for one slide (see shared-motion-test.md):
    1. steps length == EXPECTED_STEPS[id], every label non-empty Thai;
    2. duration(id, 0) <= 1.8 s, duration(id, i) <= 1.2 s;
    3. playing forward through every step logs no errors;
    4. finished state: every original element (not .mo) has the reference opacity and transform
       (opacity 1 and its inline transform, or none);
    5. finished state: every original box is within 2 px of tests/reference.html.
    """
    expected = EXPECTED_STEPS[slide_id]
    reference = load_reference(page.context, site_url)
    open_slide(page, site_url, slide_id)

    steps = module_steps(page, slide_id)
    assert steps is not None, f"js/slides/index.js has no module for {slide_id}"
    assert len(steps) == expected, f"{slide_id}: {len(steps)} steps, expected {expected}"
    for label in steps:
        assert isinstance(label, str) and label.strip() and THAI.search(label), f"{slide_id}: bad label {label!r}"

    for i in range(1, expected + 1):
        play_step(page, slide_id, i)
    page.wait_for_timeout(100)
    assert page.errors == [], page.errors

    styles = style_mismatches(deck_styles(page, slide_id), reference[slide_id]["styles"])
    assert styles == [], f"{slide_id} finished state: {styles[:10]}"
    boxes = box_mismatches(deck_boxes(page, slide_id), reference[slide_id]["boxes"])
    assert boxes == [], f"{slide_id} finished layout: {boxes[:10]}"

    enter = page.evaluate("id => window.__deck.motion.duration(id, 0)", slide_id)
    assert enter <= 1.8, f"{slide_id}: enter lasts {enter} s"
    for i in range(1, expected + 1):
        seconds = page.evaluate("([id, i]) => window.__deck.motion.duration(id, i)", [slide_id, i])
        assert seconds <= 1.2, f"{slide_id}: step {i} lasts {seconds} s"
    assert page.evaluate(STATE) == {"slide": slide_id, "step": expected}
    assert page.errors == [], page.errors
