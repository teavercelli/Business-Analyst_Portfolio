"""Deterministic validation rules for the InvoiceFlow prototype."""

def validate(invoice, known_invoice_keys, purchase_orders):
    key = (invoice["supplier"], invoice["invoice_number"])
    issues = []
    if key in known_invoice_keys:
        issues.append(("Duplicate invoice", "Critical", "Hold payment and confirm whether this is a corrected copy."))
    if not invoice.get("purchase_order"):
        issues.append(("Missing PO", "Medium", "Route to the budget owner for exception approval."))
    po = purchase_orders.get(invoice.get("purchase_order"))
    if po and float(invoice["total"]) > float(po["total"]):
        issues.append(("Total mismatch", "High", "Ask Procurement to validate quantity and freight charges."))
    if po and int(invoice["received_quantity"]) > int(po["ordered_quantity"]):
        issues.append(("Quantity mismatch", "High", "Compare the invoice with the goods-received record."))
    if not invoice.get("vat") or float(invoice.get("confidence", 0)) < 0.8:
        issues.append(("Low extraction confidence", "Medium", "Review the source PDF before entering the invoice."))
    return issues
