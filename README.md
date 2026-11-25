# FilaShift

Move a 3MF print project to a different 3D printer, right in your browser.

Drop a project from Bambu Studio or an Orca-family slicer (OrcaSlicer, Creality Print, Orca-Flashforge, Snapmaker Orca, ElegooSlicer, Anycubic Slicer Next, QIDI Studio), pick the printer you own, and map the colors to its filament slots. FilaShift swaps in that printer's machine, process and filament profiles, keeps the designer's model, painting and print settings, and removes settings that are unsafe for the new machine. It works in every direction: Bambu to Flashforge, Snapmaker, Creality or Prusa, and back again.

Live site: https://filashift.com

## Privacy

All conversion happens in the browser tab. Project files are never uploaded; the server only delivers the static site and the printer profile JSON files.

## Supported printers

237 printers from 16 brands. Bambu Lab presets come from Bambu Studio, the native Prusa presets from PrusaSlicer, the WonderMaker ZR Ultra presets from [Wonderprint-Orca 2.3.2](https://github.com/Wondermaker/Wonderprint-Orca/releases/tag/V2.3.2-Pre), and the remaining presets from OrcaSlicer. Bambu projects target Bambu Studio 2.9.1 or newer; Prusa projects default to PrusaSlicer 2.9 or newer. Use OrcaSlicer 2.5.2 for the ZR Ultra with four 0.4 mm nozzles. A vendor-supplied preset is not evidence that the vendor's slicer or physical printer has passed.

## How it was tested

`scripts/matrix.ts` converts source projects and `scripts/slice-matrix.sh` checks them with the destination slicer. The November 24, 2026 baseline recorded 676/678 passes in OrcaSlicer 2.5.2 and Bambu Studio 2.9.2 combined, and 313/315 in native PrusaSlicer 2.9.4. The OrcaSlicer and Bambu Studio baseline allowed mixed filament temperatures; do not take its passes as verification of stock temperature checks.

With the three WonderMaker profiles tested separately on November 25, **234 of 237 profiles passed every recorded test (997/1,002 slices)**. Voron 0.1 passed 1/3; Prusa CORE One MMU3 passed 8/10 native PrusaSlicer exports and 3/3 OrcaSlicer slices; base WonderMaker ZR passed 2/3. Targeted checks of alternative layouts and a separate all-PLA project do not replace the original failures. See [the catalog](client/public/profiles/tested.json) for the results and limitations. These are software tests, not physical prints.

## Known limits

The separate 2026-11-25 ZR Ultra check sliced five converted projects in OrcaSlicer 2.5.2. The painted MakerWorld project, painted X1 Carbon project and AD5X project each extruded on four tools. The PrusaSlicer fixture and FS nameplate each extruded on two. No physical print was performed. Direct Wonderprint-Orca compatibility is not claimed. See `scripts/check-wondermaker.py` and the WonderMaker section of `OPERATIONS.md`.

- Always open the converted file in the destination slicer, check the preview and slice it yourself before printing.
- OrcaSlicer blocks mixing filaments with incompatible temperatures (for example PLA and PETG) on single-nozzle printers; FilaShift warns about this.
- When a layout exceeds the destination bed, try rearranging separate objects or spreading them over multiple plates before resizing.
- PrusaSlicer projects can be opened and exported (PrusaSlicer 2.4+ in, 2.9 projects out). PrusaSlicer output uses PrusaSlicer's presets for temperatures and speeds; variable layer height and layer-range modifiers are not carried over.

## Development

Use US English for FilaShift's English interface, guides, conversion messages, and search metadata (for example, `color`, `gray`, and `millimeters`). Keep source-format keys such as `filament_colour`, vendor product names, and published URLs intact. After building and prerendering, run `node scripts/check-us-english.mjs` to check the English pages.

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
