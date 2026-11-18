"""Regenerates VERSION and PRECACHE in sw.js: every site file except tests/, tools/, dot-folders, serve.* and *.md.

Usage: python tools/precache.py   (run it last, after any change to a site file)
"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SW = ROOT / "sw.js"
EXCLUDED_DIRS = {"tests", "tools", "__pycache__"}


def site_files():
    files = []
    for path in sorted(ROOT.rglob("*")):
        rel = path.relative_to(ROOT)
        if not path.is_file() or rel.as_posix() == "sw.js":
            continue
        if any(part.startswith(".") or part in EXCLUDED_DIRS for part in rel.parts):
            continue
        if rel.name.startswith("serve.") or rel.suffix == ".md":
            continue
        files.append(rel.as_posix())
    return files


def main():
    files = site_files()
    digest = hashlib.sha256()
    for name in files:
        digest.update(name.encode("utf-8") + b"\0" + (ROOT / name).read_bytes() + b"\0")
    version = digest.hexdigest()[:16]
    entries = ["./"] + files
    block = "/* precache:start */\nconst VERSION = \"%s\";\nconst PRECACHE = [\n%s\n];\n/* precache:end */" % (
        version, "\n".join('  "%s",' % name for name in entries))
    text = SW.read_text(encoding="utf-8")
    text = re.sub(r"/\* precache:start \*/.*?/\* precache:end \*/", lambda _: block, text, flags=re.S)
    SW.write_text(text, encoding="utf-8", newline="\n")
    print(f"sw.js: {len(entries)} entries, version {version}")


if __name__ == "__main__":
    main()
