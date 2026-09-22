# P-code / Segment Notes — qrace.exe

## Segment table

19 NE segments (`tools/segment_parser.py`). Segment 2 has `seg_data_offset =
0` (no on-disk image — a zero-initialized/moveable data segment, presumably
VB3's runtime global/automatic data area). All others are `CODE` segments
(flag bit 0 clear) except segment 2. Segment table *index* order doesn't
match file layout order — e.g. segment 3 (6880 bytes) is laid out in the
file *after* segments 4 through 19, even though it's numbered lower. This is
normal for NE linkers (table index reflects intersegment fixup numbering,
not physical position) but worth remembering when reasoning about offsets.

Segment 1 is tiny (25 bytes) — likely a startup/stub segment, not
investigated yet. Segment 3 (6880 bytes, the second-largest) is a strong
candidate for shared runtime glue code (VB3 program startup, shared helper
routines called from every form) rather than a specific form's logic, since
it doesn't correlate with any single form's string content the way segments
4-19 do — not confirmed yet though.

## Confirmed: inline string-literal encoding

No separate string pool/table exists anywhere in the file. VB3's compiled
p-code embeds every string literal **directly inline in the code segment**
as:

```
<u16 length, little-endian><raw ASCII bytes, no terminator>
```

Verified empirically (not from any external reference — nothing documenting
this was found) by checking that the 2 bytes immediately preceding several
different known UI strings always exactly equal that string's byte length:
`"Your bet is too low."` → 20, `"You can't afford that."` → 22,
`"Player One"` → 10, `"steroids"` → 8. All four matched exactly.

`tools/segment_parser.py`'s `find_inline_strings()` scans every segment for
this pattern and recovered **174 strings** total, each attributed to a
segment + byte offset, written to `extraction/pcode/inline_strings.json`
(gitignored — derived directly from the binary).

**Known false-positive source**: length-2 matches (`'XK'`, etc.) show up
repeatedly and are almost certainly coincidental — a bytecode operand byte
pair that happens to be ASCII-printable and preceded by a matching u16
value. Not filtered out yet; treat any 2-character "string" in the output
as noise unless it's independently plausible (e.g. `"#1"`, `"#2"`, `"#3"`
in segment 18 are clearly real — player rank labels — despite being short).

## Rough segment → game-system correlation (from string content only)

Purely from what text shows up in each segment, *not* from actually
decoding any procedure boundaries yet:

| Segment | Likely content (based on strings found) |
|---|---|
| 4 | Startup / help & data file loading (`notepad.exe help.txt`, `qnames.txt`) |
| 5 | Race sequence UI (`Get set...`, `On your mark...`, `Go!`, `Winner!`) |
| 6 | Quibble stat display (`Win %:`, `Races:`, `Price:`, `Speed:`) — largest segment (11.7KB) |
| 7, 8, 14 | Betting flow (`You can't afford that.`, info broker dialogue, bet totals) |
| 9 | Game setup (`Goal:`, `Rounds:`, default values `1000`/`12`) |
| 10 | Player setup (`Player One/Two/Three`) |
| 12, 15, 16 | Sabotage mechanic (`bribe`, `cripple`, `steroids`, `weights`, `poison`, `train`, flavor text for each) |
| 17, 18 | Race payout / end-of-game (`won $`, `lost $`, `Has Won the Game!`, rank labels) |
| 19 | Loan shark dialogue |

This lines up well with `docs/resource-format-notes.md`'s form name-tables
(`frmTitle`, `frmMain`, `frmMenu`, ...) — next step is confirming exact
segment↔form pairing (likely each form module compiles to one CODE
segment, in the same order as the RT_RCDATA name-table entries).

## Not yet done: actual opcode disassembly

Everything above is structural/string recovery — genuinely useful for
Phase 4 (recovering all game text and roughly which system it belongs to)
but **not** the bytecode-to-logic reconstruction Phase 3 ultimately needs
(bet formulas, odds math, AI decisions, RNG usage). That requires decoding
the actual VB3 p-code instruction encoding, which we have not attempted
yet.

### Research pass on existing references (done, negative result)

Checked the obvious public sources:
- ["VISUAL BASIC REVERSED - A decompiling approach"](https://sandsprite.com/vb-reversing/files/VISUAL%20BASIC%20REVERSED.pdf)
  (AndreaGeddon) — **not applicable**. Covers VB6 apps compiled to
  *native x86*, not p-code at all (VB6 could target either). Entirely
  about walking VB6's native-code COM/runtime structures in IDA.
- [vb-decompiler.org's p-code decompiling article](https://www.vb-decompiler.org/pcode_decompiling.htm)
  and its linked [opcode table](https://www.vb-decompiler.org/vb_pcode_table.htm)
  — real p-code documentation, but **explicitly VB5/6 (32-bit) only**.
  Confirmed incompatible with what we're seeing in qrace.exe: VB5/6
  string literals are Unicode, referenced indirectly via an offset into
  a `ProcTable.DataConst` table; VB3 (per our own empirical finding above)
  embeds ASCII strings directly inline in the instruction stream with a
  length prefix, no indirection at all. Different enough that the VB5/6
  opcode byte values should **not** be assumed to carry over to VB3 — VB3
  was a 16-bit, real/protected-mode segmented interpreter, an older/
  different VM generation. Not using this table for qrace.exe without
  independent verification against our own binary.

Conclusion: no usable VB3-specific p-code opcode reference exists
publicly (or at least none turned up). Proceeding on VB3's own opcodes
requires original empirical work, not adaptation of VB5/6 documentation.

### Path forward (not started)

Most reliable option: source an actual VB3 IDE/compiler, write minimal
test programs with known source (single `Sub` with one statement at a
time — start with something like `x = 1 + 2` or `Print "hi"`), compile
each, and diff the resulting segment bytecode against the previous
program to isolate individual opcodes incrementally. This needs a real
copy of VB3 (an old, no-longer-sold Microsoft product) — worth checking
with the project owner before sourcing one from anywhere, since that's
its own separate acquisition/legality question distinct from qrace.exe's
own freeware status.

Slower fallback without a VB3 compiler: pure black-box inference from
qrace.exe's own bytecode alone — cross-referencing the 174 recovered
strings' surrounding bytes (which operations touch them, what precedes/
follows) against what those code paths are known to *do* (from playing
the reference oracle) to guess at opcode meanings. Much slower and more
error-prone than having known source-to-bytecode pairs, but possible.
