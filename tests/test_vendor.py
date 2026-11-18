"""Vendored libraries and fonts: pinned by sha256, the right versions, and served locally."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "vendor" / "MANIFEST.json"
FONTS_CSS = ROOT / "css" / "fonts.css"

VENDOR_FILES = {
    "vendor/reveal/reveal.js",
    "vendor/reveal/reveal.css",
    "vendor/reveal/plugin/notes/notes.js",
    "vendor/reveal/LICENSE",
    "vendor/gsap/gsap.min.js",
    "vendor/gsap/DrawSVGPlugin.min.js",
    "vendor/gsap/MotionPathPlugin.min.js",
    "vendor/gsap/LICENSE.md",
}

VERSION_BANNERS = {
    "vendor/reveal/reveal.js": "reveal.js 5.1.0",
    "vendor/reveal/reveal.css": "reveal.js 5.1.0",
    "vendor/gsap/gsap.min.js": "GSAP 3.13.0",
    "vendor/gsap/DrawSVGPlugin.min.js": "DrawSVGPlugin 3.13.0",
    "vendor/gsap/MotionPathPlugin.min.js": "MotionPathPlugin 3.13.0",
}

FONT_WEIGHTS = {
    "Anuphan": {"400", "500", "600", "700"},
    "Inter": {"400", "500", "600"},
    "Noto Sans Thai": {"400", "600", "700"},
}


def _files_under(folder):
    return {p.relative_to(ROOT).as_posix() for p in (ROOT / folder).rglob("*") if p.is_file()}


def test_manifest_matches_files():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    vendored = (_files_under("vendor") - {"vendor/MANIFEST.json"}) | _files_under("fonts")
    assert not VENDOR_FILES - vendored, f"missing: {sorted(VENDOR_FILES - vendored)}"
    assert not vendored - manifest.keys(), f"not in the manifest: {sorted(vendored - manifest.keys())}"
    for rel, digest in manifest.items():
        path = ROOT / rel
        assert path.is_file(), f"{rel} is in the manifest but missing"
        assert hashlib.sha256(path.read_bytes()).hexdigest() == digest, f"{rel} does not match its sha256"


def test_versions_pinned():
    for rel, banner in VERSION_BANNERS.items():
        assert banner in (ROOT / rel).read_text(encoding="utf-8"), f"{rel} is not {banner}"


def test_fonts_css_is_local():
    css = FONTS_CSS.read_text(encoding="utf-8")
    assert not re.findall(r"https?://\S*", css), "css/fonts.css must not reference the network"

    weights = {}
    for face in re.findall(r"@font-face\s*\{([^}]*)\}", css):
        family = re.search(r"font-family:\s*['\"]?([^;'\"]+)", face).group(1)
        weights.setdefault(family, set()).update(re.findall(r"font-weight:\s*(\d+)", face))
    for family, expected in FONT_WEIGHTS.items():
        assert expected <= weights.get(family, set()), f"{family} lacks weights {expected}"

    urls = re.findall(r"url\(\s*['\"]?([^'\")]+)", css)
    assert urls, "no url(...) in css/fonts.css"
    for url in urls:
        assert url.startswith("../fonts/"), url
        assert (FONTS_CSS.parent / url).is_file(), f"{url} does not exist"
