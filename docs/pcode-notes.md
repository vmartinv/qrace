# P-code / Segment Notes — qrace.exe

The general VB3 NE/p-code reverse-engineering tooling and findings (how to
parse the segment table, how to decompress/run a VB3 compiler, the
decoded opcode set) moved to a standalone repo:
**[vmartinv/vb3-decompiler](https://github.com/vmartinv/vb3-decompiler)**
(see `OPCODES.md` there). This file only covers what's specific to
`qrace.exe` itself — clone that repo alongside this one to regenerate any
of the findings below.

## Segment table

19 NE segments (`vb3-decompiler/tools/segment_parser.py`). Segment 2 has
`seg_data_offset = 0` (no on-disk image — a zero-initialized/moveable
data segment, presumably VB3's runtime global/automatic data area). All
others are `CODE` segments (flag bit 0 clear) except segment 2. Segment
table *index* order doesn't match file layout order — e.g. segment 3
(6880 bytes) is laid out in the file *after* segments 4 through 19, even
though it's numbered lower. This is normal for NE linkers (table index
reflects intersegment fixup numbering, not physical position) but worth
remembering when reasoning about offsets.

Segment 1 (25 bytes) matches the universal VB3 bootstrap stub documented
in vb3-decompiler's `OPCODES.md` — confirmed byte-identical to the same
segment in from-scratch test programs compiled through a real VB3
compiler. Segment 3 (6880 bytes, the second-largest) is a strong candidate
for shared runtime glue code (VB3 program startup, shared helper routines
called from every form) rather than a specific form's logic, since it
doesn't correlate with any single form's string content the way segments
4-19 do — not confirmed yet though.

## Recovered strings: 174 total

VB3 embeds string literals directly inline in the code segment (`<u16
length><raw bytes>`, no separate string pool — see vb3-decompiler's
`OPCODES.md` for how this was confirmed and cross-validated). Scanning
every segment of `qrace.exe` for this pattern recovers **174 strings**,
each attributed to a segment + byte offset, written to
`extraction/pcode/inline_strings.json` (gitignored — derived directly from
the binary; regenerate with `vb3-decompiler/tools/segment_parser.py
original/qrace.exe`).

**Known false-positive source**: length-2 matches (`'XK'`, etc.) show up
repeatedly and are almost certainly coincidental — a bytecode operand byte
pair that happens to be ASCII-printable and preceded by a matching u16
value. Not filtered out yet; treat any 2-character "string" in the output
as noise unless it's independently plausible (e.g. `"#1"`, `"#2"`, `"#3"`
in segment 18 are clearly real — player rank labels — despite being short).

## Segment → game-system correlation (from string content only)

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

## Next steps

- Once vb3-decompiler's opcode set covers enough of the instruction set
  (comparisons, control flow, procedure calls — see its "Open questions"
  section), apply it to segments 4-19 above, starting with the
  already-recovered strings as landmarks (e.g. the betting-flow segments
  are a natural place to look for the actual bet/payout formulas).
- Confirm exact segment↔form pairing against `docs/resource-format-notes.md`'s
  name-tables.
