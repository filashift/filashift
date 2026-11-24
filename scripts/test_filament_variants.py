"""Regression: equal prices must not merge stock, labels, discounts or links."""
import unittest
from unittest.mock import patch

import collect_filament as collector


class VariantTest(unittest.TestCase):
    def test_single_spool_excludes_refill_multi_and_unknown(self):
        def form(title, variant="Blue", kg=1, count=1, tags=()):
            return collector.packaging({"title":title,"tags":list(tags)},{"title":variant},kg,count)
        self.assertEqual(form("PLA filament", "Blue / cardboard spool"), "spool")
        self.assertEqual(form("PLA",tags=["Spool"]), "spool")
        for title in ["PLA Refill for reusable spool", "Spool-free PLA", "PLA without a spool"]:
            self.assertEqual(form(title), "refill")
        self.assertEqual(form("PLA",tags=["Spool","pack:refill"]), "refill")
        for title in ["PLA 4 x 250g spool", "PLA spool bundle", "PLA 4-pack spool"]:
            self.assertEqual(form(title), "pack")
        self.assertEqual(form("PLA spool", count=4), "pack")
        self.assertEqual(form("PLA filament 1 kg"), "unknown")
        self.assertNotEqual(form("PLA spool", kg=5),"spool")

    def test_flashforge_weight_needs_corroboration(self):
        p = dict(title="Flashforge PLA Filament", tags=["1kg", "Filament", "Spool"], options=[{"name":"Color"}])
        v = dict(title="Blue", sku="PLA-1-BL", grams=1100)
        self.assertTrue(collector.flashforge_single_spool(p, v))
        for changes in [{"sku":"PLA-05-BL"}, {"title":"2 pack Blue"}, {"sku":""}]:
            self.assertFalse(collector.flashforge_single_spool(p, dict(v, **changes)))
        for changes in [{"tags":["Spool"]}, {"tags":p["tags"]+["0.5kg"]}, {"options":[{"name":"Pack size"}]}]:
            self.assertFalse(collector.flashforge_single_spool(dict(p, **changes), v))

    def test_same_price_different_variants(self):
        variants = [
            {"id": 10, "title": "Blue / 1 kg", "option1": "Blue", "available": False, "compare_at_price": "30"},
            {"id": 11, "title": "Red / 1 kg", "option1": "Red", "available": True},
            {"id": 12, "title": "Green / 1 kg", "option1": "Green"},
            {"id": 13, "title": "Pink / 1 kg", "option1": "Pink", "available": "false"},
            {"id": None, "title": "White / 1 kg", "available": True},
        ]
        product = {"title": "PLA filament", "handle": "pla", "options": [{"name": "Colour"}],
                   "variants": [dict(v, price="20") for v in variants]}
        with patch.object(collector, "STORES", [("example.com", "Brand", "Shop", False)]), \
                patch.object(collector, "fetch_store", return_value=[product]):
            items, _ = collector.collect()
        by_id = {r["u"].split("=")[-1]: r for r in items}
        self.assertEqual(set(by_id), {"10", "11", "12", "13"})
        for variant, stock, colour, was in [("10", False, "Blue", 30), ("11", True, "Red", None),
                                             ("12", None, "Green", None), ("13", None, "Pink", None)]:
            r = by_id[variant]
            self.assertIs(r["ok"], stock)
            self.assertEqual((r["c"], r["was"]), ([colour], was))
            self.assertIn(colour, r["v"])


if __name__ == "__main__":
    unittest.main()
