"""Fictional order-to-payment dataset for the 'From Order to Payment' BA case.

Everything here is invented. One set of invoices is run through two scenarios:
  as_is : manual matching, email approvals, due dates tracked in a spreadsheet
  to_be : rule-based three-way match, approval SLA with reminders, payment calendar
All scenario assumptions are listed in ASSUMPTIONS and on the case-study page.
Run: python3 generate_dataset.py   (fixed seed -> same output every time)
"""
import csv, json, random
from datetime import date, timedelta
from pathlib import Path

SEED = 2025
OUT = Path(__file__).parent
YEAR_START, YEAR_END = date(2025, 1, 1), date(2025, 12, 31)
rng = random.Random(SEED)
dup_rng = random.Random(SEED + 1)  # separate stream so duplicate handling does not shift other draws

# category: (n suppliers, invoices per supplier per month, amount range EUR, perishable, terms days)
CATEGORIES = {
    "Fresh meat":   (5, 6.0, (3000, 18000), True, 30),
    "Livestock":    (5, 3.0, (8000, 40000), False, 60),
    "Feed":         (4, 3.0, (2000, 12000), False, 60),
    "Packaging":    (4, 2.5, (500, 6000), False, 60),
    "Logistics":    (4, 4.0, (800, 7000), False, 60),
    "Services":     (3, 2.0, (300, 4000), False, 60),
}
NAMES = {
    "Fresh meat": ["Carni Alte Langhe", "Macello Valtanaro", "Bovini del Pianalto", "Carni Roera", "Filiera Monviso Carni"],
    "Livestock":  ["Allevamento Cascina Brina", "Stalla Prato Lungo", "Allevamenti Rio Freddo", "Cascina Tre Pioppi", "Allevamento Borgo Sereno"],
    "Feed":       ["Mangimi Pianura Verde", "Agrofeed Tanaro", "Mangimificio Colle Basso", "Nutrizione Zootecnica Nord"],
    "Packaging":  ["Imballi Sud Ovest", "PackPlast Novara", "Cartotecnica Valmora", "Film Alimentari Riva"],
    "Logistics":  ["Trasporti Frigo Langa", "Logistica Freddo Est", "Autotrasporti Ponte Nero", "Frigoline Express"],
    "Services":   ["Studio Qualità Alimenti", "Manutenzioni Frigo Tecno", "Lab Analisi Valdora"],
}
# Exception mix on the underlying invoices (same in both scenarios)
EXCEPTIONS = [("none", 0.70), ("quantity_difference", 0.12), ("price_mismatch", 0.08),
              ("missing_po", 0.07), ("duplicate", 0.03)]
APPROVAL_THRESHOLD = 5000

ASSUMPTIONS = {
    "as_is": {
        "matching": "30% of clean invoices matched the same day by the ERP (structured XML and price list on file); the rest by hand, 1-4 working days after receipt",
        "exception_resolution": "email back-and-forth, 4-15 days",
        "approval_wait": "no reminder; 40% approved in 1-3 working days, the rest in 4-14 (above threshold +2)",
        "payment": "weekly run on Fridays; 12% of invoices missed in the spreadsheet for one extra week",
        "duplicates": "50% caught before payment",
    },
    "to_be": {
        "matching": "automatic, same day for invoices with no exception",
        "exception_resolution": "exception queue with owner, 1-5 working days; 10% are real disputes with the supplier, 10-25 days",
        "approval_wait": "SLA 3 working days with reminder; 85% within 0-3 days, 15% late at 4-9 days",
        "payment": "weekly payment proposal; each invoice paid in the last Friday run on or before its due date",
        "duplicates": "90% caught by the supplier + invoice-number rule (re-numbered duplicates can still slip through)",
    },
}

def pick_exception():
    r, acc = rng.random(), 0
    for name, p in EXCEPTIONS:
        acc += p
        if r < acc:
            return name
    return "none"

def add_workdays(d, n):
    while n > 0:
        d += timedelta(days=1)
        if d.weekday() < 5:
            n -= 1
    return d

def next_friday(d):
    return d + timedelta(days=(4 - d.weekday()) % 7)

def last_friday_on_or_before(d):
    return d - timedelta(days=(d.weekday() - 4) % 7)

# --- suppliers ---
suppliers = []
for cat, (n, _, _, perish, terms) in CATEGORIES.items():
    for i in range(n):
        suppliers.append({"supplier_id": f"S{len(suppliers)+1:02d}", "supplier_name": NAMES[cat][i],
                          "category": cat, "perishable": perish, "payment_terms_days": terms})

# --- underlying invoices ---
invoices = []
for s in suppliers:
    n_suppliers, per_month, (lo, hi), _, _ = CATEGORIES[s["category"]]
    d = YEAR_START
    while d <= YEAR_END:
        if d.weekday() < 5 and rng.random() < per_month / 21.7:  # ~per_month invoices per ~21.7 working days
            if True:
                inv_date = d
                received = add_workdays(inv_date, rng.choice([0, 0, 1, 1, 2, 3]))
                invoices.append({
                    "invoice_id": f"INV-{len(invoices)+1:05d}",
                    "supplier_id": s["supplier_id"], "supplier_name": s["supplier_name"],
                    "category": s["category"], "perishable": s["perishable"],
                    "amount_eur": round(rng.uniform(lo, hi), 2),
                    "invoice_date": inv_date, "received_date": received,
                    "due_date": inv_date + timedelta(days=s["payment_terms_days"]),
                    "channel": "PDF" if rng.random() < 0.15 else "XML (SDI)",
                    "exception": pick_exception(),
                })
        d += timedelta(days=1)
invoices.sort(key=lambda x: x["invoice_date"])

def run(inv, scenario):
    exc = inv["exception"]
    big = inv["amount_eur"] > APPROVAL_THRESHOLD
    rec = inv["received_date"]
    if scenario == "as_is":
        auto = exc == "none" and rng.random() < 0.30
        matched = rec if auto else add_workdays(rec, rng.randint(1, 4))
        if exc == "duplicate" and dup_rng.random() < 0.5:
            return dict(matched_date=matched, approved_date=None, paid_date=None, outcome="duplicate_blocked", auto_matched=False)
        if exc not in ("none", "duplicate"):
            matched = matched + timedelta(days=rng.randint(4, 15))
        wait = rng.randint(1, 3) if rng.random() < 0.40 else rng.randint(4, 14)
        approved = add_workdays(matched, wait + (2 if big else 0))
        paid = next_friday(approved + timedelta(days=1))
        if rng.random() < 0.12:
            paid += timedelta(days=7)
        outcome = "duplicate_paid" if exc == "duplicate" else "paid"
        return dict(matched_date=matched, approved_date=approved, paid_date=paid, outcome=outcome, auto_matched=auto)
    # to_be
    if exc == "duplicate" and dup_rng.random() < 0.9:
        return dict(matched_date=rec, approved_date=None, paid_date=None, outcome="duplicate_blocked", auto_matched=False)
    if exc in ("none", "duplicate"):
        matched = rec
    elif rng.random() < 0.10:
        matched = rec + timedelta(days=rng.randint(10, 25))
    else:
        matched = add_workdays(rec, rng.randint(1, 5))
    approved = add_workdays(matched, rng.randint(0, 3) if rng.random() < 0.85 else rng.randint(4, 9))
    run_day = last_friday_on_or_before(inv["due_date"])
    paid = run_day if run_day > approved else next_friday(approved + timedelta(days=1))
    outcome = "duplicate_paid" if exc == "duplicate" else "paid"
    return dict(matched_date=matched, approved_date=approved, paid_date=paid, outcome=outcome, auto_matched=(exc in ("none", "duplicate")))

rows = []
for inv in invoices:
    for sc in ("as_is", "to_be"):
        r = run(inv, sc)
        paid = r["paid_date"]
        rows.append({
            "scenario": sc, **{k: inv[k] for k in ("invoice_id", "supplier_id", "supplier_name", "category", "perishable", "channel", "amount_eur", "exception")},
            "invoice_date": inv["invoice_date"].isoformat(), "received_date": inv["received_date"].isoformat(),
            "due_date": inv["due_date"].isoformat(),
            "matched_date": r["matched_date"].isoformat(),
            "approved_date": r["approved_date"].isoformat() if r["approved_date"] else "",
            "paid_date": paid.isoformat() if paid else "",
            "auto_matched": r["auto_matched"],
            "outcome": r["outcome"],
            "cycle_days": (r["approved_date"] - inv["received_date"]).days if r["approved_date"] else "",
            "days_to_pay": (paid - inv["invoice_date"]).days if paid else "",
            "paid_on_time": (paid <= inv["due_date"]) if paid else "",
        })

# --- write files ---
with open(OUT / "suppliers.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(suppliers[0])); w.writeheader(); w.writerows(suppliers)
with open(OUT / "invoices_scenarios.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)

# --- KPI summary (same formulas as the analysis, section 9) ---
def median(xs):
    xs = sorted(xs); n = len(xs)
    return (xs[n//2] if n % 2 else (xs[n//2-1] + xs[n//2]) / 2) if n else None

summary = {"seed": SEED, "invoices": len(invoices), "suppliers": len(suppliers),
           "total_amount_eur": round(sum(i["amount_eur"] for i in invoices), 2),
           "assumptions": ASSUMPTIONS, "kpis": {}}
for sc in ("as_is", "to_be"):
    R = [r for r in rows if r["scenario"] == sc]
    paid = [r for r in R if r["paid_date"]]
    per = [r for r in paid if r["perishable"]]
    real_paid = [r for r in paid if r["outcome"] == "paid"]
    summary["kpis"][sc] = {
        "median_cycle_days": median([r["cycle_days"] for r in R if r["cycle_days"] != ""]),
        "on_time_payment_rate": round(sum(r["paid_on_time"] for r in real_paid) / len(real_paid), 3),
        "perishable_paid_within_30d": round(sum(r["days_to_pay"] <= 30 for r in per) / len(per), 3),
        "approved_within_5_days": round(sum(r["cycle_days"] <= 5 for r in R if r["cycle_days"] != "") / len([r for r in R if r["cycle_days"] != ""]), 3),
        "first_time_match_rate": round(sum(r["auto_matched"] for r in R) / len(R), 3),
        "duplicates_paid": sum(r["outcome"] == "duplicate_paid" for r in R),
        "duplicates_paid_eur": round(sum(r["amount_eur"] for r in R if r["outcome"] == "duplicate_paid"), 2),
        "late_payments_eur": round(sum(r["amount_eur"] for r in real_paid if not r["paid_on_time"]), 2),
    }
summary["exception_mix"] = {e: sum(i["exception"] == e for i in invoices) for e, _ in EXCEPTIONS}
(OUT / "kpi_summary.json").write_text(json.dumps(summary, indent=2))
print(json.dumps({k: v for k, v in summary.items() if k != "assumptions"}, indent=2))
