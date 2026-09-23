# qrace.exe p-code

General format and tooling: `vb3-decompiler/OPCODES.md`. Full listing:

```sh
python3 ../vb3-decompiler/tools/pcode_disasm.py original/qrace.exe \
    --runtime original/VBRUN300.DLL --out extraction/pcode/qrace.lst
```

(`extraction/pcode/` is gitignored.)

## Layout

19 segments: 1 stub, 2 data, 3 procedure table (101 records), 4–19 code.
All 101 procedures decode exactly to their end offsets (9,537
instructions).

| seg | form | procs | content (from strings) |
|---|---|---|---|
| 4 | frmTitle | 6 | startup, loads `qnames.txt`, opens `help.txt` |
| 5 | frmMain | 19 | race sequence (`On your mark...`, `Go!`, `Winner!`) |
| 6 | frmMenu | 22 | main menu, quibble stats (`Win %`, `Races`, `Price`) — 11.7 KB |
| 7 | frmAvailable | 5 | buy/sponsor quibble |
| 8 | frmInfo | 3 | info broker (bets, inside info) |
| 9 | frmOptions | 5 | game setup (`Goal`, `Rounds`, defaults 1000/12) |
| 10 | frmPlayer | 5 | player setup |
| 11 | frmRetire | 2 | retire quibble |
| 12 | frmSpecial | 10 | sabotage purchase (`bribe`, `cripple`) |
| 13 | frmSponsor | 4 | sponsoring |
| 14 | frmStatus | 4 | sponsored quibbles list |
| 15 | frmTarget | 3 | sabotage target (`steroids`, `weights`, `poison`, `train`) |
| 16 | frmUpdate | 4 | sabotage outcome messages |
| 17 | frmUpdate2 | 3 | payouts, sponsor bonus ($100), retirement |
| 18 | frmWinners | 3 | end of game |
| 19 | frmLoan | 3 | loan shark |

## Next steps

1. Name the remaining handlers and builtins (`vb3-decompiler`), with
   priority on those used in segments 5, 6, 8, 12, 17 and 19 (race,
   money, loans).
2. Map procedure records to event names (control index + event).
3. Lift to pseudo-BASIC, then write `docs/game-spec.md`.
