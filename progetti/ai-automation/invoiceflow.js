const invoices = [
  { id: 'INV-1048', supplier: 'Northstar Office Ltd', amount: '€2,480.00', issue: 'No exception', priority: 'Low', status: 'Approved', reason: 'Purchase order and receipt match. Safe to move forward.', action: 'Create draft payable record.' },
  { id: 'INV-1051', supplier: 'TransitWorks Srl', amount: '€8,940.00', issue: 'Quantity mismatch', priority: 'High', status: 'Needs review', reason: 'The invoice quantity is higher than the quantity recorded on the purchase order.', action: 'Ask Procurement to validate the quantity and goods-received record.' },
  { id: 'INV-1054', supplier: 'Brightline Components', amount: '€1,120.00', issue: 'Duplicate invoice', priority: 'Critical', status: 'Needs review', reason: 'The supplier and invoice number already exist in the ledger.', action: 'Hold payment and confirm whether this is a corrected copy.' },
  { id: 'INV-1057', supplier: 'Urban Pantry Co', amount: '€640.50', issue: 'Missing PO', priority: 'Medium', status: 'Needs review', reason: 'No purchase order was found for the supplier and invoice date.', action: 'Route to the budget owner for exception approval.' },
  { id: 'INV-1060', supplier: 'Cloudline Services', amount: '€4,210.00', issue: 'Low AI confidence', priority: 'Medium', status: 'Needs review', reason: 'The scanned document has low confidence on the VAT and due-date fields.', action: 'Review the source PDF before entering the invoice.' },
  { id: 'INV-1064', supplier: 'Cedar Consulting', amount: '€1,500.00', issue: 'No exception', priority: 'Low', status: 'Approved', reason: 'All required fields are present and the purchase order is available.', action: 'Move to the next validation step.' },
  { id: 'INV-1068', supplier: 'Harbour Facilities', amount: '€3,280.00', issue: 'Missing VAT', priority: 'High', status: 'Needs review', reason: 'The invoice total is present, but VAT cannot be identified reliably.', action: 'Ask the supplier for a corrected invoice.' },
  { id: 'INV-1071', supplier: 'Northstar Office Ltd', amount: '€980.00', issue: 'PO mismatch', priority: 'High', status: 'Needs review', reason: 'The invoice total is higher than the approved purchase order amount.', action: 'Route to Procurement for a variance decision.' },
  { id: 'INV-1075', supplier: 'Mosaic Travel Group', amount: '€420.00', issue: 'No exception', priority: 'Low', status: 'Approved', reason: 'Supplier, PO, total and VAT fields passed the validation checks.', action: 'Create draft payable record.' },
  { id: 'INV-1079', supplier: 'Lumen Printworks', amount: '€760.00', issue: 'Missing supplier', priority: 'Medium', status: 'Needs review', reason: 'The source file does not contain a reliable supplier name.', action: 'Review the PDF and complete the supplier field.' },
  { id: 'INV-1082', supplier: 'TransitWorks Srl', amount: '€2,150.00', issue: 'Duplicate invoice', priority: 'Critical', status: 'Needs review', reason: 'A matching invoice number is already present in the processed queue.', action: 'Hold the item and confirm whether it is a duplicate.' },
  { id: 'INV-1086', supplier: 'Greenline Catering', amount: '€1,870.00', issue: 'No exception', priority: 'Low', status: 'Approved', reason: 'Required fields are complete and no exception was detected.', action: 'Move to the next validation step.' }
];
const rows = document.querySelector('#invoice-rows');
const filter = document.querySelector('#invoice-filter');
const summary = document.querySelector('#queue-summary');
const detail = document.querySelector('#invoice-detail');
function render() {
  const value = filter.value;
  const visible = invoices.filter((invoice) => value === 'all' || (value === 'review' && invoice.status === 'Needs review') || (value === 'approved' && invoice.status === 'Approved') || (value === 'high' && ['High', 'Critical'].includes(invoice.priority)));
  rows.innerHTML = visible.map((invoice) => `<tr tabindex="0" data-id="${invoice.id}" aria-selected="false"><td>${invoice.id}</td><td>${invoice.supplier}</td><td>${invoice.amount}</td><td>${invoice.issue}</td><td><span class="badge ${invoice.priority.toLowerCase()}">${invoice.priority}</span></td><td><span class="badge ${invoice.status === 'Approved' ? 'approved' : ''}">${invoice.status}</span></td></tr>`).join('');
  summary.textContent = `${visible.length} of ${invoices.length} invoices shown`;
  rows.querySelectorAll('tr').forEach((row) => { row.addEventListener('click', () => select(row.dataset.id)); row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(row.dataset.id); } }); });
}
function select(id) {
  const invoice = invoices.find((item) => item.id === id);
  rows.querySelectorAll('tr').forEach((row) => row.setAttribute('aria-selected', row.dataset.id === id ? 'true' : 'false'));
  detail.innerHTML = `<strong>${invoice.id} · ${invoice.issue}</strong><p>${invoice.reason}</p><div class="detail-grid"><div><span>Suggested action</span><b>${invoice.action}</b></div><div><span>Supplier</span><b>${invoice.supplier}</b></div><div><span>Current state</span><b>${invoice.status}</b></div></div>`;
}
filter.addEventListener('change', render);
render();
