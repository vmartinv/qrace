# Quibble Race Decompile/Port

Faithful modern port of **Quibble Race v1.5** (Blackeye Software / Derek
Yu), a 16-bit Windows 3.0 VB3 p-code exe in `original/`. Game rules come
from the decompiled source, not guesses. The running original (Wine) is only a
visual reference. Target: TypeScript + Phaser 3 + Vite
(`port/`).

The decompiler is the companion repo `~/vb3-decompiler` (public). Gaps it
shows on qrace get fixed there, reduced to a battery case first (its
CLAUDE.md); qrace is never its pass/fail target.

## Rules

- `.md` files hold **current findings and next steps only**, kept
  succinct. When something is superseded, rewrite it in place. Don't keep
  retractions, dead ends or history (git has that).
- Commit after each validated milestone (in whichever repo changed).
- Never commit `original/` or `extraction/` (the decompiled source and
  art are copies of the original). Commit only our own work: names map,
  spec (own words), port code, re-authored art.
- The VB3 IDE Wine prefix (`~/vb3-decompiler/work/.wineprefix`) is shared
  with the vb3-decompiler session: don't change it, and don't build there
  while its batteries run.

## Pipeline

```sh
tools/decompile.sh          # original/qrace.exe -> extraction/decompiled/
tools/apply_names.py        # -> extraction/named/ (names.json)
python3 tools/gen_layouts.py  # -> port/src/forms/layouts.json, port/original-assets/
cd port && npm run dev      # ?art=original (dev only), ?tick=ms, ?seed=n
node harness/play.mjs 2     # headless game to Game Over (needs the dev server)
tools/deploy.sh [original|own]  # build -> gh-pages branch (GitHub Pages)
```

## Status

| phase | state | notes |
|---|---|---|
| 1 Original under Wine | done | `docs/gameplay-notes.md` |
| 2 Decompile | done | 16 forms + MODULE1.BAS, 101 procedures, all lifted |
| 3 Verify (rebuild in IDE) | done | 88/101 procedures identical; see below |
| 4 Names + spec (`docs/game-spec.md`) | done | `names.json`, `tools/apply_names.py` |
| 5 Port (DOM forms + Phaser race) | playable | all 16 forms; rounds, race, payout checked in browser |
| 6 Polish & publish | not started | |

Rebuild differences left, none reproducible from source text. The 13
procedures differ only in cross-form control operands (`SUBOBJ`). These are
name-table indices that follow qrace's design-session history, including
holes for deleted controls. The form resources differ only because the IDE
prefix lacks Times New Roman / MS Serif.

`extraction/named/` is for reading only: names reach the compiled code
(procedure names set their sort order), so never build from it.

Port look: Windows 95 skin. MS Sans Serif 8/10/12 pt are pixel fonts
converted from Wine's LGPL clone (`tools/fon2woff.py` ->
`port/public/fonts/`). Serif and large sizes use Liberation look-alikes.

## Next steps

1. Polish and publish (phase 6).
