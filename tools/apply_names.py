#!/usr/bin/env python3
"""Renames the decompiler's generic symbols using names.json:
extraction/decompiled/ -> extraction/named/ (whole words, outside strings)."""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
names = json.loads((ROOT / "names.json").read_text())
src, dst = ROOT / "extraction/decompiled", ROOT / "extraction/named"
shutil.rmtree(dst, ignore_errors=True)
shutil.copytree(src, dst)
for f in dst.glob("*.[FfBb][RrAa][MmSs]"):
    table = {**names["global"], **names.get(f.name, {})}
    word = re.compile(r'"[^"\n]*"|\b(' + "|".join(map(re.escape, table)) + r')\b')
    text = f.read_text(encoding="latin-1")
    f.write_text(word.sub(lambda m: table[m[1]] if m[1] else m[0], text), encoding="latin-1")
print(f"wrote {dst}")
