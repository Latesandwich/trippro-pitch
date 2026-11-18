"""Import the deck from an artifact export folder into the repo.

    python tools/import_artifact.py <export_dir> <repo_dir>

The export folder holds project/deck.json, project/deck.css, project/slides/<id>.html and
assets/<blobid>.<ext>. The import writes, relative to repo_dir:
- deck.json and css/deck.css, copied byte for byte;
- slides/<id>.html for each id in deck.json "order": the export's slide with every /_blob/<blobid>
  rewritten to assets/<blobid>.<ext>, and otherwise byte for byte (text and line endings);
- assets/<blobid>.<ext>, a copy of each asset the slides reference. The extension comes from the
  asset's file name in the export.

It never touches js/, where the motion code lives, so a re-import keeps the motion layer.
If a referenced asset is missing from the export, it prints MISSING <blobid> for each one,
writes nothing and exits with code 1. A slide id in "order" that is not a plain name (letters,
digits, - and _) also stops it with code 1 before anything is written.
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

BLOB_URL = re.compile(r"/_blob/([0-9a-f]{32})")
SLIDE_ID = re.compile(r"[A-Za-z0-9_-]+")  # a plain file name, so every slide lands inside slides/


def _read_text(path):
    with open(path, encoding="utf-8", newline="") as file:  # newline="": keep CRLF and LF as they are
        return file.read()


def _write_text(path, text):
    with open(path, "w", encoding="utf-8", newline="") as file:
        file.write(text)


def import_artifact(export_dir, repo_dir):
    # Read and check everything first, so a failed import writes nothing.
    project = export_dir / "project"
    deck_json = (project / "deck.json").read_bytes()
    deck_css = (project / "deck.css").read_bytes()
    order = json.loads(deck_json)["order"]
    for slide_id in order:
        if not (isinstance(slide_id, str) and SLIDE_ID.fullmatch(slide_id)):
            sys.exit(f"unusable slide id in deck.json order: {slide_id!r}")
    slides = {slide_id: _read_text(project / "slides" / f"{slide_id}.html") for slide_id in order}

    assets = {}  # blob id -> its file in the export, named <blobid>.<ext>
    if (export_dir / "assets").is_dir():
        for path in sorted((export_dir / "assets").iterdir()):
            if path.is_file() and path.suffix:
                assets.setdefault(path.stem, path)
    used = list(dict.fromkeys(blob for html in slides.values() for blob in BLOB_URL.findall(html)))
    missing = [blob for blob in used if blob not in assets]
    if missing:
        for blob in missing:
            print(f"MISSING {blob}")
        sys.exit(1)

    for folder in ("css", "slides", "assets"):
        (repo_dir / folder).mkdir(parents=True, exist_ok=True)
    (repo_dir / "deck.json").write_bytes(deck_json)
    (repo_dir / "css" / "deck.css").write_bytes(deck_css)
    for slide_id, html in slides.items():
        html = BLOB_URL.sub(lambda match: f"assets/{assets[match.group(1)].name}", html)
        _write_text(repo_dir / "slides" / f"{slide_id}.html", html)
    for blob in used:
        shutil.copyfile(assets[blob], repo_dir / "assets" / assets[blob].name)
    print(f"Imported deck.json, css/deck.css, {len(slides)} slides and {len(used)} assets.")


def main():
    parser = argparse.ArgumentParser(description="Import the deck from an artifact export folder into the repo.")
    parser.add_argument("export_dir", type=Path, help="the export folder, holding project/ and assets/")
    parser.add_argument("repo_dir", type=Path, help="the repo root to write into")
    args = parser.parse_args()
    import_artifact(args.export_dir, args.repo_dir)


if __name__ == "__main__":
    main()
