#!/usr/bin/env python3
"""Pixel serif fonts: Liberation Serif (Times New Roman metrics, OFL)
rasterized without anti-aliasing, as Windows 95 drew Times New Roman and
MS Serif, into pixel-outline web fonts: port/public/fonts/serif-<px>.woff.

One font per pixel size the game uses (12 and 24 pt Times New Roman; 6.75,
8.25, 12 and 18 pt MS Serif, which has no free clone). As in fon2woff.py,
the em is the cell height, so the CSS size is that height in px.

  python3 tools/serif2woff.py [LiberationSerif-Regular.ttf]
"""
import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "port/public/fonts"
S = 64  # units per pixel
SIZES = [9, 11, 16, 24, 32]  # px per em: round(pt * 96 / 72)


def raster(font: ImageFont.FreeTypeFont, ch: str, asc: int, h: int):
    """The glyph's pixels as (advance, left column, rows of bools)."""
    adv = round(font.getlength(ch))
    pad = h  # room for overhangs on both sides
    img = Image.new("1", (adv + 2 * pad, h), 0)
    d = ImageDraw.Draw(img)
    d.fontmode = "1"
    d.text((pad, asc), ch, font=font, fill=1, anchor="ls")
    px = img.load()
    cols = [x for x in range(img.width) if any(px[x, y] for y in range(h))]
    if not cols:
        return adv, 0, []
    x0, x1 = cols[0], cols[-1] + 1
    rows = [[bool(px[x, y]) for x in range(x0, x1)] for y in range(h)]
    return adv, x0 - pad, rows


def outline(left: int, rows: list, asc: int):
    pen = TTGlyphPen(None)
    for y, bits in enumerate(rows):
        x = 0
        while x < len(bits):
            if not bits[x]:
                x += 1
                continue
            x0 = x
            while x < len(bits) and bits[x]:
                x += 1
            top, bottom = (asc - y) * S, (asc - y - 1) * S
            pen.moveTo(((left + x0) * S, bottom))
            pen.lineTo(((left + x0) * S, top))
            pen.lineTo(((left + x) * S, top))
            pen.lineTo(((left + x) * S, bottom))
            pen.closePath()
    return pen.glyph()


def build(src: Path, px: int):
    font = ImageFont.truetype(str(src), px, layout_engine=ImageFont.Layout.BASIC)
    asc, desc = font.getmetrics()
    h = asc + desc
    names, cmap, glyf, metrics = [".notdef"], {}, {".notdef": TTGlyphPen(None).glyph()}, {".notdef": (px // 3 * S, 0)}
    for code in range(0x20, 0x100):
        try:
            ch = bytes([code]).decode("cp1252")
        except UnicodeDecodeError:
            continue
        adv, left, rows = raster(font, ch, asc, h)
        name = f"g{code:02x}"
        names.append(name)
        cmap[ord(ch)] = name
        glyf[name] = outline(left, rows, asc)
        metrics[name] = (adv * S, left * S if rows else 0)
    fb = FontBuilder(h * S, isTTF=True)
    fb.setupGlyphOrder(names)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=asc * S, descent=-desc * S)
    fb.setupNameTable({"familyName": f"QSerif{px}", "styleName": "Regular",
                       "copyright": "Rasterized from Liberation Serif, (C) Red Hat, Inc. (SIL OFL 1.1)"})
    fb.setupOS2(sTypoAscender=asc * S, sTypoDescender=-desc * S, sTypoLineGap=0,
                usWinAscent=asc * S, usWinDescent=desc * S)
    fb.setupPost()
    fb.font.flavor = "woff"
    out = OUT / f"serif-{px}.woff"
    fb.save(out)
    print(f"{px}px em, {h}px cell -> {out.relative_to(ROOT)}")


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/usr/share/fonts/liberation/LiberationSerif-Regular.ttf")
    OUT.mkdir(parents=True, exist_ok=True)
    for px in SIZES:
        build(src, px)


if __name__ == "__main__":
    main()
