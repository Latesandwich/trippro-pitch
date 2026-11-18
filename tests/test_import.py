"""tools/import_artifact.py: copies an artifact export into the repo and points /_blob/ URLs at assets/."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOL = ROOT / "tools" / "import_artifact.py"
FIXTURE = ROOT / "tests" / "fixtures" / "export_min"
BLOB = "0123456789abcdef0123456789abcdef"  # export_min's one asset, a PNG that both slides use
SENTINEL = b"motion code lives here\n"


def _export(tmp_path):
    """A scratch copy of export_min whose slides end lines in LF (alpha) and CRLF (beta), whatever git checked out."""
    export = tmp_path / "export"
    shutil.copytree(FIXTURE, export)
    for slide_id, eol in (("alpha", b"\n"), ("beta", b"\r\n")):
        slide = export / "project" / "slides" / f"{slide_id}.html"
        slide.write_bytes(slide.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", eol))
    return export


def _run(export, repo):
    """Runs `python tools/import_artifact.py <export> <repo>` and returns the CompletedProcess."""
    return subprocess.run(
        [sys.executable, str(TOOL), str(export), str(repo)], capture_output=True, text=True, timeout=60
    )


def _imported(tmp_path):
    """(export, repo) after a successful import of a scratch export_min into tmp_path/repo."""
    export, repo = _export(tmp_path), tmp_path / "repo"
    result = _run(export, repo)
    assert result.returncode == 0, result.stdout + result.stderr
    return export, repo


def test_rewrites_blob_urls(tmp_path):
    export, repo = _imported(tmp_path)
    order = json.loads((export / "project" / "deck.json").read_bytes())["order"]
    assert sorted(p.name for p in (repo / "slides").iterdir()) == sorted(f"{slide_id}.html" for slide_id in order)
    for slide_id in order:
        source = (export / "project" / "slides" / f"{slide_id}.html").read_bytes()
        written = (repo / "slides" / f"{slide_id}.html").read_bytes()
        assert f"/_blob/{BLOB}".encode() in source, f"{slide_id}: the fixture should use the asset"
        assert b"/_blob/" not in written, slide_id
        # Everything else is kept byte for byte, Thai text and line endings included.
        assert written == source.replace(f"/_blob/{BLOB}".encode(), f"assets/{BLOB}.png".encode()), slide_id
    assert [p.name for p in (repo / "assets").iterdir()] == [f"{BLOB}.png"]
    assert (repo / "assets" / f"{BLOB}.png").read_bytes() == (export / "assets" / f"{BLOB}.png").read_bytes()


def test_order_and_css_copied(tmp_path):
    export, repo = _imported(tmp_path)
    deck = export / "project" / "deck.json"
    assert json.loads((repo / "deck.json").read_bytes())["order"] == json.loads(deck.read_bytes())["order"]
    assert (repo / "deck.json").read_bytes() == deck.read_bytes()
    assert (repo / "css" / "deck.css").read_bytes() == (export / "project" / "deck.css").read_bytes()


def test_missing_asset_fails(tmp_path):
    export, repo = _export(tmp_path), tmp_path / "repo"
    (export / "assets" / f"{BLOB}.png").unlink()
    repo.mkdir()
    result = _run(export, repo)
    assert result.returncode == 1, result.stdout + result.stderr
    assert f"MISSING {BLOB}" in result.stdout.splitlines()
    assert list(repo.iterdir()) == [], "a failed import must not write anything"


def test_js_untouched(tmp_path):
    export, repo = _export(tmp_path), tmp_path / "repo"
    sentinel = repo / "js" / "keep.txt"
    sentinel.parent.mkdir(parents=True)
    sentinel.write_bytes(SENTINEL)
    result = _run(export, repo)
    assert result.returncode == 0, result.stdout + result.stderr
    assert [p.name for p in (repo / "js").iterdir()] == ["keep.txt"]
    assert sentinel.read_bytes() == SENTINEL
