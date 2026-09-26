#!/usr/bin/env python3
"""Converts Wine's MS Sans Serif clone (sserife.fon, LGPL) into pixel-outline
web fonts, one per bitmap size: port/public/fonts/sans-<px>.woff.

Each font pixel becomes a square of S units and the em is the bitmap's
cell height, so at `font-size: <px>px` the text lands on the pixel grid
like the original bitmap font. Faux bold (as Windows does for bitmap
fonts) is left to the browser.

  python3 tools/fon2woff.py [/usr/share/wine/fonts/sserife.fon]
"""
import struct
import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "port/public/fonts"
S = 64  # units per pixel


def fnt_resources(data: bytes):
    """The FNT blocks inside a .fon (NE resource type 0x8008)."""
    ne = struct.unpack_from("<I", data, 0x3C)[0]
    rtab = ne + struct.unpack_from("<H", data, ne + 0x24)[0]
    shift = struct.unpack_from("<H", data, rtab)[0]
    p = rtab + 2
    while True:
        typ, count = struct.unpack_from("<HH", data, p)
        if typ == 0:
            return
        p += 8
        for _ in range(count):
            off, length = struct.unpack_from("<HH", data, p)
            if typ == 0x8008:
                yield data[off << shift:(off << shift) + (length << shift)]
            p += 12


def parse_fnt(f: bytes) -> dict:
    ver = struct.unpack_from("<H", f, 0)[0]
    points, _vres, _hres, ascent = struct.unpack_from("<HHHH", f, 68)
    height = struct.unpack_from("<H", f, 88)[0]
    first, last = f[95], f[96]
    table, entry = (148, 6) if ver == 0x300 else (118, 4)
    glyphs = {}
    for i in range(last - first + 1):
        q = table + i * entry
        width = struct.unpack_from("<H", f, q)[0]
        off = struct.unpack_from("<I" if ver == 0x300 else "<H", f, q + 2)[0]
        rows = []
        for y in range(height):
            bits = []
            for x in range(width):
                byte = f[off + (x // 8) * height + y]
                bits.append(bool(byte & (0x80 >> (x % 8))))
            rows.append(bits)
        glyphs[first + i] = (width, rows)
    return {"points": points, "height": height, "ascent": ascent, "glyphs": glyphs}


def glyph_outline(width: int, rows: list, ascent: int):
    pen = TTGlyphPen(None)
    for y, bits in enumerate(rows):
        x = 0
        while x < width:
            if not bits[x]:
                x += 1
                continue
            x0 = x
            while x < width and bits[x]:
                x += 1
            top, bottom = (ascent - y) * S, (ascent - y - 1) * S
            pen.moveTo((x0 * S, bottom))
            pen.lineTo((x0 * S, top))
            pen.lineTo((x * S, top))
            pen.lineTo((x * S, bottom))
            pen.closePath()
    return pen.glyph()


def build(fnt: dict, path: Path):
    h, asc = fnt["height"], fnt["ascent"]
    names, cmap, glyf, metrics = [".notdef"], {}, {}, {}
    glyf[".notdef"] = TTGlyphPen(None).glyph()
    metrics[".notdef"] = (fnt["glyphs"].get(0x20, (h // 3, []))[0] * S, 0)
    for code, (width, rows) in fnt["glyphs"].items():
        try:
            ch = bytes([code]).decode("cp1252")
        except UnicodeDecodeError:
            continue
        name = f"g{code:02x}"
        names.append(name)
        cmap[ord(ch)] = name
        glyf[name] = glyph_outline(width, rows, asc)
        metrics[name] = (width * S, 0)
    fb = FontBuilder(h * S, isTTF=True)
    fb.setupGlyphOrder(names)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=asc * S, descent=-(h - asc) * S)
    family = f"QSans{h}"
    fb.setupNameTable({"familyName": family, "styleName": "Regular",
                       "copyright": "Copyright (C) 2004 Huw D M Davies, Dmitry Timoshkov (Wine, LGPL 2.1+)"})
    fb.setupOS2(sTypoAscender=asc * S, sTypoDescender=-(h - asc) * S, sTypoLineGap=0,
                usWinAscent=asc * S, usWinDescent=(h - asc) * S)
    fb.setupPost()
    fb.font.flavor = "woff"
    fb.save(path)


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/usr/share/wine/fonts/sserife.fon")
    OUT.mkdir(parents=True, exist_ok=True)
    for block in fnt_resources(src.read_bytes()):
        fnt = parse_fnt(block)
        out = OUT / f"sans-{fnt['height']}.woff"
        build(fnt, out)
        print(f"{fnt['points']}pt -> {out.relative_to(ROOT)} ({len(fnt['glyphs'])} glyphs)")


if __name__ == "__main__":
    main()
