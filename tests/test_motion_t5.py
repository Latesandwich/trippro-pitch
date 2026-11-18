"""Task 5: motion for scenario, proof and idea (the field-test story and the hero notification)."""
import re
from html.parser import HTMLParser

from layout import ITEMS_JS, box_mismatches, deck_boxes, load_reference
from motion_helpers import check_slide, open_slide, play_step, slide_html


class _Texts(HTMLParser):
    """Text of every element matching a predicate on (tag, class list), in document order."""

    def __init__(self, match):
        super().__init__()
        self.match, self.depth, self.buf, self.out = match, 0, [], []

    def handle_starttag(self, tag, attrs):
        if self.depth:
            self.depth += 1
        elif self.match(tag, (dict(attrs).get("class") or "").split()):
            self.depth, self.buf = 1, []

    def handle_endtag(self, tag):
        if self.depth:
            self.depth -= 1
            if not self.depth:
                self.out.append(re.sub(r"\s+", " ", "".join(self.buf)).strip())

    def handle_data(self, data):
        if self.depth:
            self.buf.append(data)


def html_texts(slide_id, match):
    parser = _Texts(match)
    parser.feed(slide_html(slide_id))
    return parser.out


def text_of(page, selector):
    return page.evaluate("s => document.querySelector(s).textContent.replace(/\\s+/g, ' ').trim()", selector)


def opacity_of(page, selector):
    return page.evaluate("s => [...document.querySelectorAll(s)].map(el => Number(getComputedStyle(el).opacity))",
                         selector)


def test_scenario_motion(page, site_url):
    check_slide(page, site_url, "scenario")
    subs = html_texts("scenario", lambda tag, cls: tag == "p" and "sub" in cls)
    assert len(subs) == 3
    assert text_of(page, "#scenario .fact.prow:nth-of-type(3) p.sub") == subs[2]

    # rows come in one per click; the third row counts up and ends on the exact original text
    open_slide(page, site_url, "scenario")
    assert opacity_of(page, "#scenario .fact.prow") == [0, 0, 0]
    for i in (1, 2, 3):
        play_step(page, "scenario", i)
        assert opacity_of(page, "#scenario .fact.prow") == [1] * i + [0] * (3 - i)
    assert text_of(page, "#scenario .fact.prow:nth-of-type(3) p.sub") == subs[2]
    assert page.errors == []


RING_POINTS = [(40, 22), (160, 150), (40, 200)]

RINGS_JS = """() => {
  const svg = document.querySelector('#proof .diag svg');
  const s = svg.getBoundingClientRect(), k = s.width / 340;
  return [...document.querySelectorAll('#proof .mo.ring')].map(r => {
    const b = r.getBoundingClientRect();
    return [(b.x + b.width / 2 - s.x) / k, (b.y + b.height / 2 - s.y) / k];
  });
}"""


def test_proof_motion(page, site_url):
    check_slide(page, site_url, "proof")
    nums = html_texts("proof", lambda tag, cls: tag == "p" and "num" in cls)
    assert text_of(page, "#proof .num") == nums[0]

    open_slide(page, site_url, "proof")
    assert page.evaluate("() => document.querySelectorAll('#proof .mo.ring').length") == 0
    assert opacity_of(page, "#proof .ruled.hot") == [0]

    play_step(page, "proof", 1)
    centres = page.evaluate(RINGS_JS)
    assert len(centres) == 3, centres
    for cx, cy in RING_POINTS:
        assert any(abs(x - cx) <= 3 and abs(y - cy) <= 3 for x, y in centres), (cx, cy, centres)
    # the grey convoy dots get no ring
    for cx, cy in [(40, 74), (40, 116)]:
        assert not any(abs(x - cx) <= 3 and abs(y - cy) <= 3 for x, y in centres)
    # the travelling dot sits at the off-route point
    dot = page.evaluate("""() => {
        const svg = document.querySelector('#proof .diag svg'), d = svg.querySelector('.mo.dot');
        const s = svg.getBoundingClientRect(), b = d.getBoundingClientRect(), k = s.width / 340;
        return [(b.x + b.width / 2 - s.x) / k, (b.y + b.height / 2 - s.y) / k];
    }""")
    assert abs(dot[0] - 160) <= 3 and abs(dot[1] - 150) <= 3, dot

    play_step(page, "proof", 2)
    assert text_of(page, "#proof .num") == nums[0]
    assert opacity_of(page, "#proof .ruled.hot") == [1]
    # the dot is back on the convoy line
    dot = page.evaluate("""() => {
        const svg = document.querySelector('#proof .diag svg'), d = svg.querySelector('.mo.dot');
        const s = svg.getBoundingClientRect(), b = d.getBoundingClientRect(), k = s.width / 340;
        return [(b.x + b.width / 2 - s.x) / k, (b.y + b.height / 2 - s.y) / k];
    }""")
    assert abs(dot[0] - 40) <= 3, dot
    assert page.errors == []


# The white notification card: the absolutely positioned block in the photo column. It gets a marker
# attribute so plain selectors can reach it (inline style text is not a stable selector).
CARD = "#idea [data-t5-card]"
MARK_CARD_JS = """() => {
  const card = [...document.querySelectorAll('#idea .in2 > div')].find(d => d.style.position === 'absolute');
  card.setAttribute('data-t5-card', '');
  return window.__slideItems(document.getElementById('idea'), false).indexOf(card);
}"""


def test_idea_motion(page, site_url):
    check_slide(page, site_url, "idea")
    reference = load_reference(page.context, site_url)

    open_slide(page, site_url, "idea")
    page.evaluate(ITEMS_JS)
    index = page.evaluate(MARK_CARD_JS)
    assert index >= 0
    assert opacity_of(page, CARD) == [0]
    assert opacity_of(page, "#idea .in4 > p") == [0, 0, 0]

    play_step(page, "idea", 1)
    assert opacity_of(page, CARD) == [1]
    assert opacity_of(page, "#idea .in4 > p") == [1, 1, 1]
    boxes = deck_boxes(page, "idea")
    assert box_mismatches([boxes[index]], [reference["idea"]["boxes"][index]]) == []
    assert page.evaluate("() => document.querySelectorAll('#idea .mo.ring').length") == 1
    assert page.errors == []
