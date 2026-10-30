# Global Superstore Web Dashboard

Portfolio-ready static dashboard built from the real `orders_clean.csv` dataset.

## Pages

- Executive Overview
- Profitability Diagnostics
- Discount Intelligence

## Run locally

Because browsers block local CSV fetches from `file://`, serve this folder with any static server:

```powershell
cd "C:\Users\Smartwork\Documents\ChatGPT\Portoflio tea\Global-Superstore-Web-Dashboard"
& "C:\Program Files\nodejs\npx.cmd" --yes serve .
```

Then open the local URL printed by the command.

## Publish

The folder is static HTML/CSS/JS and can be published on GitHub Pages, Netlify, Vercel or another static host without paid services. Keep `data/orders_clean.csv` alongside the site assets.

The app does not use hardcoded KPI values. It computes metrics and filtering from the dataset in the browser. Tables is handled as `Sub-Category === "Tables"`; no order count or product uniqueness assumptions are made.
