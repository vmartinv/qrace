# Reference oracle (original under Wine)

Stock wow64 Wine runs `qrace.exe` via its built-in `syswow64\winevdm.exe`.
No `WINEARCH=win32` or AUR packages are needed. Headless:

```sh
Xvfb :99 -screen 0 1024x768x24 &
cd original && DISPLAY=:99 WINEPREFIX=~/qrace/.winedefault wine qrace.exe &
DISPLAY=:99 magick import -window root screen.png
```

- Run from `original/`: the game loads `qnames.txt`/`help.txt` by
  relative path.
- The title screen shows "Quibbles v1.5 by Blackeye Software", an animated
  quibble over the 750×75 track texture, and START / OPTIONS / HELP.

## Next steps

- Phase 6: script playthroughs with `xdotool` (not installed yet) on the
  same display, and capture numeric outputs for diffing against the port.
