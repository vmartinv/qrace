# Quibble Race Decompile/Port — Project Plan

## Progress log

- **Phase 1 (reference oracle): done.** `qrace.exe` runs under stock Wine
  (no `WINEARCH=win32`/extra packages needed — Wine's own
  `syswow64\winevdm.exe` handles it) and renders correctly, verified
  headlessly via Xvfb. Details: `docs/gameplay-notes.md`.
- **Phase 2 (resource extraction): done, plus follow-up structural work.**
  `tools/ne_parser.py` + `tools/extract_bitmaps.py` extract everything from
  the NE resource table — 34 `RT_RCDATA` entries pairing a control
  name-table with a compiled form/picture data blob per form (no
  `RT_STRING`/`RT_BITMAP`/`RT_DIALOG` resources exist at all); embedded BMP
  sprites extract and open cleanly (visually verified). Follow-up:
  `tools/parse_form_headers.py` decoded the fixed-format header every data
  blob starts with and recovered all 15/16 forms' real window captions
  (`frmLoan` has no data-blob resource in the file at all — confirmed, not
  just an empty slot); flagged one open question (possible off-by-one in
  the name-table/data-blob pairing — captions read like they describe the
  *next* form in ~12/15 cases, not conclusively resolved) and two
  unidentified resources (`id2`, and `id4` — likely an orphaned duplicate
  title-screen blob). Details: `docs/resource-format-notes.md`.
- **Phase 3 (p-code disassembly): in progress, structural recovery done,
  empirical opcode research now unblocked and underway.**
  `tools/segment_parser.py` parses the NE segment table and recovered 174
  inline string literals (VB3 embeds strings directly in the code segment
  as `<u16 length><raw bytes>`, no separate string pool — confirmed
  empirically). Checked public VB p-code references (AndreaGeddon's paper:
  VB6-native-only, not applicable; vb-decompiler.org's opcode table:
  explicitly VB5/6, confirmed incompatible with VB3's inline-ASCII string
  scheme) — no usable public reference exists. Project owner supplied a
  real VB3 Professional install image (used only as a local research tool,
  never committed — see `.gitignore`); got the VB3 IDE (`VB.EXE`) running
  under Wine with no installer needed at all (just `VBRUN300.DLL`
  alongside it), and validated an empirical compile-and-diff methodology:
  compile minimal test programs, diff the NE segment tables byte for byte.
  First concrete results: segment 1 (25B) is a byte-identical universal
  bootstrap stub across every VB3 p-code executable tested, including
  `qrace.exe` itself; a form's compiled record (segment 3) is a per-module
  procedure descriptor table that grows per added statement, with each
  procedure's actual instructions landing in their own small dedicated
  segment. **Integer literal encoding now fully cracked** via an automated
  34-value sweep (`tools/vb3ide/sweep_literal.sh`): values 0-10 get
  dedicated single-byte "push small int" opcodes (evenly spaced by 6 for
  2-10, a linear jump table; 0 and 1 don't fit the same stride, likely
  separate dedicated slots); values 11-32767 use a generic 2-byte opcode
  (`34 38`) followed by the literal as a raw little-endian u16. Followed up
  with a broader statement-type sweep (`tools/vb3ide/compile_snippet.sh`):
  confirmed a universal 2-byte procedure prologue and 8-byte epilogue;
  LOAD (`21 2D`) and STORE (`D4 2F`) variable opcodes, each followed by a
  `<u16>` slot operand — variable identity is positional (first-use order,
  slots 4 bytes apart starting at 0x1A), not name-based, confirmed by `x =
  1` and `y = 1` compiling to byte-identical code; an integer
  ADD/SUB/MUL opcode family (`D3`/`E1`/`EF`, evenly spaced by 14 — another
  linear jump table) and unary negate (`0B 39`); confirmed `/` division
  promotes to a separate floating-point encoding entirely (different
  literal-push opcodes, different arithmetic suffix), consistent with real
  VB semantics. Resolved an initial ADD ambiguity: it has two forms
  depending on operand provenance (`D3 38` literal+literal, `DF 40`
  LOAD+LOAD), with a small coercion opcode (`B0 0E`) bridging a mixed
  literal+LOAD case — confirmed via `x = y + z` vs. `x = x + 1` vs. `x = 1
  + 2`. First real opcode-level decode of VB3 p-code, anywhere. Details:
  `docs/pcode-notes.md`.
- Phases 4-7: not started.

## Context

`~/qrace/original/` contains "Quibble Race v1.5" by Blackeye Software (Derek Yu's
early freeware game, pre-dating the 2004 Newgrounds Flash version and the 2020
UFO 50 remake). It's a 16-bit Windows 3.0 executable (NE format), built with
Visual Basic 3.0 (confirmed via bundled `VBRUN300.DLL`) — meaning the game logic
is compiled to VB p-code, not native x86. A web search turned up no prior
decompilation, remake, or port of this specific version — this would be first.

Goal: produce a **faithful** modern port — exact game rules/formulas recovered
from disassembly (not guessed from observed behavior), exact resources
recovered from the executable's resource table, running original used only as
an automated correctness oracle, not for "eyeballing." Target stack: TypeScript
+ Phaser 3, scaffolded via Vite (already scaffolded at `~/qrace/port/`, unused
so far — no dependencies installed, no code written).

**Repo will go public eventually**, which fixes an important constraint: the
original binary (`qrace.exe`, `VBRUN300.DLL`) and any raw assets extracted
byte-for-byte from it (sprites, sounds) must never be committed. Freeware ≠
redistribution rights, and the DLL is Microsoft runtime code. This follows the
convention used by console decompilation projects (e.g. N64 decomp scene):
ship only our own code + recovered logic/data + re-authored art; anyone
building the project supplies their own legally-obtained copy of the original
locally, and a gitignored extraction step regenerates assets from it.

## Repo & Licensing Setup (do first)

- `git init` already done at `~/qrace/` (no commits yet — clean state).
- `.gitignore` at repo root:
  - `original/` — never commit the exe/DLL.
  - `extraction/resources/`, `extraction/forms/` (raw extracted binary
    assets — bitmaps, icons, any binary blobs pulled straight from the exe).
    `extraction/strings/` (recovered text) is fine to commit — short UI
    strings aren't meaningfully protectable and we need them versioned as
    part of the recovered spec.
  - Standard `node_modules/`, `dist/`, etc. inside `port/`.
- Write `~/qrace/PLAN.md` (this plan, committed) and `~/qrace/README.md`
  explaining: what this project is, credit to Derek Yu / Blackeye Software,
  a disclaimer that the repo contains no original copyrighted binaries, and
  instructions that building the extraction pipeline requires the user to
  supply their own copy of `qrace.exe` in `original/` (gitignored).
- Initial commit: `PLAN.md`, `README.md`, `.gitignore`, empty tool/doc dir
  structure, the vite scaffold in `port/` (that's our own boilerplate, fine
  to commit).

## Phase 1 — Reference oracle (Wine)

Get the original actually running on this Arch machine so we have ground
truth to validate against later:
- 16-bit NE apps need Win16 support, which 64-bit Wine dropped. Use a
  32-bit `WINEPREFIX` (Arch's `wine` package supports multilib/32-bit) —
  `WINEARCH=win32 WINEPREFIX=~/qrace/.wine32 winecfg`, then run
  `qrace.exe` from `original/`. Fall back to `winevdm`/`otvdm` (AUR) if
  plain 32-bit Wine can't load the NE binary.
- Confirm it boots, plays a full round (setup → bet → race → results), and
  note anything not obvious from static analysis (turn flow, dialog
  sequence) into `docs/gameplay-notes.md`.

## Phase 2 — NE resource extraction

Write Python tooling under `tools/` to parse the executable's NE resource
table:
- Parse NE header + resource table (segment offsets already visible via
  `xxd`/`file`; need a proper parser, no existing Linux tool handles VB3's
  resource layout out of the box).
- Extract: string table (matches what plain `strings` already surfaced —
  need the *structured* table, not just a flat string dump, to map strings
  to their usage context), bitmaps/icons, and — this needs investigation —
  VB3 form resources. VB3 forms are **not** standard Win32 `RT_DIALOG`
  templates; layout/control data is VB's own proprietary compiled-form
  format embedded in the exe (originally a `.FRX` file at design time).
  Document findings as we go in `docs/resource-format-notes.md` since this
  part is genuinely unexplored territory.
- Output raw extracted assets into `extraction/resources/` and
  `extraction/forms/` (gitignored, regenerated locally by anyone building
  the project from their own copy).

## Phase 3 — P-code disassembly (highest effort/risk)

- No modern decompiler targets VB3 p-code (VB Decompiler-class tools target
  VB5/6). Likely path: write a custom Python disassembler for the VB3
  p-code opcode set (stack-based VM, documented in scattered old reverse
  engineering references) under `tools/pcode/`.
- Output: raw disassembly listings per form/module event procedure
  (`Form_Load`, `cmdBet_Click`, etc.) into `extraction/pcode/` (gitignored —
  derived directly from the copyrighted binary).
- Manually work disassembly back into readable pseudo-BASIC, procedure by
  procedure, prioritizing: betting math, payout/odds formulas, race
  simulation, AI opponent behavior, the loan-shark interest mechanic, RNG
  usage (VB3 `Rnd`/`Randomize` use a documented fixed LCG, so once we see
  how the code seeds/scales it, results are exactly reproducible).
- Flag explicitly: this phase may not fully automate — budget for genuine
  manual RE effort per routine, and expect this to span many sessions.

## Phase 4 — Recovered design spec

Turn Phase 3's findings into `docs/game-spec.md`: a human-readable,
cross-referenced (to disassembly) description of every game rule — this
becomes the spec the TypeScript port implements against, and is the
*committable* artifact (our own writing describing recovered facts/rules,
not the copyrighted code/assets themselves).

## Phase 5 — Build the port (TS + Phaser 3 + Vite)

- `port/` already scaffolded (vanilla-ts vite template, no deps installed
  yet). Add Phaser 3 dependency.
- Structure Phaser scenes 1:1 with original screens: Setup, Betting/Menu,
  Race, Results, Loan Shark dialog, Info Broker dialog.
- Art: re-author sprites/backgrounds ourselves (referencing extracted
  originals locally as a guide, never committing or shipping the source
  bitmaps) so the shipped repo is redistribution-safe.
- Implement Phase 4's spec exactly — data tables (quibble stats, odds,
  prices) and formulas ported verbatim from recovered logic.

## Phase 6 — Validation harness

Use the Wine-run original (Phase 1) as an automated oracle, not visual
comparison: script fixed input sequences through both original and port
(via Wine automation / UI scripting where feasible), diff numeric outputs
(bet results, race outcomes, payouts) programmatically. Use this to catch
places where disassembly was misread, not as the primary accuracy method
(that's Phase 3/4).

## Phase 7 — Polish & publish

Vite static build, README finalized with credits/disclaimers, publish
(GitHub + optionally a playable static hosting target) once the licensing
posture from the setup phase has been double-checked.

## Notes on scope

This is a multi-session reverse-engineering project — Phases 2 and 3 in
particular are open-ended research, not a fixed-size coding task. This plan
covers the roadmap and the immediate next actions (repo/licensing setup +
starting Phase 1/2); later phases will get more detailed sub-plans as we
reach them and learn more about the actual resource/p-code formats involved.

## Verification

- Phase 1: original game visibly runs and is playable end-to-end under Wine.
- Phase 2: extracted strings match the flat `strings` output already seen;
  extracted bitmaps open as valid images.
- Phase 3/4: spot-check disassembled formulas against observed behavior in
  the Wine oracle for a handful of manual test cases.
- Phase 5/6: `npm run build` in `port/` succeeds; automated diff harness
  (Phase 6) passes for the scripted scenarios.
