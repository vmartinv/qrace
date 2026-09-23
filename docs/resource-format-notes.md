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

## Data blob header: fixed prefix + tag list + caption (confirmed)

Every "data blob" resource (large half of a name-table/data-blob pair)
starts with the same fixed-format header before any control layout or FRX
picture data, decoded by `tools/parse_form_headers.py`:

```
offset 0:  u16 0xFFCC          -- constant magic
offset 2:  u16 0x002C          -- constant (purpose unknown)
offset 4:  u32                 -- varies per form; no correlation found
                                   with blob length or control count
offset 8:  u8  0x00            -- constant
offset 9:  u8                  -- varies, purpose unknown
offset 10: u16 0x0003          -- constant
offset 12: u16 0x0000          -- constant
offset 14: (u8 tag, u8 0x00)*  -- variable-length list, terminated by
                                   (0xFF, 0x00). Tag values seen: 0, 38,
                                   39, 40, 50 -- meaning unknown, possibly
                                   form-level boolean properties (a set of
                                   "flag present" markers).
then:      Pascal string (u8 length + ASCII) -- the form's Caption
           property.
```

This recovers every form's real window caption, matched against its
resource-id-order name/data pair:

| Form (internal name) | Caption | # named controls | Data blob size |
|---|---|---|---|
| `frmTitle` | "Quibbles v1.0" | 9 | 647,680 B |
| `frmMain` | "Menu Screen" | 16 | 88,832 B |
| `frmMenu` | "Sponsor a Quibble" | 25 | 53,760 B |
| `frmAvailable` | "Information" | 7 | 18,944 B |
| `frmInfo` | "Options" | 6 | 2,304 B |
| `frmOptions` | "Player Setup" | 19 | 70,144 B |
| `frmPlayer` | "Retire" | 7 | 1,280 B |
| `frmRetire` | "Special" | 3 | 1,536 B |
| `frmSpecial` | "Sponsoring" | 0 | 1,280 B |
| `frmSponsor` | "Currently Sponsored Quibbles" | 3 | 53,760 B |
| `frmStatus` | "Select your target" | 5 | 1,536 B |
| `frmTarget` | "Updates" | 2 | 1,280 B |
| `frmUpdate` | "Updates" | 4 | 1,536 B |
| `frmUpdate2` | "Game Over" | 5 | 52,992 B |
| `frmWinners` | "Loan Shark" | 5 | 18,944 B |
| `frmLoan` | *(no data-blob resource exists at all — see below)* | 9 | — |

**Open question, not yet resolved:** in most rows, the recovered caption
reads as a near-exact description of the *next* form in the directory
(id1's TITLE/MAIN/MENU/AVAIL/.../LOAN order) rather than of the form whose
name-table it's paired with by id-adjacency — e.g. `frmInfo`'s data blob is
captioned "Options" (which sounds like `frmOptions`), `frmPlayer`'s is
captioned "Retire" (sounds like `frmRetire`), `frmWinners`'s is captioned
"Loan Shark" (sounds like `frmLoan`). This is consistent enough across 12+
of the 15 rows that it might indicate our (name-table, data-blob) pairing
convention is off by one form-slot, rather than forms simply having
internal names that lag their in-game captions (which does happen commonly
in real VB codebases and would also explain it, e.g. `frmTitle` ↔ "Quibbles
v1.0" and `frmMenu` ↔ "Sponsor a Quibble" fit their *own* paired name just
as well as the "shifted" reading). Not resolved from string/caption
evidence alone — needs an independent anchor (e.g. matching a name-table's
control list against actual control-position records inside a specific
data blob) to settle definitively. Do not treat the table above as
authoritative "form X has caption Y" until this is resolved; treat it as
"this caption appears in the data blob adjacent to name-table X".

## `frmLoan` has no data-blob resource at all

Confirmed by walking the raw NE resource table directly (not just an
empty/skipped slot like the id-3 gap): id 35 (`frmLoan`'s name-table) is
the *last* `RT_RCDATA` entry in the file — there is no id 36. Every other
form has a paired data blob; this one doesn't. Best working hypothesis:
VB3 only emits a data-blob RCDATA resource when a form has FRX-referenced
binary content (an embedded picture); `frmLoan` apparently has none, and
its compiled control-layout/property data (if any needs to exist outside
the p-code itself) must live somewhere else — not confirmed.

## `id4`: likely an orphaned duplicate form blob

`id4` (221,952 B) has the *same* fixed header, the *same* tag list
(`[0, 38, 39]`), and the *same* caption ("Quibbles v1.0") as `frmTitle`'s
real data blob (`id6`), but has no name-table paired with it — it sits
immediately after `id2` and immediately before `id5` (`frmTitle`'s real
name-table), with no id3 name-table between them (id 3 is the pre-existing
known gap in the id sequence, see above). Working hypothesis: this is dead
weight — an earlier/duplicate version of the title-screen form, deleted
during development, whose name-table (would-be id 3) was reclaimed by the
linker but whose larger data blob (id 4) wasn't. Not confirmed independent
of the caption/tag match.

## `id1` / `id2`: still unidentified

- `id1` (768 B) is the project directory (see above) — well understood.
- `id2` (5632 B) has none of the form-header magic (`0xFFCC`), no
  printable strings, and no embedded `BM` signatures. Structurally
  unlike every other resource in the file. Purpose unknown.

## Still unmapped

- The exact byte layout of the "data blob" outside of the header decoded
  above and the embedded BMPs (control positions, sizes, most property
  values, event procedure entry points/offsets into the module's p-code).
  Needed for Phase 3, and would also resolve the pairing-shift open
  question above.
  - The small header preceding each embedded `BM` signature (VB's FRX
  picture wrapper) — not needed for extraction, but would help confirm
  we're not missing non-BMP picture types (icons/cursors/metafiles can also
  be stored via FRX).
- `id2`'s purpose (see above).

## Tooling

- `tools/ne_parser.py <exe>` — parses the NE header + resource table,
  extracts the string table (if any — none found in this binary) and dumps
  every raw resource to `extraction/resources/` or `extraction/forms/`
  (both gitignored; regenerate locally from your own copy of the exe).
- `tools/extract_bitmaps.py` — scans those raw dumps for embedded BMPs and
  writes them out as standalone `.bmp` files under
  `extraction/resources/bitmaps/`.
- `tools/parse_form_headers.py <exe>` — decodes the fixed-format data-blob
  header (magic/tags/caption) for every form and prints the table above.
