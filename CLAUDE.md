# Quibble Race Decompile/Port

Faithful modern port of **Quibble Race v1.5** (Blackeye Software / Derek
Yu), a 16-bit Windows 3.0 VB3 p-code exe in `original/`. Game rules come
from the decompiled source, not guesses. The running original is used only
as an automated correctness oracle. Target: TypeScript + Phaser 3 + Vite
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
```

## Status

| phase | state | notes |
|---|---|---|
| 1 Reference oracle (Wine) | done | `docs/gameplay-notes.md` |
| 2 Decompile | done | 16 forms + MODULE1.BAS, 101 procedures, all lifted |
| 3 Verify (rebuild in IDE) | partial | 82/101 procedures identical; see below |
| 4 Names + spec (`docs/game-spec.md`) | not started | |
| 5 Port (DOM forms + Phaser race) | not started | |
| 6 Oracle diff harness | not started | |
| 7 Polish & publish | not started | |

Rebuild differences left: forms use Times New Roman / MS Serif, which the
IDE prefix lacks (it substitutes, so form resources differ). Global
offsets are shifted by 2 in frmTitle. frmMenu's general procedures sort in
a different order. Cross-form control indices (`SUBOBJ`) differ. None of
these change the source's meaning.

## Next steps

1. Name globals/procedures (`names.json`, applied by a script), write the spec.
2. Port: `vb/` runtime (Rnd LCG, conversions, forms), forms 1:1, race scene.
