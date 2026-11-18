"""Task 7: motion for shop, model, breakeven. Geometry is read from the live layout, never hardcoded."""
from motion_helpers import check_slide, open_slide, play_step

# Box of one element relative to its section, in 1920x1080 units.
BOX_JS = """([id, sel]) => {
  const section = document.getElementById(id);
  const s = section.getBoundingClientRect(), k = s.width / 1920;
  const r = section.querySelector(sel).getBoundingClientRect();
  return [(r.x - s.x) / k, (r.y - s.y) / k, r.width / k, r.height / k];
}"""

# Rects of shop's projection svg, smallest (the card on the phone) first.
RECTS_JS = """() => {
  const section = document.getElementById('shop');
  const s = section.getBoundingClientRect(), k = s.width / 1920;
  return [...section.querySelectorAll('svg.in3 rect')].map(el => {
    const r = el.getBoundingClientRect();
    return [(r.x - s.x) / k, (r.y - s.y) / k, r.width / k, r.height / k];
  }).sort((a, b) => a[2] * a[3] - b[2] * b[3]);
}"""

CARD = '[id="28ad3da5"]'


def near(a, b, tol=1.0):
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def visible(page, selector):
    return page.evaluate("""sel => [...document.querySelectorAll(sel)]
        .filter(el => parseFloat(getComputedStyle(el).opacity) > 0.99).length""", selector)


def test_shop_motion(page, site_url):
    check_slide(page, site_url, "shop")

    open_slide(page, site_url, "shop")
    small, big = page.evaluate(RECTS_JS)[0], page.evaluate(RECTS_JS)[-1]
    rest = page.evaluate(BOX_JS, ["shop", CARD])
    assert near(rest, big, 1.5), f"card {rest} vs its outline {big}"
    assert page.evaluate("sel => getComputedStyle(document.querySelector(sel)).opacity", CARD) == "0"
    assert visible(page, "#shop .fact.prow") == 0

    # Two frames into click 1 the enlarged card sits on the small card's box.
    start = page.evaluate("sel => new Promise(resolve => { const box = " + BOX_JS + """;
        window.Reveal.next();
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(box(['shop', sel]))));
    })""", CARD)
    assert near(start, small, 1.5), f"zoom starts at {start}, small card is {small}"
    page.wait_for_function("() => !window.__deck.motion.isPlaying()")
    assert page.evaluate("() => window.__deck.motion.state()") == {"slide": "shop", "step": 1}
    after = page.evaluate(BOX_JS, ["shop", CARD])
    assert near(after, rest, 1.0) and near(after, big, 1.5), f"after click 1 card is {after}"
    assert visible(page, "#shop .fact.prow") == 0

    play_step(page, "shop", 2)
    assert visible(page, "#shop .fact.prow") == 3


def test_model_motion(page, site_url):
    check_slide(page, site_url, "model")
    open_slide(page, site_url, "model")
    assert visible(page, "#model .price") == 0
    for k in (1, 2, 3):
        play_step(page, "model", k)
        assert visible(page, "#model .price") == k
    assert page.evaluate("() => document.querySelectorAll('#model .mo.orbit').length") == 1
    # It actually moves.
    a = page.evaluate("() => document.querySelector('#model .mo.orbit').getBoundingClientRect().x")
    page.wait_for_timeout(400)
    b = page.evaluate("() => document.querySelector('#model .mo.orbit').getBoundingClientRect().x")
    assert abs(a - b) > 1


def test_breakeven_motion(page, site_url):
    check_slide(page, site_url, "breakeven")
    open_slide(page, site_url, "breakeven")
    counts = [visible(page, "#breakeven .blk")]
    for k in (1, 2, 3):
        play_step(page, "breakeven", k)
        counts.append(visible(page, "#breakeven .blk"))
    assert counts == [0, 17, 27, 32]
    assert page.evaluate("() => getComputedStyle(document.querySelector('#breakeven p.body')).opacity") == "1"
