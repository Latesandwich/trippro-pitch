"""Task 4: the motion engine (fragments, cues, click guard, backward/overview/print finish, route wipe).

Every test runs with ?fixture, which gives `hands` 2 steps of 600 ms each (tests/fixtures/motion_fixture.js).
"""
from layout import ORDER

HANDS = ORDER.index("hands")
IDEA = ORDER.index("idea")
PERSONA = ORDER.index("persona")
PRODUCT = ORDER.index("product")

WAIT_IDLE = "() => !window.__deck.motion.isPlaying()"
STATE = "() => window.__deck.motion.state()"

# Everything on one slide that motion can change: opacity, transform and box of every element but the notes.
SNAPSHOT_JS = """id => {
  const section = document.getElementById(id);
  const s = section.getBoundingClientRect();
  return [...section.querySelectorAll('*')]
    .filter(el => !el.closest('aside') && !el.classList.contains('motion-step'))
    .map(el => {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      return [el.tagName, el.getAttribute('class') || '', Number(cs.opacity).toFixed(2), cs.transform,
              ...[r.x - s.x, r.y - s.y, r.width, r.height].map(v => Math.round(v))];
    });
}"""

# Samples #wipe's visibility every frame for 1 s after calling Reveal[method]().
SAMPLE_WIPE_JS = """async method => {
  const wipe = document.getElementById('wipe');
  const visible = () => {
    const cs = getComputedStyle(wipe);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0;
  };
  const samples = [];
  const t0 = performance.now();
  Reveal[method]();
  await new Promise(done => {
    const tick = () => {
      const t = performance.now() - t0;
      samples.push([t, visible()]);
      if (t < 1000) requestAnimationFrame(tick); else done();
    };
    tick();
  });
  return samples;
}"""


def _open(page, site_url, open_deck, query="?fixture", hash=""):
    open_deck(page, site_url, query + hash)
    page.wait_for_function(WAIT_IDLE, timeout=5_000)


def test_fragments_from_steps(page, site_url, open_deck):
    _open(page, site_url, open_deck)
    counts = page.evaluate("""() => Object.fromEntries([...document.querySelectorAll('.reveal .slides > section')]
        .map(s => [s.id, s.querySelectorAll('span.fragment.motion-step').length]))""")
    assert counts["hands"] == 2
    assert page.errors == []


def test_cues_in_notes(page, site_url, open_deck):
    _open(page, site_url, open_deck)
    notes = page.evaluate("() => document.querySelector('#hands aside.notes').textContent")
    assert notes.startswith("▶ คลิก 1:")
    assert "\n▶ คลิก 2:" in notes
    original = (page.evaluate("() => fetch('slides/hands.html').then(r => r.text())"))
    assert notes.split("\n", 2)[2].strip()[:40] in original


def test_api_next_during_animation_completes(page, site_url, open_deck):
    _open(page, site_url, open_deck, hash=f"#/{HANDS}")
    page.keyboard.press("PageDown")
    state, playing = page.evaluate("""() => {
        const m = window.__deck.motion, wasPlaying = m.isPlaying();
        Reveal.next();
        return [m.state(), wasPlaying && !m.isPlaying()];
    }""")
    assert state == {"slide": "hands", "step": 1}
    assert playing is True  # step 1 was playing, and next() completed it instead of navigating
    assert page.evaluate(STATE) == {"slide": "hands", "step": 1}

    # The keyboard goes through the same guard: the second key only finishes step 2.
    page.keyboard.press("PageDown")
    page.keyboard.press("PageDown")
    assert page.evaluate("() => [window.__deck.motion.state(), window.__deck.motion.isPlaying()]") == [
        {"slide": "hands", "step": 2}, False]
    assert page.errors == []


def test_rapid_presses_stay_consistent(page, site_url, open_deck):
    open_deck(page, site_url, f"?fixture#/{HANDS}")
    for _ in range(10):
        page.keyboard.press("PageDown")
        page.wait_for_timeout(30)
    page.evaluate("() => window.__deck.motion.complete()")
    page.wait_for_function(WAIT_IDLE, timeout=5_000)
    assert page.errors == []
    state = page.evaluate(STATE)
    index = ORDER.index(state["slide"])
    assert index > HANDS or (state["slide"] == "hands" and 0 <= state["step"] <= 2), state
    page.wait_for_timeout(500)  # let the 0.4 s fade settle
    played = page.evaluate(SNAPSHOT_JS, state["slide"])

    fresh = page.context.new_page()
    try:
        _open(fresh, site_url, open_deck, hash=f"#/{index}")
        if state["step"]:
            fresh.evaluate("([h, f]) => Reveal.slide(h, 0, f)", [index, state["step"] - 1])
        fresh.evaluate("() => window.__deck.motion.complete()")
        assert fresh.evaluate(STATE) == state
        fresh.wait_for_timeout(500)
        assert fresh.evaluate(SNAPSHOT_JS, state["slide"]) == played
    finally:
        fresh.close()


def test_backward_shows_final(page, site_url, open_deck):
    _open(page, site_url, open_deck, hash=f"#/{IDEA}")
    result = page.evaluate("""() => {
        Reveal.prev();
        const m = window.__deck.motion;
        const marker = document.querySelector('#hands .fixture-marker');
        return [m.state(), m.isPlaying(), gsap.getProperty(marker, 'x'),
                [...document.querySelectorAll('#hands :is(.in1,.in2,.in3,.in4,.in5)')]
                  .map(el => getComputedStyle(el).opacity)];
    }""")
    state, playing, marker_x, opacities = result
    assert state == {"slide": "hands", "step": 2}
    assert playing is False
    assert marker_x == 200
    assert opacities and all(o == "1" for o in opacities)
    assert page.errors == []


def test_hash_jump_lands_on_step_zero(page, site_url, open_deck):
    open_deck(page, site_url, f"?fixture#/{HANDS}")
    assert page.evaluate(STATE) == {"slide": "hands", "step": 0}


def test_wipe_on_section_change(page, site_url, open_deck):
    _open(page, site_url, open_deck, hash=f"#/{IDEA}")
    samples = page.evaluate(SAMPLE_WIPE_JS, "next")
    assert page.evaluate(STATE)["slide"] == "product"
    shown = [t for t, visible in samples if visible]
    assert shown and shown[0] <= 100, samples[:10]
    assert not [t for t, visible in samples if visible and t > 800]

    # backwards: never
    page.wait_for_function(WAIT_IDLE, timeout=5_000)
    samples = page.evaluate(SAMPLE_WIPE_JS, "prev")
    assert page.evaluate(STATE)["slide"] == "idea"
    assert not [t for t, visible in samples if visible]

    # same section (persona -> hands), and click steps inside a slide: never
    page.evaluate("i => Reveal.slide(i)", PERSONA)
    page.wait_for_function(WAIT_IDLE, timeout=5_000)
    for expected in [("hands", 0), ("hands", 1), ("hands", 2)]:
        samples = page.evaluate(SAMPLE_WIPE_JS, "next")
        assert page.evaluate(STATE) == {"slide": expected[0], "step": expected[1]}
        assert not [t for t, visible in samples if visible]
        page.wait_for_function(WAIT_IDLE, timeout=5_000)
    assert page.errors == []


def test_print_pdf_final(page, site_url, open_deck):
    open_deck(page, site_url, "?print-pdf&fixture")
    opacities = page.evaluate("""() => [...document.querySelectorAll('#hands *')]
        .filter(el => !el.closest('aside') && !el.closest('.mo'))
        .map(el => getComputedStyle(el).opacity)""")
    assert len(opacities) > 10
    assert set(opacities) == {"1"}
    assert page.errors == []


def test_overview_shows_final(page, site_url, open_deck):
    open_deck(page, site_url, "?fixture")
    opacities = page.evaluate("""async () => {
        Reveal.toggleOverview(true);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return [...document.querySelectorAll('.reveal .slides > section')].flatMap(s =>
            [...s.querySelectorAll('.in1, .in2, .in3, .in4, .in5')].map(el => [s.id, getComputedStyle(el).opacity]));
    }""")
    assert len(opacities) > 20
    assert [o for o in opacities if o[1] != "1"] == []
    assert page.errors == []
