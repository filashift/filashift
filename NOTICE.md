# Third-party notices

FilaShift is copyright © 2026 Jackson Technology Solutions LLC, a subsidiary of Jackson Consolidated Group of Companies LLC, and licensed under the GNU Affero General Public License v3.0 or later.

It includes or derives from the following works:

| Project | Used for | License |
|---|---|---|
| [OrcaSlicer](https://github.com/SoftFever/OrcaSlicer) (v2.5.2) | Machine, process and filament profiles for non-Bambu printers; project file format behaviour | AGPL-3.0 |
| [Bambu Studio](https://github.com/bambulab/BambuStudio) (v2.9.1) | Machine, process and filament profiles for Bambu Lab printers; project file format behaviour | AGPL-3.0 |
| [PrusaSlicer](https://github.com/prusa3d/PrusaSlicer) (2.9 series) | Prusa Research printer, print and filament presets and PrusaSlicer option tables used for native Prusa output | [AGPL-3.0](https://raw.githubusercontent.com/prusa3d/PrusaSlicer/version_2.9.4/LICENSE) |
| [3MF-to-AD5X](https://github.com/iChristGit/3MF-to-AD5X) | Reference for the conversion approach | MIT |

The profile generators are `scripts/build_profiles.py` and `scripts/build_prusa_profiles.py`. The latter documents the Prusa Research preset bundle and PrusaSlicer option-table inputs for `client/public/profiles/prusa/`. Printer and brand names are trademarks of their respective owners and are used only to identify compatible hardware.

Open-source JavaScript libraries used by the web app (React, Vite, Tailwind CSS, Radix UI, fflate and others) are listed in `package.json` with their own licenses.

## Fonts

- JetBrains Mono, SIL Open Font License 1.1 (client/public/fonts/JetBrainsMono-OFL.txt).
- Body text uses the visitor's system sans-serif. No proprietary body-font files are included in this version.

## Jackson Technology Solutions emblem
`client/public/jts-emblem-*.webp` is the logo of Jackson Technology Solutions LLC. It is a trademark of its owner and is not licensed under the AGPL-3.0; forks must remove or replace it.
