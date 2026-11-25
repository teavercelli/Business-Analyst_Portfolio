# Global Superstore dashboard

Static HTML, CSS and JavaScript dashboard for the Global Superstore case study in this portfolio.

## Files

| File | Purpose |
|---|---|
| `index.html`, `app.js` | The dashboard. Styles come from the shared `assets/app.css`. |
| `data/orders_clean.csv` | Cleaned Global Superstore order lines (public training dataset, 51,290 rows, 2011–2014). |
| `build_summary.py` | Aggregates the CSV into `data/summary.json` by year, market, category, sub-category and discount level. |
| `data/summary.json` | The compact file the dashboard loads (about 50 KB instead of 12 MB). |
| `global_superstore_analysis.sql` | SQL data checks and analysis queries. The dashboard does not run SQL. |

## Discount levels

No discount, under 20%, 20–29%, 30–49%, 50% or more. The same levels are used in the case study.

## Rebuild the data and run locally

```bash
python3 build_summary.py
python3 -m http.server 8000   # from the repository root, then open /projects/global-superstore/dashboard/
```
