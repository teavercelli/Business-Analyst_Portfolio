"""Run the free local InvoiceFlow prototype against the sample CSV."""
from __future__ import annotations

import csv
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "invoices.csv"
DB_PATH = ROOT / "data" / "invoiceflow.db"


def read_invoices() -> list[dict[str, str]]:
    with CSV_PATH.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def classify(invoice: dict[str, str], seen: set[tuple[str, str]]) -> tuple[str, str, str]:
    key = (invoice["supplier"], invoice["invoice_number"])
    if key in seen:
        return "Duplicate invoice", "Critical", "Hold payment and confirm whether this is a corrected copy."
    if not invoice["purchase_order"]:
        return "Missing PO", "Medium", "Route to the budget owner for exception approval."
    if int(invoice["received_quantity"]) > int(invoice["ordered_quantity"]):
        return "Quantity mismatch", "High", "Compare the invoice with the goods-received record."
    if not invoice["vat"] or float(invoice["confidence"]) < 0.8:
        return "Low extraction confidence", "Medium", "Review the source PDF before entering the invoice."
    return "No exception", "Low", "Create draft payable record."


def main() -> None:
    invoices = read_invoices()
    connection = sqlite3.connect(DB_PATH)
    connection.execute("DROP TABLE IF EXISTS invoice_results")
    connection.execute("""CREATE TABLE invoice_results (
        invoice_id TEXT PRIMARY KEY, supplier TEXT, total REAL, issue TEXT,
        priority TEXT, status TEXT, suggested_action TEXT
    )""")
    seen: set[tuple[str, str]] = set()
    for invoice in invoices:
        issue, priority, action = classify(invoice, seen)
        status = "Approved" if issue == "No exception" else "Needs review"
        connection.execute("INSERT INTO invoice_results VALUES (?, ?, ?, ?, ?, ?, ?)", (
            invoice["invoice_id"], invoice["supplier"], float(invoice["total"]),
            issue, priority, status, action,
        ))
        seen.add((invoice["supplier"], invoice["invoice_number"]))
    connection.commit()
    reviewed = connection.execute("SELECT COUNT(*) FROM invoice_results WHERE status = 'Needs review'").fetchone()[0]
    print(f"Processed {len(invoices)} invoices: {reviewed} require human review.")
    for row in connection.execute("SELECT invoice_id, issue, priority FROM invoice_results ORDER BY invoice_id"):
        print(f"- {row[0]} | {row[1]} | {row[2]}")
    connection.close()


if __name__ == "__main__":
    main()
