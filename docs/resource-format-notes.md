# qrace.exe resources

General format: `vb3-decompiler/RESOURCE_FORMAT.md`. Regenerate with
`vb3-decompiler/tools/parse_form_headers.py original/qrace.exe`.

## Resource table

- `RT_GROUP_ICON` 1, `RT_ICON` 1: app icon.
- `RT_RCDATA` 1: project directory (`QRACE`, `QUIBBLES`, 16 `.FRM` files).
- `RT_RCDATA` 2 (5,632 B): unidentified. No magic, strings or bitmaps.
- `RT_RCDATA` 4–35: 16 forms as (data blob, name table) pairs.

## Forms

Code segment = 4 + form index (`docs/pcode-notes.md`).

| # | form | code seg | caption | controls | blob/name ids |
|---|---|---|---|---|---|
| 0 | `frmTitle` | 4 | Quibbles v1.0 | 9 | 4/5 |
| 1 | `frmMain` | 5 | Quibbles v1.0 | 16 | 6/7 |
| 2 | `frmMenu` | 6 | Menu Screen | 25 | 8/9 |
| 3 | `frmAvailable` | 7 | Sponsor a Quibble | 7 | 10/11 |
| 4 | `frmInfo` | 8 | Information | 6 | 12/13 |
| 5 | `frmOptions` | 9 | Options | 19 | 14/15 |
| 6 | `frmPlayer` | 10 | Player Setup | 7 | 16/17 |
| 7 | `frmRetire` | 11 | Retire | 3 | 18/19 |
| 8 | `frmSpecial` | 12 | Special | 0 | 20/21 |
| 9 | `frmSponsor` | 13 | Sponsoring | 3 | 22/23 |
| 10 | `frmStatus` | 14 | Currently Sponsored Quibbles | 5 | 24/25 |
| 11 | `frmTarget` | 15 | Select your target | 2 | 26/27 |
| 12 | `frmUpdate` | 16 | Updates | 4 | 28/29 |
| 13 | `frmUpdate2` | 17 | Updates | 5 | 30/31 |
| 14 | `frmWinners` | 18 | Game Over | 5 | 32/33 |
| 15 | `frmLoan` | 19 | Loan Shark | 9 | 34/35 |

## Pictures

Extracted with `vb3-decompiler/tools/extract_bitmaps.py` (24-bit BMPs):
- 75×75: quibble sprite, 8 animation frames.
- 750×75: track background texture.
- Per-form portrait images.

## Next steps

- Decode control layout in the blobs: positions and sizes for the port.
- Identify `RT_RCDATA` 2.
