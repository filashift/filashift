# FilaShift

Move a 3MF print project to a different 3D printer, right in your browser.

Drop a project from Bambu Studio or an Orca-family slicer (OrcaSlicer, Creality Print, Orca-Flashforge, Snapmaker Orca, ElegooSlicer, Anycubic Slicer Next, QIDI Studio), pick the printer you own, and map the colours to its filament slots. FilaShift swaps in that printer's machine, process and filament profiles, keeps the designer's model, painting and print settings, and removes settings that are unsafe for the new machine. It works in every direction: Bambu to Flashforge, Snapmaker, Creality or Prusa, and back again.

Live site: https://filashift.com

## Privacy

All conversion happens in the browser tab. Project files are never uploaded; the server only delivers the static site and the printer profile JSON files.

## Supported printers

237 printers from 16 brands. Bambu Lab presets come from Bambu Studio, the native Prusa presets from PrusaSlicer, the WonderMaker ZR Ultra presets from [Wonderprint-Orca 2.3.2](https://github.com/Wondermaker/Wonderprint-Orca/releases/tag/V2.3.2-Pre), and the remaining presets from OrcaSlicer. Bambu projects target Bambu Studio 2.9.1 or newer; Prusa projects default to PrusaSlicer 2.9 or newer. Use OrcaSlicer 2.5.2 for the ZR Ultra with four 0.4 mm nozzles. A vendor-supplied preset is not evidence that the vendor's slicer or physical printer has passed.

## How it was tested

`scripts/matrix.ts` converts source projects to a list of target printers, and `scripts/slice-matrix.sh` slices every result with the destination slicer's command-line interface (OrcaSlicer 2.5.2, Bambu Studio 2.9.2, PrusaSlicer 2.9.4) and reads the settings back from the G-code. `scripts/roundtrip.ts` converts a project through a chain of printers and checks the painted colours come back unchanged. The latest run (2026-11-24) sliced 678 of 678 OrcaSlicer and Bambu Studio conversions (three sample projects from Bambu Studio, OrcaSlicer and PrusaSlicer to all 226 of those printers) and 313 of 315 PrusaSlicer conversions (the three samples plus two painted MakerWorld projects to all 63 Prusa printer and nozzle variants; the other two are a MakerWorld model larger than the CORE One MMU3 bed, which the converter flags with a scale suggestion). All 234 printers are slicer-tested.

## Known limits

The separate 2026-11-25 ZR Ultra check sliced five converted projects in OrcaSlicer 2.5.2. The painted MakerWorld project, painted X1 Carbon project and AD5X project each extruded on four tools. The PrusaSlicer fixture and FS nameplate each extruded on two. No physical print was performed. Direct Wonderprint-Orca compatibility is not claimed. See `scripts/check-wondermaker.py` and the WonderMaker section of `OPERATIONS.md`.

- Always open the converted file in the destination slicer, check the preview and slice it yourself before printing.
- OrcaSlicer blocks mixing filaments with incompatible temperatures (for example PLA and PETG) on single-nozzle printers; FilaShift warns about this.
- Models larger than the destination bed must be scaled or split; FilaShift warns with a suggested scale.
- PrusaSlicer projects can be opened and exported (PrusaSlicer 2.4+ in, 2.9 projects out). PrusaSlicer output uses PrusaSlicer's presets for temperatures and speeds; variable layer height and layer-range modifiers are not carried over.

## Development

```bash
npm install
npm run dev          # local dev server
npm run build        # static site in dist/public
npx tsc --noEmit -p . # type check
```

Set `VITE_SOURCE_URL` when building to show the "Source code" link in the footer:

```bash
VITE_SOURCE_URL=https://github.com/OWNER/filashift npm run build
```

Printer profiles are regenerated with `scripts/build_profiles.py` from OrcaSlicer and Bambu Studio profile folders. Hosting instructions for a small Linux server with Caddy are in [`deploy/`](deploy/README.md).

## License

FilaShift is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. See [LICENSE](LICENSE).

The bundled profiles and option tables in `client/public/profiles/` derive from OrcaSlicer, Bambu Studio and PrusaSlicer. See [NOTICE.md](NOTICE.md) for upstream credits and licenses.

Copyright © 2026 Jackson Technology Solutions LLC, a subsidiary of Jackson Consolidated Group of Companies LLC.

FilaShift is not affiliated with Bambu Lab, Snapmaker, Flashforge, Creality, Prusa or MakerWorld.
