#!/usr/bin/env python3
"""Form layouts for the port, from the named decompile (extraction/named/).

Writes port/src/forms/layouts.json (committed: control geometry, captions,
fonts, colors; our own data file) and, locally only, the original pictures
as PNGs under port/original-assets/ (gitignored, with qnames.txt and help.txt) with a manifest mapping each
picture key (`frmMain.imgTrack1`, `frmMain.imgP(0)`) to its file. The port
draws placeholder art unless it runs in dev mode with `?art=original`.
"""
import hashlib
import io
import json
import re
import shutil
import struct
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "extraction/named"
OUT = ROOT / "port/src/forms/layouts.json"
ART = ROOT / "port/original-assets"

KEEP = {"Caption", "Text", "Left", "Top", "Width", "Height", "FontName", "FontSize", "FontBold",
        "FontItalic", "FontUnderline", "ForeColor", "BackColor", "BackStyle", "Alignment", "Visible",
        "Enabled", "Interval", "Value", "BorderStyle", "BorderColor", "BorderWidth", "Shape", "FillStyle",
        "FillColor", "Stretch", "TabIndex", "ClientLeft", "ClientTop", "ClientWidth", "ClientHeight",
        "ControlBox", "MaxButton", "MinButton", "WordWrap", "AutoSize", "MultiLine", "MaxLength"}


def value(v: str):
    v = v.strip()
    if v.startswith('"'):
        return v[1:-1].replace('""', '"')
    if m := re.fullmatch(r"&H([0-9A-Fa-f]+)&", v):
        return int(m[1], 16)
    try:
        return int(v)
    except ValueError:
        return float(v)


def picture(frx: bytes, off: int) -> Image.Image:
    size = struct.unpack_from("<i", frx, off)[0]
    return Image.open(io.BytesIO(frx[off + 4:off + 4 + size]))


def parse(frm: Path, manifest: dict) -> dict:
    lines = frm.read_text(encoding="latin-1").splitlines()
    frx = frm.with_suffix(".FRX").read_bytes() if frm.with_suffix(".FRX").exists() else b""
    form, stack = None, []
    for ln in lines:
        s = ln.strip()
        if m := re.fullmatch(r"Begin (\w+) (\w+)", s):
            node = {"type": m[1], "name": m[2], "props": {}}
            if form is None:
                form = node
                form["controls"] = []
            else:
                form["controls"].append(node)
            stack.append(node)
        elif s == "End" and stack:
            node = stack.pop()
            if node is form:
                break
        elif stack and (m := re.fullmatch(r"(\w+)\s*=\s*(.*)", s)):
            node, (k, v) = stack[-1], m.groups()
            if k == "Index":
                node["index"] = int(v)
            elif k == "Picture" and (p := re.fullmatch(r"\w+\.FRX:([0-9A-F]+)", v.strip())):
                key = f"{form['name']}.{node['name']}" + (f"({node['index']})" if "index" in node else "")
                img = picture(frx, int(p[1], 16))
                node["props"]["Picture"] = key
                node["picSize"] = list(img.size)
                data = img.convert("RGB").tobytes()
                name = hashlib.sha1(data).hexdigest()[:10] + ".png"
                if not (ART / name).exists():
                    img.convert("RGB").save(ART / name)
                manifest[key] = name
            elif k == "Icon" and (p := re.fullmatch(r"\w+\.FRX:([0-9A-F]+)", v.strip())) and node is form:
                key = f"{form['name']}.Icon"
                img = picture(frx, int(p[1], 16))
                node["props"]["Icon"] = key
                name = f"icon-{form['name']}.png"
                img.convert("RGBA").resize((16, 16)).save(ART / name)
                manifest[key] = name
            elif k in KEEP:
                node["props"][k] = value(v)
    return form


def main():
    ART.mkdir(parents=True, exist_ok=True)
    manifest, forms = {}, {}
    mak = (SRC / "QRACE.mak").read_text(encoding="latin-1").split()
    for f in [x for x in mak if x.upper().endswith(".FRM")]:
        form = parse(SRC / f, manifest)
        forms[form["name"]] = form
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(forms, indent=1))
    (ART / "manifest.json").write_text(json.dumps(manifest, indent=1))
    for f in ("qnames.txt", "help.txt"):
        shutil.copy(ROOT / "original" / f, ART / f)
    print(f"{len(forms)} forms -> {OUT.relative_to(ROOT)}; {len(set(manifest.values()))} pictures -> {ART.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
