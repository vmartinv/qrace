#!/usr/bin/env bash
# Compiles a minimal "x = <value>" VB3 project once per value in a sweep,
# via GUI automation of the real VB3 IDE, and extracts the new procedure's
# code segment from each resulting EXE. Used for Phase 3 empirical p-code
# opcode research -- see docs/pcode-notes.md.
#
# Prerequisites (see docs/pcode-notes.md "Path forward" section):
#   - Xvfb running on :99, with openbox as window manager (needed for
#     Wine windows to receive input focus at all).
#   - ~/qrace/.winevb3 WINEPREFIX with VB.EXE + VBRUN300.DLL already
#     working (confirmed by running the IDE manually once).
#   - ~/qrace/vb3_install/proj/{Project1.mak,Form1.frm} already saved as
#     TEXT (File > Save Project As, "Save as Text" checked) with a
#     `Sub Form_Load ()` / `End Sub` block ready to be rewritten.
#
# Usage: tools/vb3ide/sweep_literal.sh <value...>
# Output: vb3_install/sweep/x_eq_<value>.exe for each value, plus
#         vb3_install/sweep/results.tsv summarizing the extracted segment.

set -euo pipefail

DISPLAY_NUM=:99
PREFIX=~/qrace/.winevb3
IDE_DIR=~/qrace/vb3_install/ide
PROJ_DIR=~/qrace/vb3_install/proj
OUT_DIR=~/qrace/vb3_install/sweep
FRM="$PROJ_DIR/Form1.frm"
MAK="$PROJ_DIR/Project1.mak"

mkdir -p "$OUT_DIR"

xdo() { DISPLAY=$DISPLAY_NUM xdotool "$@"; }

write_frm() {
    local value="$1"
    python3 -c "
import sys
lines = [
    'VERSION 2.00',
    'Begin Form Form1 ',
    '   Caption         =   \"Form1\"',
    '   ClientHeight    =   8145',
    '   ClientLeft      =   1095',
    '   ClientTop       =   1695',
    '   ClientWidth     =   7350',
    '   Height          =   8655',
    '   Left            =   1035',
    '   LinkTopic       =   \"Form1\"',
    '   ScaleHeight     =   8145',
    '   ScaleWidth      =   7350',
    '   Top             =   1245',
    '   Width           =   7470',
    'End',
    'Sub Form_Load ()',
    'x = $value',
    'End Sub',
    '',
]
with open('$FRM', 'wb') as f:
    f.write(('\r\n'.join(lines) + '\r\n').encode('ascii'))
"
}

compile_one_attempt() {
    local value="$1"
    local outname="x_eq_${value}.exe"
    local outpath="$OUT_DIR/$outname"
    rm -f "$outpath"

    write_frm "$value"

    DISPLAY=$DISPLAY_NUM WINEPREFIX=$PREFIX wineserver -k >/dev/null 2>&1 || true
    sleep 2
    (cd "$IDE_DIR" && DISPLAY=$DISPLAY_NUM WINEPREFIX=$PREFIX wine VB.EXE \
        'Z:\home\martin\qrace\vb3_install\proj\Project1.mak' \
        >/tmp/vbsweep.log 2>&1 &)
    sleep 6

    # File > Make EXE File...
    xdo key --clearmodifiers alt+f
    sleep 1.5
    xdo mousemove --sync 60 343
    xdo click 1
    sleep 1.5

    # Clear filename field, type absolute output path
    xdo mousemove --sync 355 236
    xdo click 1
    xdo key Home
    xdo key shift+End
    xdo key Delete
    xdo type "Z:\\home\\martin\\qrace\\vb3_install\\sweep\\${outname}"
    sleep 1.5
    xdo mousemove --sync 696 221
    xdo click 1
    sleep 3

    [ -f "$outpath" ]
}

compile_one() {
    local value="$1"
    local outname="x_eq_${value}.exe"
    if compile_one_attempt "$value"; then
        echo "OK  value=$value -> $outname"
        return
    fi
    echo "retry value=$value ..."
    if compile_one_attempt "$value"; then
        echo "OK  value=$value -> $outname (2nd try)"
        return
    fi
    echo "FAIL value=$value -> $outname (no output file after retry)"
}

for v in "$@"; do
    compile_one "$v"
done

DISPLAY=$DISPLAY_NUM WINEPREFIX=$PREFIX wineserver -k >/dev/null 2>&1 || true
