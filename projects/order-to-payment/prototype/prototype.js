(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const TODAY = new Date(2026, 2, 16); // Mon 16 Mar 2026 (demo date)
  const DAY = 86400000;
  const d = (y, m, dd) => new Date(y, m - 1, dd);
  const addDays = (dt, n) => new Date(dt.getTime() + n * DAY);
  const fmt = (dt) => dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const fmtW = (dt) => dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const eur = (v) => "€" + v.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const RUNS = [d(2026, 3, 20), d(2026, 3, 27), d(2026, 4, 3), d(2026, 4, 10)];
  const THRESHOLD = 5000;

  // Pending approvals (fictional). qty in kg or units; price per unit.
  const pending = [
    { id: "INV-26-0412", sup: "Carni Roera", cat: "Fresh meat", per: true, inv: d(2026, 2, 23), wait: 5, unit: "kg", qty: 2140, price: 6.85, rcv: 2131, note: "Matched automatically" },
    { id: "INV-26-0431", sup: "Bovini del Pianalto", cat: "Fresh meat", per: true, inv: d(2026, 2, 26), wait: 2, unit: "kg", qty: 1720, price: 7.1, rcv: 1702, note: "Matched automatically (weight −1.0%, within ±2%)" },
    { id: "INV-26-0398", sup: "Allevamento Cascina Brina", cat: "Livestock", per: false, inv: d(2026, 2, 12), wait: 4, unit: "head", qty: 18, price: 1450, rcv: 18, note: "Exception resolved: price confirmed by purchasing" },
    { id: "INV-26-0440", sup: "Mangimi Pianura Verde", cat: "Feed", per: false, inv: d(2026, 3, 2), wait: 1, unit: "t", qty: 22, price: 312, rcv: 22, note: "Matched automatically" },
    { id: "INV-26-0445", sup: "Carni Alte Langhe", cat: "Fresh meat", per: true, inv: d(2026, 3, 3), wait: 3, unit: "kg", qty: 1350, price: 6.6, rcv: 1350, note: "Matched automatically" },
    { id: "INV-26-0451", sup: "Trasporti Frigo Langa", cat: "Logistics", per: false, inv: d(2026, 3, 4), wait: 1, unit: "trip", qty: 14, price: 265, rcv: 14, note: "Matched automatically" },
    { id: "INV-26-0402", sup: "Stalla Prato Lungo", cat: "Livestock", per: false, inv: d(2026, 2, 16), wait: 2, unit: "head", qty: 12, price: 1395, rcv: 12, note: "Matched automatically" },
    { id: "INV-26-0457", sup: "PackPlast Novara", cat: "Packaging", per: false, inv: d(2026, 3, 5), wait: 4, unit: "roll", qty: 120, price: 28.5, rcv: 118, note: "Exception resolved: 2 rolls credited by supplier" },
    { id: "INV-26-0459", sup: "Studio Qualità Alimenti", cat: "Services", per: false, inv: d(2026, 3, 6), wait: 0, unit: "audit", qty: 1, price: 1850, rcv: 1, note: "Matched automatically" },
    { id: "INV-26-0463", sup: "Filiera Monviso Carni", cat: "Fresh meat", per: true, inv: d(2026, 3, 9), wait: 1, unit: "kg", qty: 1980, price: 6.95, rcv: 1992, note: "Matched automatically (weight +0.6%)" },
    { id: "INV-26-0466", sup: "Logistica Freddo Est", cat: "Logistics", per: false, inv: d(2026, 3, 9), wait: 2, unit: "trip", qty: 9, price: 310, rcv: 9, note: "Matched automatically" },
    { id: "INV-26-0418", sup: "Macello Valtanaro", cat: "Fresh meat", per: true, inv: d(2026, 2, 24), wait: 1, unit: "kg", qty: 560, price: 7.4, rcv: 560, note: "Exception resolved: missing PO added by purchasing" },
  ].map((x) => ({ ...x, amount: Math.round(x.qty * x.price), terms: x.per ? 30 : 60 }));
  pending.forEach((x) => (x.due = addDays(x.inv, x.terms)));

  // Already-approved invoices for the calendar (deterministic pseudo-random).
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const SUPS = [["Carni Roera", true], ["Carni Alte Langhe", true], ["Bovini del Pianalto", true], ["Allevamenti Rio Freddo", false], ["Mangimificio Colle Basso", false], ["Imballi Sud Ovest", false], ["Frigoline Express", false], ["Lab Analisi Valdora", false], ["Agrofeed Tanaro", false], ["Cascina Tre Pioppi", false]];
  const approved = [];
  for (let i = 0; i < 30; i++) {
    const [sup, per] = SUPS[Math.floor(rnd() * SUPS.length)];
    const due = addDays(TODAY, 5 + Math.floor(rnd() * 24));
    approved.push({ id: "INV-26-0" + (300 + i * 3), sup, per, due, amount: Math.round((per ? 4000 : 900) + rnd() * (per ? 9000 : 7000)) });
  }

  const runFor = (due) => { let r = RUNS[0]; RUNS.forEach((f) => { if (f <= due) r = f; }); return r; };
  const runState = { [RUNS[0].getTime()]: "proposed" };
  const log = [
    { t: "16 Mar 08:02", who: "System", what: "Weekly payment proposal generated for Fri 20 Mar" },
    { t: "16 Mar 08:00", who: "System", what: `Reminder sent to approvers for ${pending.filter((x) => x.wait > 3).length} invoices past the 3-day SLA` },
    { t: "13 Mar 16:41", who: "Finance manager", what: "Approved INV-26-0377 (Carni Roera, €9,812)" },
  ];

  let role = "finance", selected = null, tab = "appr";
  const mine = () => pending.filter((x) => (role === "finance" ? x.amount > THRESHOLD : x.amount <= THRESHOLD));
  const daysLeft = (x) => 30 - Math.round((TODAY - x.inv) / DAY);
  const slaTag = (x) => (x.wait > 3 ? `<span class="tag bad">⚠ Overdue ${x.wait - 3}d · reminder sent</span>` : x.wait === 3 ? `<span class="tag warn">SLA ends today</span>` : x.wait === 0 ? `<span class="tag ok">Arrived today</span>` : `<span class="tag ok">Day ${x.wait} of 3</span>`);
  const urgent = (x) => x.wait > 3 || (x.per && daysLeft(x) <= 7);

  function renderList() {
    const list = mine().filter((x) => !$("onlyUrgent").checked || urgent(x)).sort((a, b) => urgent(b) - urgent(a) || a.due - b.due);
    $("apprCount").textContent = mine().length;
    $("apprCount").hidden = !mine().length;
    $("apprEmpty").hidden = list.length > 0;
    $("apprRows").innerHTML = list.map((x) => `<tr tabindex="0" data-id="${x.id}" aria-selected="${selected === x.id}">
      <td><div class="sup">${esc(x.sup)}</div><div class="inv">${x.id} · ${x.cat}</div>${x.per ? `<span class="tag ${daysLeft(x) <= 7 ? "bad" : "info"}">Perishable · ${daysLeft(x)} days to legal limit</span>` : ""}</td>
      <td class="num">${eur(x.amount)}</td><td>${slaTag(x)}</td><td>${fmt(x.due)}</td></tr>`).join("");
    $("apprRows").querySelectorAll("tr").forEach((tr) => {
      const go = () => { selected = tr.dataset.id; renderList(); renderDetail(); };
      tr.addEventListener("click", go);
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    if (!list.find((x) => x.id === selected)) { selected = null; renderDetail(); }
  }

  function renderDetail() {
    const x = pending.find((p) => p.id === selected);
    if (!x) { $("detail").innerHTML = `<p class="placeholder">Select an invoice to see the three-way match and approve it.</p>`; return; }
    const diff = ((x.rcv - x.qty) / x.qty) * 100;
    $("detail").innerHTML = `<h2>${esc(x.sup)}</h2><p class="meta">${x.id} · issued ${fmt(x.inv)} · ${x.cat}</p>
      <div class="kv"><div><span>Amount</span><b>${eur(x.amount)}</b></div><div><span>Due date</span><b>${fmt(x.due)}</b></div>
      <div><span>Payment run if approved</span><b>${fmtW(runFor(x.due))}</b></div><div><span>Approval SLA</span><b>${x.wait > 3 ? "Overdue" : x.wait === 3 ? "Ends today" : x.wait === 0 ? "Arrived today" : "Day " + x.wait + " of 3"}</b></div></div>
      <table class="match"><thead><tr><th>Three-way match</th><th>Order</th><th>Receipt</th><th>Invoice</th></tr></thead><tbody>
      <tr><td>Quantity (${x.unit})</td><td>${x.qty.toLocaleString("en-GB")}</td><td>${x.rcv.toLocaleString("en-GB")}</td><td>${x.qty.toLocaleString("en-GB")}</td></tr>
      <tr><td>Unit price</td><td>€${x.price.toFixed(2)}</td><td>–</td><td>€${x.price.toFixed(2)}</td></tr></tbody></table>
      <p class="rule"><b>${x.note}.</b> ${Math.abs(diff) > 0.01 ? `Receipt differs by ${diff.toFixed(1)}%. ` : ""}Routed to the ${role === "finance" ? "finance manager because the amount is above" : "purchasing manager because the amount is up to"} €5,000.${x.per ? ` Perishable: must be paid within 30 days of the invoice (${daysLeft(x)} days left).` : ""}</p>
      <div class="actions"><button class="btn primary" id="approve">Approve</button><button class="btn secondary" id="rejectToggle">Return to AP</button></div>
      <div class="reject-box" id="rejectBox" hidden><label for="reason" class="inv">Reason</label><select id="reason"><option>Price not as agreed</option><option>Goods not received in full</option><option>Wrong cost centre</option><option>Duplicate suspected</option></select><button class="btn secondary" id="reject">Confirm return</button></div>`;
    $("approve").onclick = () => decide(x, true);
    $("rejectToggle").onclick = () => { $("rejectBox").hidden = !$("rejectBox").hidden; };
    $("reject").onclick = () => decide(x, false, $("reason").value);
  }

  const roleName = () => (role === "finance" ? "Finance manager" : "Purchasing manager");
  function decide(x, ok, reason) {
    pending.splice(pending.indexOf(x), 1);
    const now = new Date(TODAY.getTime() + 9 * 3600000 + log.length * 60000);
    const t = `16 Mar ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (ok) {
      approved.push({ id: x.id, sup: x.sup, per: x.per, due: x.due, amount: x.amount, fresh: true });
      log.unshift({ t, who: roleName(), what: `Approved ${x.id} (${x.sup}, ${eur(x.amount)})`, fresh: true });
      log.unshift({ t, who: "System", what: `Approval notice emailed to ${x.sup}`, fresh: true });
      toast(`Approved. Scheduled for the ${fmtW(runFor(x.due))} run, and ${x.sup} has been notified.`);
    } else {
      log.unshift({ t, who: roleName(), what: `Returned ${x.id} to AP: ${reason}`, fresh: true });
      toast(`Returned to accounts payable: ${reason}.`);
    }
    selected = null; renderList(); renderDetail();
  }

  function renderCal() {
    const groups = RUNS.map((r) => ({ r, items: approved.filter((a) => runFor(a.due).getTime() === r.getTime()) }));
    const max = Math.max(...groups.map((g) => g.items.reduce((s, a) => s + a.amount, 0)), 1);
    const W = Math.max(300, $("cashChart").clientWidth || 600), H = 4 * 32 + 2, L = 92, R = 70, bh = 18, gap = 14;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cash needed per payment run">`;
    groups.forEach((g, i) => {
      const tot = g.items.reduce((s, a) => s + a.amount, 0), w = ((W - L - R) * tot) / max, y = i * (bh + gap) + 6;
      const r = Math.min(4, w);
      svg += `<text x="0" y="${y + bh - 4}" class="lbl">${fmtW(g.r)}</text>`;
      svg += `<path d="M${L},${y}H${L + w - r}Q${L + w},${y} ${L + w},${y + r}V${y + bh - r}Q${L + w},${y + bh} ${L + w - r},${y + bh}H${L}Z" fill="${i === 0 ? "var(--tobe)" : "#8FB3E6"}"/>`;
      svg += `<text x="${L + w + 6}" y="${y + bh - 4}" class="val">${eur(tot)}</text>`;
    });
    $("cashChart").innerHTML = svg + "</svg>";
    $("runs").innerHTML = groups.map((g, i) => {
      const tot = g.items.reduce((s, a) => s + a.amount, 0), per = g.items.filter((a) => a.per).length;
      const st = runState[g.r.getTime()];
      const items = [...g.items].sort((a, b) => b.per - a.per || a.due - b.due);
      return `<article class="run ${i === 0 ? "current" : ""}"><p class="date">${i === 0 ? "This week · " : ""}${fmtW(g.r)}</p>
        <p class="total">${eur(tot)}</p><p class="n">${g.items.length} invoices · ${per} perishable</p>
        <ul>${items.slice(0, 6).map((a) => `<li class="${a.per ? "per" : ""}"><span title="${esc(a.sup)}">${esc(a.sup)}${a.fresh ? " · new" : ""}</span><span class="amt">${eur(a.amount)}</span></li>`).join("")}${items.length > 6 ? `<li class="more-n">+ ${items.length - 6} more</li>` : ""}</ul>
        ${i === 0 ? (st === "approved" ? `<span class="tag ok status">✓ Run approved by finance</span>` : `<button class="btn primary" id="approveRun" ${role !== "finance" ? "disabled title=\"Only the finance manager approves payment runs\"" : ""}>Approve payment run</button>`) : `<span class="tag info status">Draft · approve on ${fmt(addDays(g.r, -4))}</span>`}</article>`;
    }).join("");
    const b = $("approveRun");
    if (b) b.onclick = () => {
      runState[RUNS[0].getTime()] = "approved";
      log.unshift({ t: "16 Mar 09:30", who: "Finance manager", what: `Approved payment run for ${fmtW(RUNS[0])}`, fresh: true });
      toast("Payment run approved. Bank file ready for Friday; suppliers are notified when paid.");
      renderCal();
    };
  }

  function renderLog() {
    $("log").innerHTML = log.map((l) => `<li class="${l.fresh ? "new" : ""}"><time>${l.t}</time><span class="who">${l.who}</span><span>${esc(l.what)}</span></li>`).join("");
  }

  let tt;
  function toast(msg) { $("toast").textContent = msg; $("toast").hidden = false; clearTimeout(tt); tt = setTimeout(() => ($("toast").hidden = true), 4200); }

  function show(name) {
    tab = name;
    [["appr", "tab-appr"], ["cal", "tab-cal"], ["log", "tab-log"]].forEach(([p, t]) => { $("panel-" + p).hidden = p !== name; $(t).setAttribute("aria-selected", String(p === name)); });
    if (name === "cal") renderCal();
    if (name === "log") renderLog();
  }
  $("tab-appr").onclick = () => show("appr");
  $("tab-cal").onclick = () => show("cal");
  $("tab-log").onclick = () => show("log");
  $("role").onchange = (e) => { role = e.target.value; $("toast").hidden = true; clearTimeout(tt); selected = null; renderList(); renderDetail(); if (tab === "cal") renderCal(); };
  $("onlyUrgent").onchange = renderList;
  addEventListener("resize", () => tab === "cal" && renderCal());

  renderList(); renderDetail();
  const first = mine().filter(urgent)[0];
  if (first) { selected = first.id; renderList(); renderDetail(); }
})();
