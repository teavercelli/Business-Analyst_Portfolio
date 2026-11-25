"""Aggregate orders_clean.csv into the compact summary.json the dashboard loads.

Grain: year x market x category x sub-category x discount band.
Run from this folder:  python3 build_summary.py
"""
import csv, json
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
BANDS = ["0%", "1-19%", "20-29%", "30-49%", "50%+"]

def band(d):
    if d == 0: return 0
    if d < 0.2: return 1
    if d < 0.3: return 2
    if d < 0.5: return 3
    return 4

agg = defaultdict(lambda: [0.0, 0.0, 0, 0.0])  # sales, profit, lines, discounted sales value
dims = {"market": set(), "category": set(), "sub": {}}
with open(HERE / "data" / "orders_clean.csv", newline="", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        y = int(r["Order Date"][:4]); m = r["Market"]; c = r["Category"]; s = r["Sub-Category"]
        b = band(float(r["Discount"]))
        a = agg[(y, m, c, s, b)]
        a[0] += float(r["Sales"]); a[1] += float(r["Profit"]); a[2] += 1
        dims["market"].add(m); dims["category"].add(c); dims["sub"][s] = c

markets = sorted(dims["market"]); cats = sorted(dims["category"]); subs = sorted(dims["sub"])
rows = [[y, markets.index(m), cats.index(c), subs.index(s), b, round(v[0], 4), round(v[1], 4), v[2]]
        for (y, m, c, s, b), v in sorted(agg.items())]
out = {"source": "Global Superstore (public training dataset), orders 2011-2014",
       "bands": BANDS, "markets": markets, "categories": cats, "subcategories": subs,
       "subCategoryOf": [cats.index(dims["sub"][s]) for s in subs],
       "fields": ["year", "market", "category", "sub", "band", "sales", "profit", "lines"],
       "rows": rows}
(HERE / "data" / "summary.json").write_text(json.dumps(out, separators=(",", ":")))
S = sum(r[5] for r in rows); P = sum(r[6] for r in rows)
print(len(rows), "rows; sales", round(S, 2), "profit", round(P, 2), "margin", round(P / S * 100, 2))
for i, b in enumerate(BANDS):
    s = sum(r[5] for r in rows if r[4] == i); p = sum(r[6] for r in rows if r[4] == i)
    print(b, round(s), round(p), round(p / s * 100, 1))
deep = sum(r[6] for r in rows if r[4] >= 3); print("30%+ profit", round(deep), round(-deep / P * 100, 1), "% of total profit")
t = sum(r[6] for r in rows if subs[r[3]] == "Tables"); print("Tables", round(t, 2))
