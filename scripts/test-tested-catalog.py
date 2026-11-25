"""Catalog integrity and synthetic generator regression tests (not slicer evidence)."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import tested


class CatalogTests(unittest.TestCase):
    def test_public_catalog(self):
        doc = json.loads((tested.PROFILES / "tested.json").read_text())
        index = json.loads((tested.PROFILES / "index.json").read_text())
        rows = doc["printers"]
        self.assertEqual(set(rows), {p["id"] for p in index})
        dictionaries = [json.loads(Path(f"client/src/lib/{lang}.json").read_text()) for lang in ("es", "de", "fr")]
        for row in rows.values():
            outputs = row.get("outputs", {row["slicer"]: row}).values()
            self.assertEqual(row["ok"], all(o["ok"] for o in outputs))
            for key in ("passed", "tests"):
                self.assertEqual(row[key], sum(o[key] for o in outputs))
            for o in outputs:
                self.assertGreater(o["tests"], 0)
                self.assertEqual(o["ok"], o["passed"] == o["tests"])
                if "note" in o:
                    for d in dictionaries:
                        self.assertIn(o["note"], d)
        # Regression expectations for this particular published snapshot, not
        # thresholds to apply to a future full matrix.
        if doc["date"] == "2026-11-24":
            self.assertEqual(set(k for k, v in rows.items() if not v["ok"]), set(tested.RETEST_NOTES))
            self.assertEqual((sum(v["passed"] for v in rows.values()), sum(v["tests"] for v in rows.values())), (997, 1002))
            self.assertEqual((len(rows), sum(v["ok"] for v in rows.values())), (237, 234))
            for pid, expected in [("voron-0-1", (1, 3)), ("prusa-core-one-mmu3", (11, 13)), ("wondermaker-zr", (2, 3))]:
                self.assertEqual((rows[pid]["passed"], rows[pid]["tests"]), expected)
            outs = rows["prusa-core-one-mmu3"]["outputs"]
            self.assertEqual([outs["PrusaSlicer"][k] for k in ("ok", "passed", "tests")], [False, 8, 10])
            self.assertEqual(outs["OrcaSlicer"], {"ok": True, "passed": 3, "tests": 3})
            self.assertNotIn("bed", outs["PrusaSlicer"]["note"])
            for d in dictionaries:
                for key in (doc["baselineNote"], doc["samples"][0], "Partial pass"):
                    self.assertIn(key, d)

    def test_clean_future_run_or_no_write(self):
        # The synthetic index covers a dual-output model and both native nozzles.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            profiles = root / tested.PROFILES
            profiles.mkdir(parents=True)
            (profiles / "index.json").write_text(json.dumps([{"id": "p", "prusa": True, "nozzles": ["0.4", "0.6"]}]))
            public = profiles / "tested.json"
            logfile = root / "cases"
            args = ["2.6", "3.0", "2026-12-01", "3.0"]
            inputs = [f"{tag}__{pid} {sl} rc=0" for sl, pid in [("OrcaS", "p"), ("Prusa", "p"), ("Prusa", "p-n06")]
                      for tag in sorted(tested.STANDARD | ({"mw147", "mw237"} if sl == "Prusa" else set()))]
            logfile.write_text("\n".join(inputs))
            with patch.object(tested, "PROFILES", profiles):
                doc = tested.build(str(logfile), *args)
                self.assertNotIn("baselineNote", doc)
                self.assertEqual(doc["printers"]["p"]["passed"], 13)
                self.assertTrue(doc["printers"]["p"]["ok"])
            public.write_text("unchanged")
            for bad in [[], inputs[:-1], inputs + ["x1c__p OrcaS rc=-52"], inputs + ["arranged__p OrcaS rc=0"]]:
                logfile.write_text("\n".join(bad))
                result = subprocess.run([sys.executable, tested.__file__, str(logfile), *args], cwd=root, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(public.read_text(), "unchanged")

    def test_preserve_failures(self):
        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / "test.log"
            log.write_text("paint__test OrcaS rc=-52\npaint__test Prusa rc=-52 historical annotation; PrusaSlicer rc=139\n")
            results = tested.read_matrix(str(log))
            self.assertEqual(results[("test", "PrusaSlicer")]["x1c"], 139)
            self.assertEqual(results[("test", "OrcaSlicer")]["x1c"], -52)
            for sl in ("OrcaSlicer", "PrusaSlicer"):
                for tag in tested.STANDARD | ({"mw147", "mw237"} if sl == "PrusaSlicer" else set()):
                    results[("test", sl)].setdefault(tag, 0)
                row = tested.summarize("test", sl, results, ["test"], False)
                self.assertFalse(row["ok"])
                self.assertEqual(row["passed"], row["tests"] - 1)
                self.assertEqual("bed" in row.get("note", ""), sl == "OrcaSlicer")


if __name__ == "__main__":
    unittest.main()
