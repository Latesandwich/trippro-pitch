from layout import ROOT
import re


def test_note_paragraph_breaks_become_br(page, site_url, open_deck):
    html = (ROOT / "slides" / "hands.html").read_text(encoding="utf-8")
    aside = re.search(r"<aside>(.*?)</aside>", html, re.S).group(1)
    newlines = aside.count("\n")
    assert newlines >= 6
    open_deck(page, site_url)
    info = page.evaluate("""() => {
        const a = document.querySelector('.reveal .slides > section#hands > aside.notes');
        return { br: a.querySelectorAll('br').length,
                 raw: [...a.childNodes].some(n => n.nodeType === 3 && n.data.includes('\n')) };
    }""")
    assert info["raw"] is False
    assert info["br"] >= newlines  # engine cue lines add more on top
