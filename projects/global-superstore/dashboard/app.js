(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);
  const tip = $("tip");
  const POS = "var(--tobe)", NEG = "var(--critical)", NEUTRAL = "var(--neutral)";
  const BAND_LABEL = ["No discount", "Under 20%", "20–29%", "30–49%", "50% or more"];
  let D, rows = [], view = "overview";

  // ---------- formatting ----------
  const money = (v) => {
    const a = Math.abs(v), s = v < 0 ? "−$" : "$";
    if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M";
    if (a >= 1e3) return s + Math.round(a / 1e3) + "K";
    return s + Math.round(a);
  };
  const moneyFull = (v) => (v < 0 ? "−$" : "$") + Math.round(Math.abs(v)).toLocaleString("en-US");
  const pct = (v) => (v == null || !isFinite(v) ? "–" : (v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(1) + "%");
  const int = (v) => v.toLocaleString("en-US");

  // ---------- svg helpers ----------
  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function svg(box, w, h, label) {
    box.innerHTML = "";
    const s = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label });
    box.appendChild(s);
    return s;
  }
  function text(p, x, y, str, attrs = {}) { const t = el("text", { x, y, ...attrs }, p); t.textContent = str; return t; }
  const width = (box) => Math.max(280, Math.round(box.clientWidth || 600));
  // horizontal bar from x0, rounded only at the data end
  function hbar(p, x0, y, w, h, fill) {
    const r = Math.min(4, Math.abs(w), h / 2);
    if (Math.abs(w) < 0.5) return el("rect", { x: x0, y, width: 1, height: h, fill }, p);
    const x1 = x0 + w, d = w > 0 ? 1 : -1;
    return el("path", { d: `M${x0},${y}H${x1 - d * r}Q${x1},${y} ${x1},${y + r}V${y + h - r}Q${x1},${y + h} ${x1 - d * r},${y + h}H${x0}Z`, fill }, p);
  }
  function vbar(p, x, base, w, h, fill) {
    const r = Math.min(4, h, w / 2);
    if (h <= 0.5) return el("rect", { x, y: base - 1, width: w, height: 1, fill }, p);
    const y = base - h;
    return el("path", { d: `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`, fill }, p);
  }
  function hover(node, html) {
    node.style.cursor = "default";
    node.addEventListener("mousemove", (e) => {
      tip.innerHTML = html; tip.hidden = false;
      const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
      tip.style.left = x + "px"; tip.style.top = (e.clientY + 14) + "px";
    });
    node.addEventListener("mouseleave", () => { tip.hidden = true; });
  }
  const tipHtml = (title, s, p) => `<b>${title}</b><br>Sales ${moneyFull(s)}<br>Profit ${moneyFull(p)}<br>Margin ${pct(p / s)}`;

  // ---------- data ----------
  const sel = () => ({ y: $("fYear").value, m: $("fMarket").value, c: $("fCategory").value, s: $("fSub").value });
  function filtered(ignoreProduct = false) {
    const f = sel();
    return rows.filter((r) => (f.y === "all" || r.year === +f.y) && (f.m === "all" || r.market === +f.m) &&
      (ignoreProduct || ((f.c === "all" || r.cat === +f.c) && (f.s === "all" || r.sub === +f.s))));
  }
  function group(rs, key, n) {
    const out = Array.from({ length: n }, (_, i) => ({ i, sales: 0, profit: 0, lines: 0 }));
    for (const r of rs) { const g = out[r[key]]; g.sales += r.sales; g.profit += r.profit; g.lines += r.lines; }
    return out;
  }
  const total = (rs) => rs.reduce((a, r) => ({ sales: a.sales + r.sales, profit: a.profit + r.profit, lines: a.lines + r.lines }), { sales: 0, profit: 0, lines: 0 });

  // ---------- KPIs ----------
  function kpis(rs) {
    const t = total(rs), deep = total(rs.filter((r) => r.band >= 3));
    const cards = [
      ["Sales", money(t.sales), `${int(t.lines)} order lines`],
      ["Profit", money(t.profit), t.profit < 0 ? "Loss-making selection" : "After discounts and costs"],
      ["Profit margin", pct(t.profit / t.sales), "Profit ÷ sales"],
      ["Profit on lines discounted 30%+", money(deep.profit), deep.sales ? `${pct(deep.sales / t.sales)} of sales` : "No such lines"],
    ];
    $("kpis").innerHTML = cards.map(([l, v, n], i) =>
      `<div class="kpi"><p class="label">${l}</p><p class="value${(i === 1 && t.profit < 0) || (i === 3 && deep.profit < 0) || (i === 2 && t.profit < 0) ? " neg" : ""}">${v}</p><p class="before">${n}</p></div>`).join("");
    $("count").textContent = t.lines ? `${int(t.lines)} order lines in the current selection` : "No order lines match these filters";
  }

  // ---------- charts ----------
  function empty(box, msg = "No sales match these filters.") { box.innerHTML = `<p class="empty-chart">${msg}</p>`; }

  function chartYear(rs) {
    const box = $("cYear"), years = [2011, 2012, 2013, 2014];
    const g = years.map((y) => total(rs.filter((r) => r.year === y)));
    if (!g.some((x) => x.lines)) return empty(box);
    const W = width(box), H = 260, L = 56, R = 8, T = 26, B = 28, ih = H - T - B;
    const max = Math.max(...g.map((x) => x.sales)) * 1.08;
    const s = svg(box, W, H, "Sales by year with profit margin");
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = (max / ticks) * i, y = T + ih - (v / max) * ih;
      el("line", { x1: L, x2: W - R, y1: y, y2: y, class: "gridline" }, s);
      text(s, L - 8, y + 4, money(v), { "text-anchor": "end" });
    }
    const slot = (W - L - R) / years.length, bw = Math.min(64, slot * 0.55);
    years.forEach((y, i) => {
      const x = L + slot * i + (slot - bw) / 2, h = (g[i].sales / max) * ih;
      const b = vbar(s, x, T + ih, bw, h, g[i].profit < 0 ? NEG : POS);
      hover(b, tipHtml(String(y), g[i].sales, g[i].profit));
      if (g[i].lines) text(s, x + bw / 2, T + ih - h - 8, pct(g[i].profit / g[i].sales), { "text-anchor": "middle", class: "val" });
      text(s, x + bw / 2, H - 8, String(y), { "text-anchor": "middle", class: "lbl" });
    });
  }

  // diverging horizontal bars, one row per item: {name, sales, profit, highlight}
  function diverging(box, items, label) {
    if (!items.length) return empty(box);
    const W = width(box), row = 28, T = 6, H = T + items.length * row + 6;
    const nameW = Math.min(150, Math.round(W * 0.3)), valW = 64;
    const x0 = nameW + 8, x1 = W - valW;
    const lo = Math.min(0, ...items.map((d) => d.profit)), hi = Math.max(0, ...items.map((d) => d.profit));
    const span = hi - lo || 1, sx = (v) => x0 + ((v - lo) / span) * (x1 - x0);
    const s = svg(box, W, H, label);
    const zero = sx(0);
    items.forEach((d, i) => {
      const y = T + i * row;
      text(s, nameW, y + row / 2 + 4, d.name, { "text-anchor": "end", class: d.profit < 0 ? "lbl neg-lbl" : "lbl" });
      const b = hbar(s, zero, y + 5, sx(d.profit) - zero, row - 10, d.profit < 0 ? NEG : POS);
      hover(b, tipHtml(d.name, d.sales, d.profit));
      const vx = d.profit < 0 ? Math.min(zero, sx(d.profit)) : sx(d.profit);
      const tx = d.profit < 0 ? zero + 6 : vx + 6;
      text(s, Math.min(tx, W - 2), y + row / 2 + 4, money(d.profit), { class: d.profit < 0 ? "val neg-val" : "val", "text-anchor": tx > W - valW + 50 ? "end" : "start" });
    });
    el("line", { x1: zero, x2: zero, y1: T - 2, y2: H - 4, stroke: "var(--ink)", "stroke-width": 1 }, s);
  }

  function chartMarket(rs) {
    const items = group(rs, "market", D.markets.length).filter((g) => g.lines)
      .map((g) => ({ name: D.markets[g.i], sales: g.sales, profit: g.profit })).sort((a, b) => b.profit - a.profit);
    diverging($("cMarket"), items, "Profit by market");
  }

  function chartCategory(rs) {
    const box = $("cCategory");
    const g = group(rs, "cat", D.categories.length).filter((x) => x.lines);
    if (!g.length) return empty(box);
    box.innerHTML = `<div class="cat-grid">${g.map((x) => `
      <div class="cat"><p class="label">${D.categories[x.i]}</p>
        <p class="cat-v${x.profit < 0 ? " neg" : ""}">${money(x.profit)} <small>profit</small></p>
        <p class="before">${money(x.sales)} sales · ${pct(x.profit / x.sales)} margin</p>
        <span class="meter"><span style="width:${Math.max(0, Math.min(100, (x.profit / x.sales) * 100 / 0.2))}%"></span></span></div>`).join("")}</div>
      <p class="sub meter-note">Bar length: margin on a 0–20% scale.</p>`;
  }

  function subItems(rs) {
    return group(rs, "sub", D.subcategories.length).filter((g) => g.lines)
      .map((g) => ({ name: D.subcategories[g.i], cat: D.categories[D.subCategoryOf[g.i]], sales: g.sales, profit: g.profit, lines: g.lines }));
  }
  function chartSub(rs) {
    diverging($("cSub"), subItems(rs).sort((a, b) => b.profit - a.profit), "Profit by sub-category");
    const t = subItems(rs).sort((a, b) => a.profit - b.profit);
    $("tSub").innerHTML = `<thead><tr><th>Sub-category</th><th>Category</th><th class="num">Sales</th><th class="num">Profit</th><th class="num">Margin</th><th class="num">Order lines</th></tr></thead><tbody>${
      t.map((d) => `<tr><td>${d.name}</td><td>${d.cat}</td><td class="num">${moneyFull(d.sales)}</td><td class="num${d.profit < 0 ? " neg" : ""}">${moneyFull(d.profit)}</td><td class="num"><span class="pill ${d.profit < 0 ? "bad" : "ok"}">${pct(d.profit / d.sales)}</span></td><td class="num">${int(d.lines)}</td></tr>`).join("")
    }</tbody>`;
  }

  function chartBands(rs) {
    const g = group(rs, "band", 5).filter((x) => x.lines);
    const box = $("cBand");
    if (!g.length) { empty(box); empty($("cBandSales")); return; }
    // margin by band: diverging
    const W = width(box), row = 34, T = 6, H = T + g.length * row + 6, nameW = 92, x0 = nameW + 10, x1 = W - 58;
    const ms = g.map((x) => x.profit / x.sales), lo = Math.min(0, ...ms), hi = Math.max(0, ...ms), span = hi - lo || 1;
    const sx = (v) => x0 + ((v - lo) / span) * (x1 - x0), zero = sx(0);
    const s = svg(box, W, H, "Profit margin by discount level");
    g.forEach((x, i) => {
      const y = T + i * row, m = ms[i];
      text(s, nameW, y + row / 2 + 4, BAND_LABEL[x.i], { "text-anchor": "end", class: "lbl" });
      hover(hbar(s, zero, y + 7, sx(m) - zero, row - 14, m < 0 ? NEG : POS), tipHtml(BAND_LABEL[x.i], x.sales, x.profit));
      text(s, m < 0 ? zero + 6 : sx(m) + 6, y + row / 2 + 4, pct(m), { class: m < 0 ? "val neg-val" : "val" });
    });
    el("line", { x1: zero, x2: zero, y1: T - 2, y2: H - 4, stroke: "var(--ink)", "stroke-width": 1 }, s);
    // share of sales by band
    const box2 = $("cBandSales"), tot = g.reduce((a, x) => a + x.sales, 0);
    const W2 = width(box2), H2 = T + g.length * row + 6, xs0 = nameW + 10, xs1 = W2 - 58;
    const s2 = svg(box2, W2, H2, "Share of sales by discount level");
    g.forEach((x, i) => {
      const y = T + i * row, sh = x.sales / tot;
      text(s2, nameW, y + row / 2 + 4, BAND_LABEL[x.i], { "text-anchor": "end", class: "lbl" });
      hover(hbar(s2, xs0, y + 7, sh * (xs1 - xs0), row - 14, x.i >= 3 ? NEG : NEUTRAL), tipHtml(BAND_LABEL[x.i], x.sales, x.profit));
      text(s2, xs0 + sh * (xs1 - xs0) + 6, y + row / 2 + 4, pct(sh), { class: "val" });
    });
  }

  function heat(rs) {
    const box = $("cHeat");
    const markets = D.markets.map((m, i) => i).filter((i) => rs.some((r) => r.market === i));
    if (!markets.length) return empty(box);
    const cell = (mi, b) => total(rs.filter((r) => r.market === mi && r.band === b));
    const color = (m) => {
      const t = Math.min(1, Math.abs(m) / 0.5);
      // blend from white to blue (positive) or red (negative)
      const [r, g, b] = m >= 0 ? [31, 111, 209] : [220, 60, 61];
      const mix = (c) => Math.round(255 + (c - 255) * (0.12 + 0.88 * t));
      return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
    };
    const head = BAND_LABEL.map((b) => `<th class="num">${b}</th>`).join("");
    const body = markets.map((mi) => `<tr><th scope="row">${D.markets[mi]}</th>${[0, 1, 2, 3, 4].map((b) => {
      const c = cell(mi, b);
      if (!c.lines) return `<td class="hcell empty">–</td>`;
      const m = c.profit / c.sales, dark = Math.abs(m) >= 0.3;
      return `<td class="hcell" style="background:${color(m)};color:${dark ? "#fff" : "var(--ink)"}" title="${D.markets[mi]} · ${BAND_LABEL[b]}: sales ${moneyFull(c.sales)}, profit ${moneyFull(c.profit)}">${pct(m)}</td>`;
    }).join("")}</tr>`).join("");
    box.innerHTML = `<div class="table-wrap"><table class="table heat"><thead><tr><th>Market</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function tablesPilot() {
    const ti = D.subcategories.indexOf("Tables");
    const rs = filtered(true).filter((r) => r.sub === ti && r.band >= 3);
    const g = group(rs, "market", D.markets.length).filter((x) => x.lines).sort((a, b) => a.profit - b.profit);
    const t = total(rs);
    $("tTables").innerHTML = g.length ? `<thead><tr><th>Market</th><th class="num">Sales</th><th class="num">Profit</th><th class="num">Margin</th><th class="num">Order lines</th></tr></thead><tbody>${
      g.map((x) => `<tr><td>${D.markets[x.i]}</td><td class="num">${moneyFull(x.sales)}</td><td class="num neg">${moneyFull(x.profit)}</td><td class="num"><span class="pill ${x.profit < 0 ? "bad" : "ok"}">${pct(x.profit / x.sales)}</span></td><td class="num">${int(x.lines)}</td></tr>`).join("")
    }</tbody><tfoot><tr><th>Total</th><th class="num">${moneyFull(t.sales)}</th><th class="num neg">${moneyFull(t.profit)}</th><th class="num">${pct(t.profit / t.sales)}</th><th class="num">${int(t.lines)}</th></tr></tfoot>`
      : `<tbody><tr><td class="empty-chart">No Tables lines at 30% or more in this year and market.</td></tr></tbody>`;
  }

  // ---------- render ----------
  function render() {
    tip.hidden = true;
    const rs = filtered();
    kpis(rs);
    if (view === "overview") { chartYear(rs); chartMarket(rs); chartCategory(rs); }
    if (view === "profit") chartSub(rs);
    if (view === "discount") { chartBands(rs); heat(rs); tablesPilot(); }
  }

  function fillSubs() {
    const c = $("fCategory").value, keep = $("fSub").value;
    const opts = D.subcategories.map((s, i) => ({ s, i })).filter((o) => c === "all" || D.subCategoryOf[o.i] === +c);
    $("fSub").innerHTML = `<option value="all">All sub-categories</option>` + opts.map((o) => `<option value="${o.i}">${o.s}</option>`).join("");
    $("fSub").value = opts.some((o) => String(o.i) === keep) ? keep : "all";
  }

  function setView(v) {
    view = v;
    document.querySelectorAll(".tabs button").forEach((b) => {
      const on = b.dataset.view === v;
      b.setAttribute("aria-selected", on); b.setAttribute("aria-pressed", on);
    });
    document.querySelectorAll(".view").forEach((n) => { n.hidden = n.id !== "v-" + v; });
    render();
  }

  async function init() {
    if (window.self !== window.top) document.querySelector(".sitebar").hidden = true;
    try {
      const res = await fetch("data/summary.json");
      if (!res.ok) throw new Error(res.status);
      D = await res.json();
    } catch (e) {
      $("loading").textContent = "The data could not be loaded. Please reload the page.";
      return;
    }
    rows = D.rows.map(([year, market, cat, sub, band, sales, profit, lines]) => ({ year, market, cat, sub, band, sales, profit, lines }));
    [2011, 2012, 2013, 2014].forEach((y) => $("fYear").insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`));
    D.markets.forEach((m, i) => $("fMarket").insertAdjacentHTML("beforeend", `<option value="${i}">${m}</option>`));
    D.categories.forEach((c, i) => $("fCategory").insertAdjacentHTML("beforeend", `<option value="${i}">${c}</option>`));
    fillSubs();
    ["fYear", "fMarket", "fSub"].forEach((id) => $(id).addEventListener("change", render));
    $("fCategory").addEventListener("change", () => { fillSubs(); render(); });
    $("fReset").addEventListener("click", () => { ["fYear", "fMarket", "fCategory"].forEach((id) => ($(id).value = "all")); fillSubs(); render(); });
    document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    $("loading").hidden = true; $("dash").hidden = false;
    render();
    let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(render, 150); });
  }
  init();
})();
