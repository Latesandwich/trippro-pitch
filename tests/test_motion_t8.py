"""Task 8: motion for cover, close, unique, market and team."""
import re

from motion_helpers import check_slide, open_slide, play_step, slide_html

# Distance (in 1920-px slide units) from each close dot to the end of its route path.
CLOSE_DOT_GAPS = """() => {
  const section = document.getElementById('close');
  const k = section.getBoundingClientRect().width / 1920;
  const path = section.querySelector('svg.mo path.route');
  const m = path.getScreenCTM();
  const p = path.getPointAtLength(path.getTotalLength());
  const end = { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
  return [...section.querySelectorAll('svg.mo .dot')].map(dot => {
    const r = dot.getBoundingClientRect();
    return Math.hypot(r.x + r.width / 2 - end.x, r.y + r.height / 2 - end.y) / k;
  });
}"""

MARKET_BARS = """() => {
  const section = document.getElementById('market');
  const k = section.getBoundingClientRect().width / 1920;
  return [...section.querySelectorAll('.hbar')].map(bar => ({
    width: bar.getBoundingClientRect().width / k,
    value: bar.nextElementSibling.textContent,
  }));
}"""


def test_cover_motion(page, site_url):
    check_slide(page, site_url, "cover")
    dots = page.evaluate("() => document.querySelectorAll('#cover .mo .dot').length")
    assert dots >= 5, f"cover has {dots} route dots"
    line = page.evaluate("() => document.querySelectorAll('#cover svg.mo path.route').length")
    assert line == 1


def test_close_motion(page, site_url):
    check_slide(page, site_url, "close")
    open_slide(page, site_url, "close")
    page.wait_for_timeout(6_000)
    gaps = page.evaluate(CLOSE_DOT_GAPS)
    assert len(gaps) == 5, gaps
    assert all(g <= 4 for g in gaps), gaps


def test_unique_motion(page, site_url):
    check_slide(page, site_url, "unique")
    open_slide(page, site_url, "unique")
    trippro = "() => getComputedStyle(document.querySelector('#unique circle[cx=\"1540\"][r=\"20\"]')).opacity"
    assert float(page.evaluate(trippro)) == 0
    play_step(page, "unique", 1)
    assert float(page.evaluate(trippro)) == 1


def test_market_motion(page, site_url):
    html = slide_html("market")
    widths = [int(w) for w in re.findall(r'class="hbar[^"]*" style="width:(\d+)px"', html)]
    values = re.findall(r'<div class="hbar[^>]*></div><p class="[^"]*">([^<]*)</p>', html)
    nums = re.findall(r'<p class="num">([^<]*)</p>', html)
    assert len(widths) == len(values) == 5 and len(nums) == 2

    check_slide(page, site_url, "market")
    assert page.evaluate("() => [...document.querySelectorAll('#market .num')].map(n => n.textContent)") == nums

    open_slide(page, site_url, "market")
    bars = page.evaluate(MARKET_BARS)
    assert [b["value"] for b in bars] == values
    for bar, width in zip(bars, widths):
        assert abs(bar["width"] - width) <= 1, (bar, width)


def test_team_motion(page, site_url):
    check_slide(page, site_url, "team")
