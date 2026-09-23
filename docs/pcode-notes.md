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

### Path forward: empirical diffing against a real VB3 compiler (in progress)

The project owner supplied a WinWorld-sourced VB3 Professional install
image (9 floppy disks as a `.7z`, kept outside the repo entirely — see
below). This unblocks the plan from the previous section: write minimal
known-source test programs, compile each with the real VB3 compiler, and
diff the resulting segment bytecode to isolate individual opcodes
empirically.

**Licensing note**: same posture as `qrace.exe` itself — used only as a
local research tool, never committed or redistributed. `.gitignore` now
also excludes `vb3_install/` and `*.7z` at the repo root.

**Getting VB.EXE running needed no installer at all.** The graphical
`SETUP.EXE` (Microsoft Setup Toolkit 3.x) reliably fails with "Insufficient
memory or disk space" under Wine's built-in `winevdm` regardless of actual
free space (tried both the real multi-hundred-GB filesystem and a
purpose-built small loop-mounted ext4 image as the target drive — same
failure either way, so it's a memory-check incompatibility, not a real
disk-space overflow; not root-caused further since it turned out to be
unnecessary). Instead:

1. The disk images are FAT12 (`7z x` reads them directly, no mounting
   needed). All 9 disks merge into one flat directory with no filename
   collisions (604 files total).
2. Most files on the disks are individually KWAJ-compressed (`file`
   identifies them as `MS Compress archive data, KWAJ variant`). Batch
   decompressed with `tools/vb3ide/kwaj_extract.c` (uses `libmspack`,
   already packaged on Arch as `extra/libmspack`; build with
   `gcc kwaj_extract.c -o kwaj_extract -lmspack`).
3. `VB.EX_` decompresses straight to a valid win16 NE executable — the VB3
   IDE itself. It runs under the same stock-Wine win16 shim as `qrace.exe`
   (see `docs/gameplay-notes.md`), needing only `VBRUN300.DLL` copied
   alongside it (already have this from `original/`). No install, no
   registry setup, no other support files needed to reach a working IDE
   with toolbox/properties window/code editor and a working **File > Make
   EXE File** compiler.
4. GUI-automated via `xdotool` against a headless Xvfb display, with a
   minimal `openbox` window manager running (needed for `xdotool
   windowactivate`/focus to work at all — bare Xvfb has no window manager
   and Wine windows never receive input focus without one).

**Empirical diffing methodology (confirmed working)**: compile a baseline
project, compile a variant with exactly one small change, diff the NE
segment tables (`tools/segment_parser.py`'s `parse_segments()`) byte for
byte.

Concrete results from a first diffing pass (blank `Form1` with an empty
`Form_Load`, vs. adding one statement to it):

- **Segment 1 (25 bytes) is byte-identical across every VB3 p-code
  executable checked so far** — a blank test project, `x = 1`, `x = 2`,
  `x = 3`, *and* `qrace.exe` itself all have the exact same 25-byte
  segment 1. Strong evidence this is a fixed, universal bootstrap/entry
  stub emitted by the VB3 linker for every p-code executable, unrelated to
  any particular project's code.
- **Adding one statement (`x = 1`) to `Form_Load`** grows segment 3 (the
  form's compiled record — same segment that carries the header/caption
  structure documented above) from 200 to 256 bytes, and adds a **new,
  separate 18-byte CODE segment** that doesn't exist in the zero-statement
  baseline at all. Working interpretation: segment 3 is a per-module
  procedure descriptor table (one fixed-size entry per `Sub`/`Function`,
  including empty ones), and each procedure's actual compiled instructions
  live in their own dedicated small segment.
- That 18-byte segment for `x = 1`:
  `4b49ed37b00ed42f1a004b49d9655e0e5b0e`. Changing only the literal (`x =
  2`, `x = 3`) changes **exactly one byte**, at offset 2, and nothing else
  in the 18 bytes: `0xED` (1), `0xF8` (2), `0xFE` (3). This is the
  strongest lead so far for where the integer-literal encoding lives — but
  the value isn't a simple linear function of the literal (diffs are +11
  then +6, not a constant step), so it's not yet clear whether this byte
  *is* the literal (via some biased/table-driven encoding — e.g. a
  dedicated single-byte opcode per small integer constant, common in
  threaded p-code VMs) or something else that merely correlates with it
  (e.g. a per-procedure checksum). Not resolved.

**Next steps** (not started): automate the compile-and-diff cycle (script
the `xdotool` sequence end to end, including typing arbitrary code and
reading back the compiled segment) instead of doing it by hand one value
at a time, then sweep enough integer literals to determine whether offset
2 is linear/table-driven/checksummed. Once literals are nailed down, apply
the same methodology to isolate the actual arithmetic/assignment opcodes
themselves (everything in the 18 bytes *other* than the one literal byte
is presumably fixed "assign literal to variable" scaffolding, not yet
individually identified).
