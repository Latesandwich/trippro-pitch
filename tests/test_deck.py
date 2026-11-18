"""Task 3: the static reveal.js deck matches the artifact's layout and boots offline."""
import pytest

from layout import ORDER, box_mismatches, deck_boxes, load_reference


def test_boots_in_order(page, site_url, open_deck):
    open_deck(page, site_url)
    assert page.evaluate("() => window.__deck.order") == ORDER
    assert page.locator(".reveal .slides > section").count() == 15
    assert page.evaluate("() => [...document.querySelectorAll('.reveal .slides > section')].map(s => s.id)") == ORDER
    assert page.errors == []


def test_matches_reference_layout(page, site_url, open_deck):
    reference = load_reference(page.context, site_url)
    open_deck(page, site_url, "?static")
    problems = {}
    for index, slide_id in enumerate(ORDER):
        page.evaluate("i => Reveal.slide(i)", index)
        assert len(reference[slide_id]["boxes"]) > 5
        diff = box_mismatches(deck_boxes(page, slide_id), reference[slide_id]["boxes"])
        if diff:
            problems[slide_id] = diff[:8]
    assert problems == {}
    assert page.errors == []


def test_page_numbers(page, site_url, open_deck):
    open_deck(page, site_url)
    numbers = page.evaluate("""() => [...document.querySelectorAll('.reveal .slides > section')]
        .map((s, i) => [i, s.dataset.page, [...s.querySelectorAll('.pn')].map(p => p.textContent)])""")
    with_pn = [n for n in numbers if n[2]]
    assert len(with_pn) >= 10
    for index, data_page, texts in numbers:
        assert data_page == str(index + 1)
        assert all(text == str(index + 1) for text in texts)


def test_icons_render(page, site_url, open_deck):
    open_deck(page, site_url, "?static")
    total = 0
    for index, slide_id in enumerate(ORDER):
        page.evaluate("i => Reveal.slide(i)", index)
        sizes = page.evaluate("""id => [...document.getElementById(id).querySelectorAll('x-icon')].map(icon => {
            const svg = icon.querySelector('svg');
            if (!svg) return null;
            const r = svg.getBoundingClientRect();
            return [r.width, r.height];
        })""", slide_id)
        for size in sizes:
            assert size is not None, f"x-icon without svg on {slide_id}"
            assert size[0] > 0 and size[1] > 0, f"empty icon on {slide_id}"
        total += len(sizes)
    assert total == 9


def test_notes_present(page, site_url, open_deck):
    open_deck(page, site_url)
    notes = page.evaluate("""() => [...document.querySelectorAll('.reveal .slides > section')]
        .map(s => { const a = s.querySelector(':scope > aside.notes'); return a ? a.textContent.trim() : ''; })""")
    assert len(notes) == 15
    assert all(notes), [ORDER[i] for i, n in enumerate(notes) if not n]


@pytest.mark.parametrize("width,height", [(1024, 768), (1280, 720), (3840, 2160)])
def test_scales_to_any_screen(page, site_url, open_deck, width, height):
    page.set_viewport_size({"width": width, "height": height})
    open_deck(page, site_url)
    box = page.evaluate("""() => { const r = document.querySelector('.reveal .slides').getBoundingClientRect();
        return [r.x, r.y, r.width, r.height]; }""")
    x, y, w, h = box
    assert x >= -0.5 and y >= -0.5 and x + w <= width + 0.5 and y + h <= height + 0.5, box
    assert abs((x + w / 2) - width / 2) <= 2 and abs((y + h / 2) - height / 2) <= 2, box
    assert abs((w / h) / (16 / 9) - 1) <= 0.005, box


def test_waits_for_fonts(page, site_url, open_deck):
    open_deck(page, site_url)
    assert page.evaluate("() => document.fonts.check('600 80px Anuphan')")
    assert page.evaluate("""() => document.fonts.check('400 32px "Noto Sans Thai"')""")


def test_no_external_requests(page, site_url, open_deck):
    urls = []
    page.on("request", lambda request: urls.append(request.url))
    open_deck(page, site_url)
    assert urls, "no requests recorded"
    assert [u for u in urls if not u.startswith(site_url)] == []


def test_fade_is_fast(page, site_url, open_deck):
    open_deck(page, site_url)
    assert page.evaluate(
        "() => getComputedStyle(document.querySelector('.reveal .slides > section')).transitionDuration") == "0.4s"


def test_text_paints_above_photos(page, site_url, open_deck):
    """As in the artifact, the risen .in* blocks paint above absolutely positioned photos and scrims."""
    open_deck(page, site_url, "?static")
    covered = []
    for index, slide_id in enumerate(ORDER):
        page.evaluate("i => Reveal.slide(i)", index)
        covered += page.evaluate("""id => {
            const section = document.getElementById(id);
            if (!section.querySelector('.bleed, .scrim')) return [];
            return [...section.querySelectorAll('.in1, .in2, .in3, .in4, .in5')].filter(el => {
                const r = el.getBoundingClientRect();
                const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                return !(hit && el.contains(hit));
            }).map(el => `${id}: ${el.tagName} ${el.className}`);
        }""", slide_id)
    assert covered == []
