(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const COLOR = { as_is: "var(--asis)", to_be: "var(--tobe)" };
  const NAME = { as_is: "AS-IS", to_be: "TO-BE" };
  const EXC = { quantity_difference: "Quantity or weight difference", price_mismatch: "Price mismatch", missing_po: "Missing purchase order", duplicate: "Duplicate invoice" };
  const SHORT = { quantity_difference: "Qty / weight", price_mismatch: "Price", missing_po: "Missing PO", duplicate: "Duplicate" };
  const cw = (id) => Math.max(300, Math.round($(id).clientWidth || 520));
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const $ = (id) => document.getElementById(id);
  const tip = $("tip");
  let ALL = [], histSc = "as_is", showAll = false;

  const eur = (v) => "€" + Math.round(v).toLocaleString("en-GB");
  const eurK = (v) => (v >= 1000 ? "€" + Math.round(v / 1000) + "k" : eur(v));
  const pct = (v) => (v == null ? "–" : (v * 100).toFixed(v >= 0.99 && v < 1 ? 1 : 0) + "%");
  const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const share = (xs, f) => (xs.length ? xs.filter(f).length / xs.length : null);

  function parseCSV(text) {
    const [head, ...lines] = text.trim().split(/\r?\n/);
    const keys = head.split(",");
    return lines.map((l) => {
      const v = l.split(","), r = {};
      keys.forEach((k, i) => (r[k] = v[i]));
      r.amount_eur = +r.amount_eur;
      r.perishable = r.perishable === "True";
      r.auto_matched = r.auto_matched === "True";
      r.cycle_days = r.cycle_days === "" ? null : +r.cycle_days;
      r.days_to_pay = r.days_to_pay === "" ? null : +r.days_to_pay;
      r.paid_on_time = r.paid_on_time === "True";
      r.month = +r.invoice_date.slice(5, 7) - 1;
      r.quarter = Math.floor(r.month / 3) + 1;
      return r;
    });
  }

  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function svg(container, w, h) {
    container.innerHTML = "";
    const s = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img" });
    container.appendChild(s);
    return s;
  }
  function text(parent, x, y, str, attrs = {}) { const t = el("text", { x, y, ...attrs }, parent); t.textContent = str; return t; }
  // bar with 4px rounded data-end, square at baseline (horizontal: baseline left)
  function hbar(parent, x, y, w, h, fill) {
    const r = Math.min(4, w, h / 2);
    if (w <= 0) return el("rect", { x, y, width: 0, height: h }, parent);
    return el("path", { d: `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`, fill }, parent);
  }
  function vbar(parent, x, base, w, h, fill) {
    const r = Math.min(4, h, w / 2);
    if (h <= 0) return el("rect", { x, y: base, width: w, height: 0 }, parent);
    const y = base - h;
    return el("path", { d: `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`, fill }, parent);
  }
  function hover(node, html) {
    node.style.cursor = "default";
    node.addEventListener("pointermove", (e) => { tip.innerHTML = html; tip.hidden = false; place(e); });
    node.addEventListener("pointerleave", () => (tip.hidden = true));
  }
  function place(e) {
    const pad = 14, r = tip.getBoundingClientRect();
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - pad;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }

  function metrics(rows) {
    const paid = rows.filter((r) => r.outcome === "paid");
    const per = paid.filter((r) => r.perishable);
    return {
      cycle: median(rows.filter((r) => r.cycle_days != null).map((r) => r.cycle_days)),
      onTime: share(paid, (r) => r.paid_on_time),
      perish: share(per, (r) => r.days_to_pay <= 30),
      firstMatch: share(rows, (r) => r.auto_matched),
      within5: share(rows.filter((r) => r.cycle_days != null), (r) => r.cycle_days <= 5),
      dupPaid: rows.filter((r) => r.outcome === "duplicate_paid"),
      lateEur: paid.filter((r) => !r.paid_on_time).reduce((a, r) => a + r.amount_eur, 0),
    };
  }

  function filtered() {
    const c = $("fCategory").value, q = $("fQuarter").value;
    return ALL.filter((r) => (c === "all" || r.category === c) && (q === "all" || r.quarter === +q));
  }

  function render() {
    const rows = filtered();
    const by = { as_is: rows.filter((r) => r.scenario === "as_is"), to_be: rows.filter((r) => r.scenario === "to_be") };
    const m = { as_is: metrics(by.as_is), to_be: metrics(by.to_be) };
    $("count").textContent = `${by.as_is.length.toLocaleString("en-GB")} invoices · ${eur(by.as_is.reduce((a, r) => a + r.amount_eur, 0))}`;
    renderKpis(m);
    renderHealth(m);
    renderTrend(by);
    renderHist(by[histSc]);
    renderExc(by.as_is);
    renderTable(by[histSc]);
  }

  function renderKpis(m) {
    const dupEur = (x) => x.dupPaid.reduce((a, r) => a + r.amount_eur, 0);
    const pp = (a, b) => (a == null || b == null ? "" : `${b >= a ? "+" : "−"}${Math.abs(Math.round((b - a) * 100))} pts`);
    const k = [
      ["Median approval time", m.to_be.cycle == null ? "–" : m.to_be.cycle + " days", `AS-IS ${m.as_is.cycle ?? "–"} days`, m.as_is.cycle != null && m.to_be.cycle != null ? `▼ ${m.as_is.cycle - m.to_be.cycle} days` : ""],
      ["Paid on time", pct(m.to_be.onTime), `AS-IS ${pct(m.as_is.onTime)}`, "▲ " + pp(m.as_is.onTime, m.to_be.onTime)],
      ["Fresh meat paid ≤ 30 days", pct(m.to_be.perish), `AS-IS ${pct(m.as_is.perish)}`, "▲ " + pp(m.as_is.perish, m.to_be.perish)],
      ["Duplicate invoices paid", `${m.to_be.dupPaid.length} (${eurK(dupEur(m.to_be))})`, `AS-IS ${m.as_is.dupPaid.length} (${eurK(dupEur(m.as_is))})`, m.as_is.dupPaid.length > m.to_be.dupPaid.length ? `▼ ${m.as_is.dupPaid.length - m.to_be.dupPaid.length} invoices` : ""],
    ];
    $("kpis").innerHTML = k.map(([l, v, before, d]) => `<article class="kpi"><p class="label">${l}</p><p class="value">${v}</p><div class="row"><span class="before">${before}</span>${d && !/NaN|▲ $/.test(d) ? `<span class="delta" title="Change vs AS-IS">${d}</span>` : ""}</div></article>`).join("");
  }

  function renderHealth(m) {
    const items = [["First-time match", "firstMatch"], ["Approved within 5 days", "within5"], ["Paid on time", "onTime"], ["Fresh meat ≤ 30 days", "perish"]];
    const W = cw("health"), L = 128, R = 48, bh = 14, gap = 4, group = 46, H = items.length * group + 24;
    const s = svg($("health"), W, H);
    s.setAttribute("aria-label", "Grouped bars comparing AS-IS and TO-BE on four process controls");
    const x = (v) => (W - L - R) * v;
    [0, 0.5, 1].forEach((t) => { el("line", { x1: L + x(t), x2: L + x(t), y1: 0, y2: H - 20, class: "gridline" }, s); text(s, L + x(t), H - 4, t * 100 + "%", { "text-anchor": "middle" }); });
    items.forEach(([label, key], i) => {
      const y0 = i * group + 6;
      text(s, 0, y0 + bh + gap / 2 + 4, label.replace("Approved within 5 days", "Approved ≤ 5 days"), { class: "lbl" });
      ["as_is", "to_be"].forEach((sc, j) => {
        const v = m[sc][key] ?? 0, y = y0 + j * (bh + gap);
        const b = hbar(s, L, y, x(v), bh, COLOR[sc]);
        text(s, L + x(v) + 6, y + bh - 2, pct(m[sc][key]), { class: "val" });
        const hit = el("rect", { x: L, y: y - 1, width: W - L, height: bh + 2, fill: "transparent" }, s);
        hover(hit, `<b>${label}</b><br>${NAME[sc]}: ${pct(m[sc][key])}${sc === "as_is" && key === "firstMatch" ? "<br>All matching is manual today" : ""}`);
      });
    });
  }

  function renderTrend(by) {
    const W = cw("trend"), H = 250, L = 40, R = 16, T = 10, B = 26;
    const s = svg($("trend"), W, H);
    s.setAttribute("aria-label", "Line chart of monthly on-time payment rate, AS-IS and TO-BE");
    const months = [...new Set(by.as_is.map((r) => r.month))].sort((a, b) => a - b);
    const series = {};
    ["as_is", "to_be"].forEach((sc) => (series[sc] = months.map((mo) => share(by[sc].filter((r) => r.month === mo && r.outcome === "paid"), (r) => r.paid_on_time))));
    const vals = Object.values(series).flat().filter((v) => v != null);
    const lo = Math.max(0, Math.floor((Math.min(...vals, 1) - 0.05) * 10) / 10);
    const X = (i) => L + (months.length > 1 ? (i * (W - L - R)) / (months.length - 1) : (W - L - R) / 2);
    const Y = (v) => T + (1 - (v - lo) / (1 - lo)) * (H - T - B);
    $("trendNote").textContent = lo > 0 ? ` · axis starts at ${Math.round(lo * 100)}%` : "";
    for (let t = lo; t <= 1.0001; t += 0.1) { el("line", { x1: L, x2: W - R, y1: Y(t), y2: Y(t), class: "gridline" }, s); text(s, L - 6, Y(t) + 4, Math.round(t * 100) + "%", { "text-anchor": "end" }); }
    months.forEach((mo, i) => { if (W >= 420 || i % 2 === 0) text(s, X(i), H - 6, MONTHS[mo], { "text-anchor": "middle" }); });
    ["as_is", "to_be"].forEach((sc) => {
      const pts = series[sc].map((v, i) => (v == null ? null : [X(i), Y(v)])).filter(Boolean);
      el("path", { d: pts.map((p, i) => (i ? "L" : "M") + p.join(",")).join(""), fill: "none", stroke: COLOR[sc], "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, s);
      const last = pts[pts.length - 1];
      if (last) el("circle", { cx: last[0], cy: last[1], r: 4, fill: COLOR[sc], stroke: "#fff", "stroke-width": 2 }, s);
    });
    const cross = el("line", { y1: T, y2: H - B, stroke: "var(--muted)", "stroke-width": 1, opacity: 0 }, s);
    const hit = el("rect", { x: L, y: T, width: W - L - R, height: H - T - B, fill: "transparent" }, s);
    hit.addEventListener("pointermove", (e) => {
      const p = s.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const lx = p.matrixTransform(s.getScreenCTM().inverse()).x;
      let i = 0, best = Infinity; months.forEach((_, j) => { const d = Math.abs(X(j) - lx); if (d < best) { best = d; i = j; } });
      cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("opacity", 0.5);
      tip.innerHTML = `<b>${MONTHS[months[i]]} 2025</b><br>AS-IS: ${pct(series.as_is[i])}<br>TO-BE: ${pct(series.to_be[i])}`;
      tip.hidden = false; place(e);
    });
    hit.addEventListener("pointerleave", () => { tip.hidden = true; cross.setAttribute("opacity", 0); });
  }

  function renderHist(rows) {
    const per = rows.filter((r) => r.perishable && r.days_to_pay != null && r.outcome === "paid");
    if (!per.length) { $("hist").innerHTML = '<p class="empty-chart">No fresh-meat invoices in this selection. Choose “All categories” or “Fresh meat” to see this chart.</p>'; return; }
    const W = cw("hist"), H = 230, L = 34, R = 10, T = 18, B = 26, step = 5, maxD = 70;
    // bins (0-5], (5-10] ... so that day 30 sits in the last compliant bin
    const bins = []; for (let d = 0; d < maxD; d += step) bins.push({ from: d === 0 ? 0 : d + 1, to: d + step, n: 0 });
    bins.push({ from: maxD + 1, to: Infinity, n: 0 });
    per.forEach((r) => { const i = Math.min(Math.max(Math.ceil(r.days_to_pay / step) - 1, 0), bins.length - 1); bins[i].n++; });
    const max = Math.max(1, ...bins.map((b) => b.n));
    const s = svg($("hist"), W, H);
    s.setAttribute("aria-label", `Histogram of days from invoice to payment for fresh meat, ${NAME[histSc]}`);
    const bw = (W - L - R) / bins.length, Y = (v) => (H - B - T) * (v / max);
    const tickStep = [5, 10, 20, 25, 50, 100].find((t) => max / t <= 5) || 100;
    for (let t = 0; t <= max; t += tickStep) { el("line", { x1: L, x2: W - R, y1: H - B - Y(t), y2: H - B - Y(t), class: "gridline" }, s); text(s, L - 6, H - B - Y(t) + 4, t, { "text-anchor": "end" }); }
    bins.forEach((b, i) => {
      const over = b.from > 30, x = L + i * bw + 1;
      const node = vbar(s, x, H - B, Math.min(24, bw - 2), Y(b.n), over ? "var(--critical)" : COLOR[histSc]);
      if (i % 2 === 1 || b.to === Infinity) text(s, L + (i + 1) * bw, H - 6, b.to === Infinity ? "" : b.to, { "text-anchor": "middle" });
      const hit = el("rect", { x: L + i * bw, y: T, width: bw, height: H - B - T, fill: "transparent" }, s);
      hover(hit, `<b>${b.to === Infinity ? "Over " + maxD + " days" : b.from + "–" + b.to + " days"}</b><br>${b.n} invoices${over ? "<br>Over the 30-day limit" : ""}`);
    });
    const xr = L + (30 / step) * bw;
    el("line", { x1: xr, x2: xr, y1: T - 8, y2: H - B, class: "ref" }, s);
    text(s, xr + 4, T - 1, "30-day limit", { class: "reftext" });
    const late = per.filter((r) => r.days_to_pay > 30).length;
    text(s, W - R, T + 14, `${late} of ${per.length} over the limit`, { "text-anchor": "end", class: "lbl" });
  }

  function renderExc(rows) {
    const counts = Object.keys(EXC).map((k) => [k, rows.filter((r) => r.exception === k).length]).sort((a, b) => b[1] - a[1]);
    const total = rows.filter((r) => r.exception !== "none").length;
    const W = cw("exc"), narrow = W < 420, L = narrow ? 120 : 190, R = 70, bh = 18, gap = 18, H = counts.length * (bh + gap) + 34;
    const s = svg($("exc"), W, H);
    s.setAttribute("aria-label", "Bar chart of exception reasons");
    const max = Math.max(1, ...counts.map((c) => c[1])), x = (v) => (W - L - R) * (v / max);
    counts.forEach(([k, n], i) => {
      const y = i * (bh + gap) + 4;
      text(s, 0, y + bh - 4, narrow ? SHORT[k] : EXC[k], { class: "lbl" });
      hbar(s, L, y, x(n), bh, "var(--neutral)");
      text(s, L + x(n) + 6, y + bh - 4, `${n} · ${total ? Math.round((n / total) * 100) : 0}%`, { class: "val" });
      const hit = el("rect", { x: 0, y: y - 4, width: W, height: bh + 8, fill: "transparent" }, s);
      hover(hit, `<b>${EXC[k]}</b><br>${n} invoices (${total ? Math.round((n / total) * 100) : 0}% of exceptions)`);
    });
    text(s, 0, H - 6, `${total} of ${rows.length} invoices (${rows.length ? Math.round((total / rows.length) * 100) : 0}%) have at least one exception`);
  }

  function renderTable(rows) {
    $("tableSc").textContent = NAME[histSc];
    const g = {};
    rows.forEach((r) => { (g[r.supplier_id] ||= { name: r.supplier_name, cat: r.category, rows: [] }).rows.push(r); });
    const list = Object.values(g).map((x) => { const mm = metrics(x.rows); return { ...x, n: x.rows.length, onTime: mm.onTime, cycle: mm.cycle, late: mm.lateEur }; }).sort((a, b) => b.late - a.late || a.name.localeCompare(b.name));
    const shown = showAll ? list : list.slice(0, 8);
    $("more").textContent = showAll ? "Show top 8" : `Show all ${list.length} suppliers`;
    $("more").hidden = list.length <= 8;
    $("tbody").innerHTML = shown.map((x) => `<tr><td>${x.name}</td><td>${x.cat}</td><td class="num">${x.n}</td><td class="num"><span class="pill ${x.onTime != null && x.onTime < 0.95 ? "bad" : "ok"}">${pct(x.onTime)}</span></td><td class="num">${x.cycle ?? "–"}</td><td class="num">${eur(x.late)}</td></tr>`).join("");
  }

  document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => {
    histSc = b.dataset.sc;
    document.querySelectorAll(".seg button").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    render();
  }));
  $("more").addEventListener("click", () => { showAll = !showAll; render(); });
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => ALL.length && render(), 150); });
  $("fCategory").addEventListener("change", render);
  $("fQuarter").addEventListener("change", render);
  $("fReset").addEventListener("click", () => { $("fCategory").value = "all"; $("fQuarter").value = "all"; render(); });

  fetch("../data/invoices_scenarios.csv").then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((t) => {
    ALL = parseCSV(t);
    [...new Set(ALL.map((r) => r.category))].sort().forEach((c) => $("fCategory").insertAdjacentHTML("beforeend", `<option value="${c}">${c}</option>`));
    $("loading").hidden = true; $("dash").hidden = false;
    render();
  }).catch(() => { $("loading").textContent = "The data could not be loaded. Open this page through a local web server or the live site."; });
})();
