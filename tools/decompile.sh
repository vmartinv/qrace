#!/bin/sh
# Decompiles original/qrace.exe into extraction/decompiled/ (gitignored)
# with the companion vb3-decompiler repo (VB3DECOMPILER, default ../vb3-decompiler).
set -e
cd "$(dirname "$0")/.."
VB3DECOMPILER=${VB3DECOMPILER:-../vb3-decompiler}
rm -rf extraction/decompiled
PYTHONPATH="$VB3DECOMPILER/src" python3 -m vb3decompiler original/qrace.exe \
    extraction/decompiled --runtime original/VBRUN300.DLL
