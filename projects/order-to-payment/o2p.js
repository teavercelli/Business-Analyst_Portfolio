(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- BPMN-style process maps ---------- */
  const LANES = ["Supplier", "Purchasing", "Warehouse", "Accounts payable", "Finance manager"];
  const PAIN = {
    P1: ["No single record of purchase orders", "Orders go out by phone or email and are not always recorded, so matching later starts from incomplete data.", "Each order is recorded once in the ERP purchase module, with agreed price, quantity and payment terms."],
    P2: ["Weight and quality differences stay on paper", "Differences are written on the paper delivery note, which reaches administration days later or gets lost.", "Warehouse records the received weight on a tablet; a difference beyond ±2% alerts purchasing the same day."],
    P3: ["Manual three-way match", "The clerk compares invoice, order and delivery note by hand for every invoice and resolves mismatches by email.", "XML invoices are imported from SDI and matched automatically; only mismatches go to an exception queue with an owner and a reason. PDF-only invoices pass an intake check first (InvoiceFlow)."],
    P4: ["Approvals stuck in inboxes", "Approvals arrive by email with no threshold rule and no deadline, so invoices wait with no owner.", "Invoices route by amount (up to €5,000 purchasing, above that finance) with a 3-working-day SLA and automatic reminders."],
    P5: ["Due dates in a spreadsheet", "Due dates are typed into Excel; missed rows mean late payments, including perishable invoices with a 30-day legal limit.", "Due dates are calculated from payment terms, and perishable invoices are flagged with the days left to the legal limit."],
    P6: ["No view of upcoming payments", "The weekly payment list is built from memory, so finance cannot plan the cash it needs.", "Each week the system proposes a payment run with the total cash required; the finance manager approves it."],
    P7: ["Suppliers chase status by phone", "Suppliers call to ask when they will be paid, and the clerk searches emails to answer.", "Suppliers receive an automatic notice when an invoice is approved and when it is paid."],
    P8: ["No process measures", "Nobody tracks cycle time, on-time rate or exceptions, so problems surface only when they escalate.", "A KPI dashboard is reviewed monthly by finance and management."],
  };
  const MAPS = {
    asis: {
      nodes: [
        { id: "s", lane: 1, col: 0, type: "start", label: "Need for\ngoods" },
        { id: "a1", lane: 1, col: 1, label: "Order by phone\nor email", p: "P1" },
        { id: "a2", lane: 0, col: 2, label: "Deliver goods\nwith DDT" },
        { id: "a3", lane: 2, col: 3, label: "Check weight,\nnote on paper", p: "P2" },
        { id: "a4", lane: 0, col: 4, label: "Send e-invoice\nvia SDI" },
        { id: "a5", lane: 3, col: 5, label: "Match invoice,\norder, DDT\nby hand", p: "P3" },
        { id: "g", lane: 3, col: 6, type: "gw", label: "Match?" },
        { id: "a6", lane: 1, col: 6, label: "Clarify by\nemail" },
        { id: "a7", lane: 4, col: 7, label: "Approve\nby email", p: "P4" },
        { id: "a8", lane: 3, col: 8, label: "Track due date\nin Excel", p: "P5" },
        { id: "a11", lane: 0, col: 8, label: "Call to ask\nfor status", p: "P7" },
        { id: "a9", lane: 4, col: 9, label: "Approve weekly\npayment list", p: "P6" },
        { id: "a10", lane: 3, col: 10, label: "Pay by bank\ntransfer" },
        { id: "e", lane: 3, col: 11, type: "end", label: "Invoice\npaid" },
        { id: "n", lane: 4, col: 11, type: "note", label: "No KPIs\ntracked", p: "P8" },
      ],
      edges: [["s", "a1"], ["a1", "a2"], ["a2", "a3"], ["a3", "a4"], ["a4", "a5"], ["a5", "g"], ["g", "a7", "yes"], ["g", "a6", "no"], ["a6", "a5"], ["a7", "a8"], ["a8", "a9"], ["a9", "a10"], ["a10", "e"], ["a11", "a8", "", true]],
    },
    tobe: {
      nodes: [
        { id: "s", lane: 1, col: 0, type: "start", label: "Need for\ngoods" },
        { id: "b1", lane: 1, col: 1, label: "Record PO\nin ERP", p: "P1" },
        { id: "b2", lane: 0, col: 2, label: "Deliver goods\nwith DDT" },
        { id: "b3", lane: 2, col: 3, label: "Record receipt\non tablet", p: "P2" },
        { id: "b4", lane: 0, col: 4, label: "Send e-invoice\nvia SDI" },
        { id: "b5", lane: 3, col: 5, sys: true, label: "Auto import +\nthree-way\nmatch", p: "P3" },
        { id: "g", lane: 3, col: 6, type: "gw", label: "Within\ntolerance?" },
        { id: "b6", lane: 1, col: 6, label: "Resolve\nexception\n(owner, SLA)" },
        { id: "b7", lane: 4, col: 7, label: "Approve by\nthreshold,\n3-day SLA", p: "P4" },
        { id: "b8", lane: 3, col: 8, sys: true, label: "Calculate due\ndate, flag\nperishables", p: "P5" },
        { id: "b9", lane: 4, col: 9, label: "Approve payment\nproposal +\ncash need", p: "P6" },
        { id: "b10", lane: 3, col: 10, label: "Pay on\ndue date" },
        { id: "b11", lane: 0, col: 10, sys: true, label: "Notify:\napproved, paid", p: "P7" },
        { id: "e", lane: 3, col: 11, type: "end", label: "Invoice\npaid" },
        { id: "n", lane: 4, col: 11, type: "note", label: "KPI dashboard,\nmonthly review", p: "P8" },
      ],
      edges: [["s", "b1"], ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"], ["b5", "g"], ["g", "b7", "yes"], ["g", "b6", "no"], ["b6", "b7"], ["b7", "b8"], ["b8", "b9"], ["b9", "b10"], ["b10", "e"], ["b10", "b11", "", true]],
    },
  };
  const LW = 92, CW = 92, LH = 100, TW = 84, TH = 62, PAD = 10;
  const cx = (n) => LW + PAD + n.col * CW + CW / 2;
  const cy = (n) => n.lane * LH + LH / 2;
  const half = (n) => (n.type === "start" || n.type === "end" ? [17, 17] : n.type === "gw" ? [22, 22] : [TW / 2, TH / 2]);

  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function lines(parent, x, y, label, cls, lh = 13) {
    const ls = label.split("\n"), t = el("text", { x, y: y - ((ls.length - 1) * lh) / 2 + 4, "text-anchor": "middle", class: cls }, parent);
    ls.forEach((l, i) => { const s = el("tspan", { x, dy: i ? lh : 0 }, t); s.textContent = l; });
  }
  function route(a, b) {
    const [aw, ah] = half(a), [bw, bh] = half(b);
    const ax = cx(a), ay = cy(a), bx = cx(b), by = cy(b);
    if (a.col === b.col) { const d = by > ay ? 1 : -1; return [[ax, ay + d * ah], [bx, by - d * bh]]; }
    if (b.col > a.col) {
      if (a.lane === b.lane) return [[ax + aw, ay], [bx - bw, by]];
      if (a.type === "gw") { const d = by > ay ? 1 : -1; return [[ax, ay + d * ah], [ax, by], [bx - bw, by]]; }
      const mx = ax + aw + (CW - TW) / 2; return [[ax + aw, ay], [mx, ay], [mx, by], [bx - bw, by]];
    }
    const d = by > ay ? 1 : -1; return [[ax - aw, ay], [bx, ay], [bx, by - d * bh]];
  }

  let view = "asis";
  function drawBpmn() {
    const map = MAPS[view], wrap = $("bpmn");
    const W = LW + PAD * 2 + 12 * CW, H = LANES.length * LH;
    wrap.innerHTML = "";
    const s = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "group", "aria-label": `${view === "asis" ? "AS-IS" : "TO-BE"} process map` }, null);
    wrap.appendChild(s);
    const defs = el("defs", {}, s);
    const mk = el("marker", { id: "arr", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0L10,5L0,10z", class: "bp-arrow" }, mk);
    LANES.forEach((name, i) => {
      el("rect", { x: 0, y: i * LH, width: W, height: LH, class: i % 2 ? "bp-lane alt" : "bp-lane" }, s);
      el("rect", { x: 0, y: i * LH, width: LW, height: LH, class: "bp-lanehead" }, s);
      lines(s, LW / 2, i * LH + LH / 2, name.replace(" ", "\n"), "bp-lanelabel");
    });
    el("rect", { x: 0.5, y: 0.5, width: W - 1, height: H - 1, class: "bp-pool" }, s);
    const byId = Object.fromEntries(map.nodes.map((n) => [n.id, n]));
    map.edges.forEach(([f, t, lab, msg]) => {
      const pts = route(byId[f], byId[t]);
      el("polyline", { points: pts.map((p) => p.join(",")).join(" "), class: msg ? "bp-edge msg" : "bp-edge", "marker-end": "url(#arr)" }, s);
      if (lab) { const [x, y] = pts[0], [x2, y2] = pts[1]; el("text", { x: x + (x2 - x) / 2 + (x2 === x ? 6 : 0), y: y + (y2 - y) / 2 - 4, class: "bp-edgelabel" }, s).textContent = lab; }
    });
    map.nodes.forEach((n) => {
      const g = el("g", { class: "bp-node" + (n.p ? " has-p " + view : "") }, s);
      const x = cx(n), y = cy(n);
      if (n.type === "start" || n.type === "end") {
        el("circle", { cx: x, cy: y, r: 17, class: n.type === "end" ? "bp-event end" : "bp-event" }, g);
        lines(g, x, y + 34, n.label, "bp-small", 12);
      } else if (n.type === "gw") {
        el("path", { d: `M${x},${y - 22}L${x + 22},${y}L${x},${y + 22}L${x - 22},${y}Z`, class: "bp-gw" }, g);
        el("text", { x, y: y + 5, "text-anchor": "middle", class: "bp-x" }, g).textContent = "×";
        lines(g, x + 27, y + 4 - (n.label.split("\n").length - 1) * 6, n.label, "bp-small gwl", 12);
      } else {
        el("rect", { x: x - TW / 2, y: y - TH / 2, width: TW, height: TH, rx: n.type === "note" ? 2 : 9, class: n.type === "note" ? "bp-note" : n.sys ? "bp-task sys" : "bp-task" }, g);
        if (n.sys) el("text", { x: x - TW / 2 + 6, y: y - TH / 2 + 13, class: "bp-sys" }, g).textContent = "⚙";
        lines(g, x, y, n.label, "bp-label", 12);
      }
      if (n.p) {
        el("circle", { cx: x + TW / 2 - 2, cy: y - TH / 2 + 2, r: 11, class: "bp-badge " + view }, g);
        el("text", { x: x + TW / 2 - 2, y: y - TH / 2 + 6, "text-anchor": "middle", class: "bp-badgetext" }, g).textContent = n.p.slice(1);
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", `${n.p}: ${PAIN[n.p][0]}`);
        const pick = () => { s.querySelectorAll(".bp-node.sel").forEach((o) => o.classList.remove("sel")); g.classList.add("sel"); detail(n.p); };
        g.addEventListener("click", pick);
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      }
    });
    $("bpmn-hint").textContent = view === "asis" ? "8 pain points: select a numbered step" : "8 fixes: select a numbered step";
    $("bpmn-detail").innerHTML = "<strong>Select a numbered step.</strong>";
  }
  function detail(p) {
    const [title, asis, tobe] = PAIN[p];
    $("bpmn-detail").innerHTML = `<p class="bd-tag ${view}">${p} · ${view === "asis" ? "Pain point" : "Fix"}</p><strong>${esc(title)}</strong><div class="bd-grid"><div><span>AS-IS</span><p>${esc(asis)}</p></div><div><span>TO-BE</span><p>${esc(tobe)}</p></div></div>`;
  }
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    view = b.dataset.view;
    document.querySelectorAll("[data-view]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    drawBpmn();
  }));
  if ($("bpmn")) drawBpmn();

  /* ---------- MoSCoW board ---------- */
  const FR = [
    ["FR-01", "Store each purchase order with supplier, items, quantity, unit price and payment terms", "Must", "P1"],
    ["FR-02", "Record received quantity, weight and quality outcome against an order", "Must", "P2"],
    ["FR-04", "Import e-invoices (XML) received through SDI", "Must", "P3"],
    ["FR-06", "Match invoice, order and receipt and flag mismatches by type", "Must", "P3"],
    ["FR-08", "Give each exception an owner, a reason and a status", "Must", "P3 P4"],
    ["FR-09", "Route approvals by amount threshold", "Must", "P4"],
    ["FR-11", "Calculate each invoice's due date from payment terms", "Must", "P5"],
    ["FR-12", "Flag perishable invoices and prioritise them against the legal limit", "Must", "P5"],
    ["FR-03", "Notify purchasing when a receipt differs beyond tolerance", "Should", "P2"],
    ["FR-07", "Let finance configure tolerance values", "Should", "P3"],
    ["FR-10", "Send a reminder when an approval exceeds its SLA", "Should", "P4"],
    ["FR-13", "Propose a weekly payment run with total cash required", "Should", "P6"],
    ["FR-15", "Show process KPIs, filterable by supplier, category and month", "Should", "P8"],
    ["FR-05", "Check required fields on PDF-only invoices before matching (InvoiceFlow)", "Could", "P3"],
    ["FR-14", "Notify suppliers when an invoice is approved and paid", "Could", "P7"],
    ["FR-16", "Pay automatically through a bank integration", "Won't", "this phase"],
  ];
  if ($("moscow")) {
    $("moscow").innerHTML = ["Must", "Should", "Could", "Won't"].map((k) => {
      const items = FR.filter((f) => f[2] === k);
      return `<div class="mc-col ${k === "Won't" ? "wont" : k.toLowerCase()}"><h3>${k} have <span>${items.length}</span></h3>${items.map(([id, t, , p]) => `<article class="mc-card"><p class="mc-id">${id}</p><p>${esc(t)}</p><p class="mc-trace">${esc(p)}</p></article>`).join("")}</div>`;
    }).join("");
  }

  /* ---------- User stories ---------- */
  const EPICS = [
    ["A", "Know what was ordered and received", [
      ["US-01", "warehouse operator", "record the received weight on a tablet", "differences are not lost on paper", ["Given an open order", "When I enter a weight outside ±2% of the ordered quantity", "Then the receipt is saved as “difference” and purchasing is notified"]],
      ["US-02", "purchasing manager", "be told the same day about delivery differences", "I can raise them with the supplier while the facts are fresh", ["Given a receipt saved as “difference”", "When it is saved", "Then I receive a notification with order, supplier and the size of the difference"]],
    ]],
    ["B", "Match and resolve exceptions", [
      ["US-03", "AP clerk", "have matching invoices go straight to approval", "I only work on exceptions", ["Given an invoice whose price matches and quantity is within tolerance", "When it is imported", "Then its status is “matched” with no manual step"]],
      ["US-04", "AP clerk", "see the reason and owner of each exception", "I know who has to act", ["Given an invoice that fails the match", "When it enters the exception queue", "Then it shows the mismatch type, the owner and the date it was raised"]],
      ["US-05", "finance manager", "set the tolerance rules", "controls follow company policy", ["Given I have the finance role", "When I change the weight tolerance", "Then new matches use the new value and the change is logged"]],
    ]],
    ["C", "Approve on time", [
      ["US-06", "finance manager", "receive invoices above €5,000 for approval", "I control large payments", ["Given a matched invoice above €5,000", "When it is ready for approval", "Then it is routed to me, not to purchasing"]],
      ["US-07", "approver", "get a reminder after 3 working days", "invoices do not wait in my inbox", ["Given an invoice pending approval for more than 3 working days", "Then the approver and the AP clerk receive a reminder"]],
    ]],
    ["D", "Pay on time and plan cash", [
      ["US-08", "AP clerk", "see perishable invoices flagged with the days left to the legal limit", "none is paid late", ["Given a perishable invoice", "When it is approved", "Then it shows the days left to day 30 and is placed in the payment run before that date"]],
      ["US-09", "finance manager", "receive a weekly payment proposal with total cash required", "I can plan liquidity", ["Given approved invoices due in the next 7 days", "When the weekly proposal is generated", "Then it lists them with the total amount and highlights perishable ones"]],
      ["US-10", "supplier", "receive an email when my invoice is approved and when it is paid", "I do not have to call", ["Given my invoice changes status to approved or paid", "Then I receive an email with invoice number, amount and date"]],
    ]],
  ];
  if ($("stories")) {
    $("stories").innerHTML = EPICS.map(([k, title, list]) => `<div class="epic"><h3><span>Epic ${k}</span>${esc(title)}</h3>${list.map(([id, who, what, why, ac]) => `<details class="story"><summary><b>${id}</b> As ${/^[aeiou]|^AP/i.test(who) ? "an" : "a"} <em>${esc(who)}</em>, I want to ${esc(what)}, so that ${esc(why)}.</summary><ul>${ac.map((a) => `<li>${esc(a).replace(/^(Given|When|Then)/, "<strong>$1</strong>")}</li>`).join("")}</ul></details>`).join("")}</div>`).join("");
  }
})();
