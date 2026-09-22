# Gameplay / Reference Oracle Notes

## Running the original under Wine

`qrace.exe` is a 16-bit Windows 3.0 NE executable. Modern Wine (tested:
11.17, Arch `extra/wine` package) no longer supports a pure `WINEARCH=win32`
prefix (`wine: WINEARCH is set to 'win32' but this is not supported in wow64
mode`) — recent Wine builds are wow64-only. That's not actually a blocker
though: wow64 Wine ships its own internal 16-bit compatibility shim at
`C:\windows\syswow64\winevdm.exe` and transparently launches 16-bit NE
binaries through it. No `WINEARCH` override and no extra AUR package
(`winevdm`/`otvdm`) needed — a plain default Wine prefix is enough:

```sh
WINEPREFIX=~/qrace/.winedefault wine original/qrace.exe
```

Confirmed so far: the process launches and stays running without crashing
or logging any error beyond benign `fixme:keyboard` warnings (unmapped X11
keyboard layout variant — harmless). `ps aux` shows it hosted under
`syswow64\winevdm.exe` as expected.

**Confirmed working**, headless, via Xvfb — no real monitor needed at all:

```sh
Xvfb :99 -screen 0 1024x768x24 &
cd original && DISPLAY=:99 WINEPREFIX=~/qrace/.winedefault wine qrace.exe &
DISPLAY=:99 magick import -window root screen.png   # or any X11 screenshot tool
```

Important gotcha: **must `cd` into `original/` first** — the game loads
`qnames.txt`/`help.txt` via relative paths, so running it from elsewhere
throws its own "File not found" dialog (which, incidentally, is itself
useful confirmation the VB3 runtime is working correctly — it's a real,
period-correct rendered VB error box, not a Wine-level failure).

Once launched correctly, the title screen renders perfectly: "Quibbles v1.5
by Blackeye Software", the animated quibble sprite over a brown/orange
horizontal-striped track background (confirms the 750×75 RT_RCDATA-embedded
bitmap found during Phase 2 *is* that track texture, not a sprite strip as
first guessed), and START / OPTIONS / HELP buttons. Phase 1 goal (playable
reference oracle) is met.

## Driving it for Phase 6 (automated oracle)

Same Xvfb display, plus `xdotool` (not yet installed — `pacman -S xdotool`)
to script clicks/keystrokes through a fixed playthrough. Combined with the
control name → index mapping in `docs/resource-format-notes.md` (once
decoded further) this should let fixture capture read values more directly
than screenshot/OCR where possible.
