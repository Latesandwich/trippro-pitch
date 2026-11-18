"""Layout helpers shared by test_deck.py and motion_helpers.py.

Boxes are measured relative to each slide's own <section>, in unscaled 1920x1080 units, so the deck
(reveal.js) and tests/reference.html (plain stacked slides) can be compared element by element.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORDER = json.loads((ROOT / "deck.json").read_text(encoding="utf-8"))["order"]
TOLERANCE_PX = 2

# The elements of one slide that the artifact also has: no notes, no .mo overlays (motion-step
# fragments included), and no x-icon / x-shape internals (their hosts are kept).
ITEMS_JS = """() => {
window.__slideItems = (section, withInternals) => {
  const out = [];
  for (const el of section.querySelectorAll('*')) {
    if (el.closest('aside') || el.closest('.mo')) continue;
    const host = el.parentElement && el.parentElement.closest('x-icon, x-shape');
    if (!withInternals && host && section.contains(host)) continue;
    out.push(el);
  }
  return out;
};
window.__label = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
  ? '.' + el.className.trim().split(/\\s+/).join('.') : '');
}"""

BOXES_JS = """id => {
  const section = document.getElementById(id);
  const s = section.getBoundingClientRect();
  const k = s.width / 1920;
  return window.__slideItems(section, false).map((el, i) => {
    const r = el.getBoundingClientRect();
    return { label: `${i}:${window.__label(el)}`, tag: el.tagName,
             box: [(r.x - s.x) / k, (r.y - s.y) / k, r.width / k, r.height / k] };
  });
}"""

STYLES_JS = """id => {
  const section = document.getElementById(id);
  return window.__slideItems(section, true).map((el, i) => {
    const cs = getComputedStyle(el);
    return { label: `${i}:${window.__label(el)}`, opacity: cs.opacity, transform: cs.transform };
  });
}"""

SETTLE_JS = """async () => {
  await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}"""

_reference_cache = {}


def load_reference(context, site_url):
    """{slide id: {"boxes": [...], "styles": [...]}} from tests/reference.html, computed once per run."""
    if site_url in _reference_cache:
        return _reference_cache[site_url]
    ref = context.new_page()
    try:
        ref.goto(site_url + "tests/reference.html")
        ref.wait_for_function("() => window.__ref && window.__ref.done === true", timeout=30_000)
        ref.evaluate(ITEMS_JS)
        ref.evaluate(SETTLE_JS)
        # deck.css plays the .in* rise once; measure its end state.
        ref.evaluate("() => document.getAnimations().forEach(a => a.finish())")
        data = {sid: {"boxes": ref.evaluate(BOXES_JS, sid), "styles": ref.evaluate(STYLES_JS, sid)} for sid in ORDER}
    finally:
        ref.close()
    _reference_cache[site_url] = data
    return data


def deck_boxes(page, slide_id):
    page.evaluate(ITEMS_JS)
    page.evaluate(SETTLE_JS)
    return page.evaluate(BOXES_JS, slide_id)


def deck_styles(page, slide_id):
    page.evaluate(ITEMS_JS)
    return page.evaluate(STYLES_JS, slide_id)


def box_mismatches(actual, expected, tol=TOLERANCE_PX):
    """Readable differences between two box lists; [] when every box is within tol px."""
    if [a["tag"] for a in actual] != [e["tag"] for e in expected]:
        return [f"element lists differ: {len(actual)} vs {len(expected)} elements; "
                f"first labels {[a['label'] for a in actual[:5]]} vs {[e['label'] for e in expected[:5]]}"]
    out = []
    for a, e in zip(actual, expected):
        if any(abs(x - y) > tol for x, y in zip(a["box"], e["box"])):
            out.append(f"{a['label']}: {[round(v, 1) for v in a['box']]} != ref {[round(v, 1) for v in e['box']]}")
    return out


def _norm_transform(value):
    return "none" if value in ("none", "matrix(1, 0, 0, 1, 0, 0)") else value


def style_mismatches(actual, expected):
    """Opacity and transform differences against the reference render (identity matrix == none)."""
    if len(actual) != len(expected):
        return [f"element lists differ: {len(actual)} vs {len(expected)}"]
    out = []
    for a, e in zip(actual, expected):
        if abs(float(a["opacity"]) - float(e["opacity"])) > 0.01:
            out.append(f"{a['label']}: opacity {a['opacity']} != ref {e['opacity']}")
        if _norm_transform(a["transform"]) != _norm_transform(e["transform"]):
            out.append(f"{a['label']}: transform {a['transform']} != ref {e['transform']}")
    return out
