# Partial destination-slicer results, November 25, 2026

None of the five originally failing combinations became a pass as saved. The alternatives below were separate functional tests: they change the layout or use another source project. Their G-code does not count toward the original catalog totals.

| Printer and destination | As saved | Separate functional result |
|---|---|---|
| Voron 0.1, OrcaSlicer 2.5.2 | Two sample layouts exceeded the bed boundary (−52); 1 of 3 samples passed. | Arranging the four objects allowed both projects to slice at original size on one plate. |
| Prusa CORE One MMU3 | 8 of 10 native PrusaSlicer tests passed; two native runs terminated abnormally. OrcaSlicer passed 3 of 3, for 11 of 13 overall. A layout warning does not establish the cause of a process failure. | Two full-size plates of four objects each produced G-code on both tested nozzle variants. A separately scaled layout also sliced; neither workaround changes the original result. |
| WonderMaker ZR, OrcaSlicer 2.5.2 | The mixed PLA/PETG sample triggered the stock temperature check (−62); 2 of 3 standard samples passed. | A separate four-color PLA project sliced. It is not a substitute pass for the mixed-material project. |

When arranging, keep clearance for the wipe tower, preview every plate, and retain the actual spool presets. These are software slice results, not physical print results. The original test corpus is not distributed with the site.
