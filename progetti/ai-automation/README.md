# InvoiceFlow — Invoice Validation Workflow

InvoiceFlow is a local-first operations prototype for invoice intake and exception management. It shows how a business process can read invoice PDFs, extract key fields, validate completeness and route each document either to an approval report or to a manual-review report.

The project uses fictional invoices and is designed for portfolio demonstration only. It does not make payments or connect to a real accounting system.

## Business problem

Accounts Payable teams often receive invoices in different formats. A first control layer should identify the invoice number, supplier, purchase order, total and VAT before an invoice reaches the next approval step.

## Workflow

```text
Invoice PDF
   ↓
Read file from inbox
   ↓
Extract text from PDF
   ↓
Parse invoice fields
   ↓
Validate required fields
   ├── Complete → approval report
   └── Incomplete → review report
```

The n8n workflow is stored in `n8n-workflow.json`. The local folders used by the workflow are:

- `data/inbox/` — input invoice PDFs;
- `data/processed/` — invoices ready for validation and the approval report;
- `data/review/` — invoices requiring human review and the review report.

## Validation rules

An invoice is considered ready for validation only when these fields are present:

- invoice number;
- supplier;
- purchase order;
- total amount due;
- VAT.

If one or more fields are missing or cannot be extracted, the invoice is routed to `review` with a list of missing fields. Human review remains mandatory before any financial action.

## Run the browser prototype

From this directory:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` to view the local interface.

## Run the n8n workflow locally

From this directory, restrict file access to the project data folder:

```bash
N8N_RESTRICT_FILE_ACCESS_TO="$(pwd)/data" npx n8n start
```

Open `http://localhost:5678/`, import or open the workflow, and execute it manually. The workflow writes JSON reports to `data/processed/` and `data/review/`.

No paid API is required for this prototype. The current design uses local file handling and deterministic validation rules; OCR, an on-premise language model or an accounting-system connector could be added as future extensions.

## Project structure

```text
ai-automation/
├── data/
│   ├── inbox/
│   ├── processed/
│   └── review/
├── database/schema.sql
├── python/
│   ├── business_rules.py
│   └── process_invoices.py
├── index.html
├── invoiceflow.css
├── invoiceflow.js
└── n8n-workflow.json
```

## Important limitation

Invoice layouts vary. The workflow is intentionally conservative: when a label or value cannot be identified reliably, it sends the invoice to manual review instead of inventing a value. This is the expected behaviour for an operations control workflow.
