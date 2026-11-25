# Project filament review: functional evidence

On November 25, 2026, development tested the maker-facing instructions with the base WonderMaker ZR, 0.4 mm nozzle, in stock OrcaSlicer 2.5.2. This is an optional correction when the physical spool and design really are PLA, not a change to the source model or the printer certification matrix.

| Case | Result |
|---|---|
| Unchanged `x1c_paint` conversion: PLA / PLA / PETG / PLA | The action names project filament 3 (PETG). Slicer `-62`; no G-code. |
| Local test copy of the same conversion, simulating selection of row 1’s full matching PLA preset for row 3 | The slicer exited 0 and exported 1,523,391 bytes of G-code with extrusion moves, four PLA entries and the original four colors. Only row 3’s preset settings changed; all non-settings archive members were identical. No temperature bypass. |
| Separate all-PLA `ad5x_project` conversion | No material-conflict action. |

The original mixed project remains a failed slice. A successful slice of the corrected copy neither establishes what material the designer intended nor verifies a physical print.

## Maker instructions

Open the converted project in OrcaSlicer. If the material preset is wrong, use **Prepare → Filament → numbered row → preset dropdown**, not the color square. Select the preset matching both the real spool and the design, save a copy, slice, and inspect Preview ([OrcaSlicer interface walkthrough](https://nozzlenotes.com/articles/software/orca-slicer-filaments-and-colour-changes)).

If the material was intentional, keep its preset and the temperature check. Review the designer’s notes and the support interface before substituting any material: PETG can be used intentionally as a support for a PLA part ([WonderMaker’s slicing guide](https://wondermaker3d.gitbook.io/wondermaker3d/printer-series/beginners-guide/tutorial-for-slicing-parameter-settings), [OrcaSlicer support material settings](https://www.orcaslicer.com/wiki/print_settings/support/support_settings_filament)).

## Reproduction

Run `scripts/matrix.ts` on local copies of the fixtures and `scripts/test-filament-review.ts` on the mixed conversion report. Create the deliberately changed local copy with `python3 scripts/test-zr-preset-copy.py mixed.3mf owner-pla-copy.3mf`. Slice each archive separately with `orca --slice 0 --outputdir FRESH_DIR FILE`. Run `node scripts/check-filament-review-ui.mjs x1c_paint.3mf ad5x_project.3mf` against a fresh Vite build to exercise the result panel. No source project or toolpath is distributed in this change.
