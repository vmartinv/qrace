# NE Resource Format Notes — qrace.exe

The general VB3 NE resource format documentation (how the `RT_RCDATA`
name-table/data-blob pairing works, the data-blob header format, embedded
BMP extraction) moved to a standalone repo:
**[vmartinv/vb3-decompiler](https://github.com/vmartinv/vb3-decompiler)**
(see `RESOURCE_FORMAT.md` there — `qrace.exe` is actually the worked
example throughout that doc). This file only covers what's specific to
`qrace.exe` itself — clone that repo alongside this one to regenerate any
of the findings below.

## Resource table summary

36 resource entries total:

- `RT_GROUP_ICON` (id 1) + `RT_ICON` (id 1) — the app icon.
- `RT_RCDATA` — 34 entries: forms, control layout, strings, pictures. No
  `RT_STRING`, `RT_BITMAP`, or `RT_DIALOG` resources exist at all.
- Resource id 3 doesn't exist in the id sequence (1, 2, 4-35) — likely a
  form/module deleted during development, VB3's linker didn't reclaim the
  id.

## Recovered form captions

Decoded with `vb3-decompiler/tools/parse_form_headers.py original/qrace.exe`
(see that repo's `RESOURCE_FORMAT.md` for the open question about whether
these captions are shifted by one form-slot — not resolved):

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
| `frmLoan` | *(no data-blob resource exists at all)* | 9 | — |

## qrace.exe-specific resource oddities

- **`frmLoan` has no data-blob resource at all.** Confirmed by walking the
  raw NE resource table directly: id 35 (`frmLoan`'s name-table) is the
  *last* `RT_RCDATA` entry in the file — there is no id 36. Every other
  form has a paired data blob; this one doesn't (see vb3-decompiler's
  `RESOURCE_FORMAT.md` for the general hypothesis on why).
- **`id4`: likely an orphaned duplicate form blob.** 221,952 bytes, same
  fixed header/tags/caption ("Quibbles v1.0") as `frmTitle`'s real data
  blob (`id6`), but no name-table paired with it — sits between `id2` and
  `id5` (`frmTitle`'s real name-table), with no id3 between them (the
  known gap above). Working hypothesis: dead weight from a deleted
  earlier/duplicate title-screen form, whose name-table (would-be id 3)
  was reclaimed by the linker but whose larger data blob (id 4) wasn't.
- **`id1`** (768 B) is the project directory — contains `QRACE`,
  `QUIBBLES`, and a list of the 16 `.FRM` module filenames
  (`TITLE.FRM`, `MAIN.FRM`, `MENU.FRM`, `AVAIL.FRM`, `INFO.FRM`,
  `OPTIONS.FRM`, `PLAYER.FRM`, `RETIRE.FRM`, `SPECIAL.FRM`,
  `SPONSOR.FRM`, `STATUS.FRM`, `TARGET.FRM`, `UPDATE.FRM`,
  `UPDATE2.FRM`, `WINNERS.FRM`, `LOAN.FRM`).
- **`id2`** (5632 B) is still unidentified — no form-header magic, no
  printable strings, no embedded `BM` signatures. Purpose unknown.

## Embedded pictures

Extracted with `vb3-decompiler/tools/extract_bitmaps.py` — every one opens
cleanly (`file`/`magick identify` agree, verified visually):

- Repeated 75×75×24-bit frames — the quibble/character sprite (confirmed
  visually: a small green creature), 8 animation frames.
- Repeated 750×75×24-bit frames — the horizontal track background texture
  (confirmed visually against the running game — NOT a sprite strip as
  first guessed from the raw dimensions alone).
- Distinct portrait-style images per form (confirmed visually).

## Still unmapped

- Exact control positions/sizes/property values within each data blob
  (outside the header + embedded BMPs) — needed to actually place UI
  elements for the port, and would help resolve the caption-pairing
  ambiguity noted above.
- `id2`'s purpose.
