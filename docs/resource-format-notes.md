# NE Resource Format Notes — qrace.exe

Findings from `tools/ne_parser.py` + `tools/extract_bitmaps.py` while
extracting resources from `original/qrace.exe`. VB3's compiler embeds
everything through the generic NE resource mechanism, but the actual
form/picture data inside those resources is VB's own proprietary format,
not any standard Win32 resource type.

## NE resource table summary

36 resource entries total:

- `RT_GROUP_ICON` (id 1) + `RT_ICON` (id 1) — the app icon. Standard format,
  nothing VB-specific here.
- `RT_RCDATA` — **34 entries, everything else** (forms, control layout,
  strings, pictures). No `RT_STRING`, `RT_BITMAP`, or `RT_DIALOG` resources
  exist at all — VB3 doesn't use those standard resource types.
- One resource id (3) doesn't exist in the id sequence (1, 2, 4-35) — likely
  a form/module deleted during development, VB3's linker didn't reclaim the
  id. One trailing zero-length/zero-id NAMEINFO slot also exists in the raw
  table (handled by `ne_parser.py` as an empty-slot skip, not a real
  resource).

## RT_RCDATA structure: (name table, data blob) pairs per form

The 34 RCDATA entries follow a clear repeating pattern — a small resource
(exactly the 256-byte alignment minimum, i.e. real content is ≤256 bytes)
immediately followed by a much larger one:

- **Name table** (small): a sequence of Pascal-style (1-byte length prefix,
  no null terminator) ASCII strings. First string is the form's name
  (`frmTitle`, `frmMain`, `frmMenu`, ...), followed by every named control
  on that form in declaration order (e.g. `frmMain` → `imgTrack1`,
  `imgTrack2`, `imgTrack3`, `imgQuibble`, `lblKey`, ...). This is almost
  certainly how the p-code resolves symbolic control names to indices at
  runtime — useful reference once we're disassembling p-code that touches
  the UI.
- **Data blob** (large): the compiled form — control properties/layout plus
  every FRX-embedded picture used by that form's controls, concatenated.
  Exact non-picture layout (control positions, property values) is still
  unmapped; picture data inside is trivially recoverable (see below).

Resource id 1 (768 bytes, bigger than a bare name table) looks like a
project-level resource — it contains the strings `QRACE`, `QUIBBLES`, and
`TITLE.FRM`, i.e. a directory of the project's compiled form modules.

## Embedded pictures: standard BMP, trivially extractable

Every FRX picture found so far is a **complete, standalone Windows 3.x BMP**
(`BM` magic + valid `BITMAPFILEHEADER`/`BITMAPINFOHEADER`, 24-bit, no
compression) embedded verbatim inside the data blob, preceded by a small
VB-specific wrapper header (not yet decoded, but irrelevant for extraction —
we just scan for `BM` + a sane `bfSize`/`bfOffBits`).

`tools/extract_bitmaps.py` pulls these out and every one so far opens
cleanly (`file`/`magick identify` agree, verified visually):

- Repeated 75×75×24-bit frames — a single quibble/character sprite
  (confirmed visually: a small green creature).
- Repeated 750×75×24-bit frames — 75px-wide, so likely a 1×10 horizontal
  sprite strip (matches help.txt's mention of "the amazingly animated
  quibble running across the top of the screen").
- Distinct portrait-style images per form (confirmed visually: a different
  character portrait), so pictures are form/control-specific, not one
  shared global image pool.

## No string table resource — text lives in the p-code/form data

`ne_parser.py`'s string-table extraction produced zero entries (confirmed:
no `RT_STRING` resources exist in this binary at all). All the UI text
visible via plain `strings original/qrace.exe` (bet messages, dialogue,
etc.) must be embedded directly in the RT_RCDATA data blobs — either as
string literals in the compiled p-code itself, or as form control
properties (`Caption`, `Text`) in the form data. Recovering those will be
part of Phase 3 (p-code disassembly), not a separate string-extraction step.

## Still unmapped

- The exact byte layout of the "data blob" outside of the embedded BMPs
  (control positions, sizes, property values, event procedure entry
  points/offsets into the module's p-code). Needed for Phase 3.
  - The small header preceding each embedded `BM` signature (VB's FRX
  picture wrapper) — not needed for extraction, but would help confirm
  we're not missing non-BMP picture types (icons/cursors/metafiles can also
  be stored via FRX).

## Tooling

- `tools/ne_parser.py <exe>` — parses the NE header + resource table,
  extracts the string table (if any — none found in this binary) and dumps
  every raw resource to `extraction/resources/` or `extraction/forms/`
  (both gitignored; regenerate locally from your own copy of the exe).
- `tools/extract_bitmaps.py` — scans those raw dumps for embedded BMPs and
  writes them out as standalone `.bmp` files under
  `extraction/resources/bitmaps/`.
