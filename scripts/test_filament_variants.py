"""Regression: equal prices must not merge stock, labels, discounts or links."""
import unittest
from unittest.mock import patch

import collect_filament as collector


class VariantTest(unittest.TestCase):
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
