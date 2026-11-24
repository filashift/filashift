# FilaShift

Move a 3MF print project to a different 3D printer, right in your browser.

Drop a project from Bambu Studio or an Orca-family slicer (OrcaSlicer, Creality Print, Orca-Flashforge, Snapmaker Orca, ElegooSlicer, Anycubic Slicer Next, QIDI Studio), pick the printer you own, and map the colours to its filament slots. FilaShift swaps in that printer's machine, process and filament profiles, keeps the designer's model, painting and print settings, and removes settings that are unsafe for the new machine. It works in every direction: Bambu to Flashforge, Snapmaker, Creality or Prusa, and back again.

Live site: https://filashift.com

## Privacy

All conversion happens in the browser tab. Project files are never uploaded; the server only delivers the static site and the printer profile JSON files.

## Supported printers

226 printers from 15 brands. Bambu Lab presets come from Bambu Studio's system profiles; all other brands come from OrcaSlicer's system profiles. Converted files target Bambu Studio 2.9.1 or newer for Bambu printers and OrcaSlicer 2.3.1 or newer for everything else.

## How it was tested

`scripts/matrix.ts` converts source projects to a list of target printers, and `scripts/slice-matrix.sh` slices every result with the destination slicer's command-line interface (OrcaSlicer 2.5.2, Bambu Studio 2.9.2) and reads the settings back from the G-code. `scripts/roundtrip.ts` converts a project through a chain of printers and checks the painted colours come back unchanged. The latest run (2026-11-24) sliced 678 of 678 conversions: three sample projects (Bambu Studio, OrcaSlicer, PrusaSlicer) to all 226 printers; all 226 printers are slicer-tested.

## Known limits

- Always open the converted file in the destination slicer, check the preview and slice it yourself before printing.
- OrcaSlicer blocks mixing filaments with incompatible temperatures (for example PLA and PETG) on single-nozzle printers; FilaShift warns about this.
- Models larger than the destination bed must be scaled or split; FilaShift warns with a suggested scale.
- PrusaSlicer project import is not supported yet.

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

The bundled printer, process and filament profiles in `client/public/profiles/` are derived from OrcaSlicer and Bambu Studio, both licensed under the AGPL-3.0. See [NOTICE.md](NOTICE.md) for third-party credits.

Copyright © 2026 Jackson Technology Solutions LLC, a subsidiary of Jackson Consolidated Group of Companies LLC.

FilaShift is not affiliated with Bambu Lab, Snapmaker, Flashforge, Creality, Prusa or MakerWorld.
