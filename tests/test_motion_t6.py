"""Task 6 motion: product, setup, hands, persona."""
import re
from html.parser import HTMLParser

from motion_helpers import check_slide, module_steps, open_slide, play_step, slide_html

OPACITIES = """sel => [...document.querySelectorAll(sel)].map(el => Number(getComputedStyle(el).opacity))"""

# Drawn share (0..1) of each hands strike line: no dash pattern means fully drawn; otherwise the
# first dash from offset 0 over the line's length.
STRIKES = """() => [...document.querySelectorAll('#hands .fact.prow svg > line')].map(line => {
  const cs = getComputedStyle(line);
  const len = line.getTotalLength();
  if (!cs.strokeDasharray || cs.strokeDasharray === 'none') return 1;
  const dash = parseFloat(cs.strokeDasharray.split(/[ ,]+/)[0]);
  const offset = parseFloat(cs.strokeDashoffset) || 0;
  return Math.abs(offset) > 0.5 ? 0 : Math.min(dash, len) / len;
})"""


class _FactTexts(HTMLParser):
    """Text of each div.fact.prow in a slide's HTML."""

    def __init__(self):
        super().__init__()
        self.texts, self._depth = [], 0

    def handle_starttag(self, tag, attrs):
        classes = (dict(attrs).get("class") or "").split()
        if self._depth:
            self._depth += tag == "div"
        elif tag == "div" and {"fact", "prow"} <= set(classes):
            self._depth = 1
            self.texts.append("")

    def handle_endtag(self, tag):
        if self._depth and tag == "div":
            self._depth -= 1

    def handle_data(self, data):
        if self._depth:
            self.texts[-1] += data


def _visible(values):
    return sum(1 for v in values if v > 0.99)


def test_product_motion(page, site_url):
    check_slide(page, site_url, "product")
    open_slide(page, site_url, "product")
    for k in range(4):
        if k:
            play_step(page, "product", k)
        cols = page.evaluate(OPACITIES, "#product .stepcol")
        assert len(cols) == 4
        assert _visible(cols) == k + 1, f"step {k}: {cols}"
        arrows = page.evaluate(OPACITIES, "#product x-shape.arrow")
        assert _visible(arrows) == k, f"step {k}: arrows {arrows}"


def test_setup_motion(page, site_url):
    check_slide(page, site_url, "setup")
    open_slide(page, site_url, "setup")
    for k in range(3):
        if k:
            play_step(page, "setup", k)
        cols = page.evaluate(OPACITIES, "#setup .flowrow > .stack:not(.ruled)")
        assert len(cols) == 3
        assert _visible(cols) == k + 1, f"step {k}: {cols}"
        (panel,) = page.evaluate(OPACITIES, "#setup .flowrow > .ruled.hot")
        assert (panel > 0.99) == (k == 2), f"step {k}: panel opacity {panel}"
        assert (panel < 0.01) == (k != 2), f"step {k}: panel opacity {panel}"
    pulses = page.evaluate("() => document.querySelectorAll('#setup .mo.pulse').length")
    assert pulses == 1


def test_hands_motion(page, site_url):
    check_slide(page, site_url, "hands")
    parser = _FactTexts()
    parser.feed(slide_html("hands"))
    facts = [re.sub(r"\s+", " ", t).strip() for t in parser.texts]
    assert len(facts) == 3
    assert module_steps(page, "hands") == facts

    open_slide(page, site_url, "hands")
    for k in range(4):
        if k:
            play_step(page, "hands", k)
        rows = page.evaluate(OPACITIES, "#hands .fact.prow")
        assert _visible(rows) == k and _visible(rows[:k]) == k, f"step {k}: rows {rows}"
        strikes = page.evaluate(STRIKES)
        assert all(s > 0.99 for s in strikes[:k]), f"step {k}: strikes {strikes}"
        (body,) = page.evaluate(OPACITIES, "#hands p.body.acc")
        assert (body > 0.99) == (k == 3), f"step {k}: body opacity {body}"


def test_persona_motion(page, site_url):
    check_slide(page, site_url, "persona")
