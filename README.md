# Quibble Race — Decompilation & Port

An effort to reverse-engineer and faithfully port **Quibble Race v1.5**
(1998-ish freeware by Blackeye Software / Derek Yu) to a modern, standalone
build (TypeScript + Phaser 3). This is the original Visual Basic 3.0 release
— it predates the 2004 Newgrounds Flash version and the 2020 UFO 50 remake,
and as far as we've found, nobody has published a decompile or port of this
specific version before.

Full roadmap: [`CLAUDE.md`](./CLAUDE.md).

The general VB3 executable format tooling this relies on (NE resource
parsing, p-code opcode decoding) lives in a separate, reusable companion
repo: [`vb3-decompiler`](https://github.com/vmartinv/vb3-decompiler) —
clone it alongside this repo to regenerate anything referenced in `docs/`.

## Credits

Quibble Race was created by Derek Yu / Blackeye Software. This project is an
unofficial, non-commercial reverse-engineering effort for preservation and
learning purposes. It is not affiliated with or endorsed by Derek Yu,
Blackeye Software, or Mossmouth.

## No original binaries included

This repository contains **no copyrighted material from the original game**
— no `.exe`, no runtime DLLs, no extracted sprites/sounds. Freeware
distribution rights don't extend to redistributing those files or derived
binary assets in a source repo, so:

- The recovered game **logic/rules** (from p-code disassembly) and **data**
  (odds, prices, stats) are documented in `docs/` as our own written
  description of recovered facts.
- The shipped port's art is **re-authored**, not extracted, even though the
  original may be used locally as a reference during development.
- To run the local extraction tooling yourself, place your own legally
  obtained copy of `qrace.exe` (and `VBRUN300.DLL`) in `original/` — that
  directory is gitignored and never committed.

## License

This project's own code/tooling/docs are MIT licensed — see
[`LICENSE.md`](./LICENSE.md). That license does not extend to the original
game itself, which isn't included here (see above).

## Layout

- `original/` — (gitignored) your local copy of the original game files.
- `extraction/` — output of `vb3-decompiler`'s tooling run against
  `original/qrace.exe`. `strings/` is committed (recovered text);
  `resources/`, `forms/`, `pcode/` are gitignored (raw binary-derived data).
- `docs/` — recovered design spec, gameplay notes, resource-format notes.
- `port/` — the TypeScript + Phaser 3 + Vite port.
