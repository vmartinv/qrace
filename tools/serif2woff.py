#!/usr/bin/env python3
"""Pixel serif fonts, rasterized without anti-aliasing as Windows 95 drew
Times New Roman and MS Serif, into pixel-outline web fonts:

  python3 tools/serif2woff.py           # Liberation Serif (OFL, Times New
      # Roman metrics) -> port/public/fonts/serif-<px>.woff (QSerif<px>)
  python3 tools/serif2woff.py --times [times.ttf]   # real Times New Roman
      # (corefonts in the original's Wine prefix) -> port/original-assets/
      # fonts/times-<px>.woff (QTimes<px>): local only, like the original art

Times New Roman's hinting draws 1-pixel strokes at these sizes; Liberation
comes out heavier, so the port prefers QTimes when the original assets are
loaded. One font per pixel size the game uses (12 and 24 pt Times New
Roman; 6.75, 8.25, 12 and 18 pt MS Serif, which has no clone of its own).
As in fon2woff.py, the em is the cell height, so the CSS size is that
height in px.
"""
import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "port/public/fonts"
TIMES_OUT = ROOT / "port/original-assets/fonts"
S = 64  # units per pixel
SIZES = [9, 11, 16, 24, 32]  # px per em: round(pt * 96 / 72)


def raster(font: ImageFont.FreeTypeFont, ch: str, asc: int, h: int, fix: bool):
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
    return adv, x0 - pad, close_serifs(rows) if fix else rows


def close_serifs(rows: list) -> list:
    """Fills the pixel between a horizontal stroke and a 1-pixel vertical
    tick just past its end (E's middle bar): Times New Roman's hinting joins
    them, Liberation's leaves a gap that reads as a fork."""
    h, w = len(rows), len(rows[0]) if rows else 0
    on = lambda y, x: 0 <= y < h and 0 <= x < w and rows[y][x]
    out = [r[:] for r in rows]
    for y in range(h):
        for x in range(w):
            if rows[y][x] or not (on(y - 1, x) and on(y + 1, x)):
                continue
            for d in (-1, 1):  # stroke on one side, open on the other
                if on(y, x + d) and on(y, x + 2 * d) and not on(y, x - d) \
                        and not on(y - 1, x + d) and not on(y + 1, x + d):
                    out[y][x] = True
    return out


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


def build(src: Path, px: int, times: bool):
    font = ImageFont.truetype(str(src), px, layout_engine=ImageFont.Layout.BASIC)
    asc, desc = font.getmetrics()
    h = asc + desc
    names, cmap, glyf, metrics = [".notdef"], {}, {".notdef": TTGlyphPen(None).glyph()}, {".notdef": (px // 3 * S, 0)}
    for code in range(0x20, 0x100):
        try:
            ch = bytes([code]).decode("cp1252")
        except UnicodeDecodeError:
            continue
        adv, left, rows = raster(font, ch, asc, h, not times)
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
    fb.setupNameTable({"familyName": f"{'QTimes' if times else 'QSerif'}{px}", "styleName": "Regular",
                       "copyright": f"Rasterized from {src.name}" if times else
                       "Rasterized from Liberation Serif, (C) Red Hat, Inc. (SIL OFL 1.1)"})
    fb.setupOS2(sTypoAscender=asc * S, sTypoDescender=-desc * S, sTypoLineGap=0,
                usWinAscent=asc * S, usWinDescent=desc * S)
    fb.setupPost()
    fb.font.flavor = "woff"
    out = (TIMES_OUT / f"times-{px}.woff") if times else (OUT / f"serif-{px}.woff")
    fb.save(out)
    print(f"{px}px em, {h}px cell -> {out.relative_to(ROOT)}")


def main():
    args = sys.argv[1:]
    times = "--times" in args
    args = [a for a in args if a != "--times"]
    default = (ROOT / ".winedefault/drive_c/windows/Fonts/times.ttf" if times
               else Path("/usr/share/fonts/liberation/LiberationSerif-Regular.ttf"))
    src = Path(args[0]) if args else default
    (TIMES_OUT if times else OUT).mkdir(parents=True, exist_ok=True)
    for px in SIZES:
        build(src, px, times)


if __name__ == "__main__":
    main()
