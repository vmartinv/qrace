#!/usr/bin/env bash
# Generalized version of sweep_literal.sh: compiles an arbitrary Form_Load
# body (not just "x = N") through the real VB3 IDE and extracts the
# resulting procedure code segment. Used for Phase 3 empirical p-code
# opcode research -- see docs/pcode-notes.md.
#
# Prerequisites: same as sweep_literal.sh.
#
# Usage: tools/vb3ide/compile_snippet.sh <name> <code-file>
#   <code-file> contains the literal lines to place between
#   "Sub Form_Load ()" and "End Sub" (one statement per line, plain text).
# Output: vb3_install/sweep/<name>.exe

set -euo pipefail

DISPLAY_NUM=:99
PREFIX=~/qrace/.winevb3
IDE_DIR=~/qrace/vb3_install/ide
PROJ_DIR=~/qrace/vb3_install/proj
OUT_DIR=~/qrace/vb3_install/sweep
FRM="$PROJ_DIR/Form1.frm"

mkdir -p "$OUT_DIR"

xdo() { DISPLAY=$DISPLAY_NUM xdotool "$@"; }

write_frm() {
    local codefile="$1"
    python3 -c "
import sys
header = [
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
]
with open('$codefile') as f:
    body = [line.rstrip('\n') for line in f]
footer = ['End Sub', '']
lines = header + body + footer
with open('$FRM', 'wb') as f:
    f.write(('\r\n'.join(lines) + '\r\n').encode('ascii'))
"
}

compile_one_attempt() {
    local name="$1"
    local codefile="$2"
    local outname="${name}.exe"
    local outpath="$OUT_DIR/$outname"
    rm -f "$outpath"

    write_frm "$codefile"

    DISPLAY=$DISPLAY_NUM WINEPREFIX=$PREFIX wineserver -k >/dev/null 2>&1 || true
    sleep 2
    (cd "$IDE_DIR" && DISPLAY=$DISPLAY_NUM WINEPREFIX=$PREFIX wine VB.EXE \
        'Z:\home\martin\qrace\vb3_install\proj\Project1.mak' \
        >/tmp/vbsnippet.log 2>&1 &)
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
    local name="$1"
    local codefile="$2"
    if compile_one_attempt "$name" "$codefile"; then
        echo "OK  $name"
        return
    fi
    echo "retry $name ..."
    if compile_one_attempt "$name" "$codefile"; then
        echo "OK  $name (2nd try)"
        return
    fi
    echo "FAIL $name (no output file after retry)"
}

compile_one "$1" "$2"
DISPLAY=$DISPLAY_NUM WINEPREFIX=$PREFIX wineserver -k >/dev/null 2>&1 || true
