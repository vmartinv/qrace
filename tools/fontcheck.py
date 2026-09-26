#!/usr/bin/env python3
"""Checks the pixel web fonts against the .fon bitmaps they came from:
renders all printable characters in the browser (port/harness/fontcheck.mjs,
needs the dev server) and compares pixel by pixel with the same string
drawn directly from the bitmaps.

  python3 tools/fontcheck.py [/usr/share/wine/fonts/sserife.fon]
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fon2woff import fnt_resources, parse_fnt  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TEXT = "".join(chr(c) for c in range(0x20, 0x7F)) + " Computer Quibbles"


def expected(fnt: dict) -> Image.Image:
    g = fnt["glyphs"]
    w = sum(g[ord(c)][0] for c in TEXT)
    img = Image.new("L", (w, fnt["height"]), 255)
    x = 0
    for c in TEXT:
        width, rows = g[ord(c)]
        for y, bits in enumerate(rows):
            for i, b in enumerate(bits):
                if b:
                    img.putpixel((x + i, y), 0)
        x += width
    return img


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/usr/share/wine/fonts/sserife.fon")
    fonts = {f["height"]: f for f in map(parse_fnt, fnt_resources(src.read_bytes()))}
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["node", "harness/fontcheck.mjs", tmp, TEXT], cwd=ROOT / "port", check=True)
        bad = 0
        for px, fnt in sorted(fonts.items()):
            want = expected(fnt)
            got = Image.open(Path(tmp) / f"font-{px}.png").convert("L").point(lambda v: 0 if v < 128 else 255)
            if got.size != want.size:
                print(f"{px}px: size {got.size} != {want.size}")
                bad += 1
                continue
            diff = [(x, y) for x in range(want.width) for y in range(want.height)
                    if got.getpixel((x, y)) != want.getpixel((x, y))]
            grey = sum(1 for v in Image.open(Path(tmp) / f"font-{px}.png").convert("L").get_flattened_data() if 40 < v < 215)
            print(f"{px}px: {len(diff)} pixels differ, {grey} grey (anti-aliased) pixels")
            bad += bool(diff)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
