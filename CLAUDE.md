# Quibble Race Decompile/Port

Faithful modern port of **Quibble Race v1.5** (Blackeye Software / Derek
Yu), a 16-bit Windows 3.0 VB3 p-code exe in `original/`. Game rules are
recovered from disassembly, not guessed. The running original is used only
as an automated correctness oracle. Target: TypeScript + Phaser 3 + Vite
(`port/`, scaffolded, unused).

General VB3 tooling lives in the companion repo `~/vb3-decompiler`
(local, not yet published). This repo holds qrace-specific findings.

## Rules

- `.md` files hold **current findings and next steps only**, kept
  succinct. When something is superseded, rewrite it in place. Don't keep
  retractions, dead ends or history (git has that).
- Commit after each validated milestone (in whichever repo changed).
- Never commit `original/` (exe, `VBRUN300.DLL`) or anything extracted
  byte-for-byte from it (`extraction/resources|forms|pcode`). Recovered
  text/rules written in our own words are fine. Port art is re-authored.

## Status

| phase | state | notes |
|---|---|---|
| 1 Reference oracle (Wine) | done | `docs/gameplay-notes.md` |
| 2 Resource extraction | done | `docs/resource-format-notes.md`; control layout not decoded |
| 3 P-code disassembly | in progress | `docs/pcode-notes.md`; all 101 procedures decode, handler naming partial |
| 4 Game spec (`docs/game-spec.md`) | not started | our own description of recovered rules |
| 5 Port (Phaser scenes 1:1 with forms) | not started | |
| 6 Oracle diff harness (xdotool) | not started | |
| 7 Polish & publish | not started | |

## Next steps

1. Name the remaining p-code handlers and builtins (Rnd, Int, …).
2. Map procedure records to event names.
3. Lift the race, betting, loan and sabotage logic to pseudo-BASIC, then
   write the spec.
