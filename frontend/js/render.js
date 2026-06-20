/**
 * MediPulse — render.js
 * All HTML rendering functions for each tab.
 */

const Render = {

  // ── Utility ──────────────────────────────────────────
  clean(t) {
    return t ? t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
  },

  num(n) {
    if (!n) return "0";
    if (n > 999999) return (n / 1000000).toFixed(1) + "M";
    if (n > 999) return (n / 1000).toFixed(0) + "K";
    return n.toLocaleString();
  },

  gradBar(severity) {
    const map = {
      high:   "linear-gradient(90deg,#f43f5e,#f97316)",
      med:    "linear-gradient(90deg,#f59e0b,#eab308)",
      low:    "linear-gradient(90deg,#10b981,#06b6d4)",
    };
    return map[severity] || map.low;
  },

  // ── OVERVIEW ─────────────────────────────────────────
  overview(d) {
    const topFive = (d.top_reactions || []).slice(0, 5)
      .map(r => `<span class="tag t${r.severity}">${r.name}</span>`)
      .join("");

    const tlPreview = (d.timeline || []).slice(0, 3).map(t => `
      <div class="tl-item">
        <div class="tl-node"><div class="tl-inner"></div></div>
        <div><div class="tl-week">${t.week}</div><div class="tl-desc">${t.desc}</div></div>
      </div>`).join("");

    document.getElementById("c-overview").innerHTML = `
      <div class="sum-hero">
        <div class="sum-title">🧬 ${d.brand_name} <span style="font-size:15px;opacity:0.6">(${d.generic_name})</span></div>
        <div class="sum-meta">
          <span class="mbadge">🏭 ${(d.manufacturer || "Unknown").slice(0,35)}</span>
          <span class="mbadge">⚗️ RxCUI: ${d.rxcui || "N/A"}</span>
          <span class="mbadge">📊 ${this.num(d.total_events)} FDA reports</span>
          <span class="mbadge">🔄 ${(d.interactions || []).length} interactions</span>
        </div>
        <div class="sum-text">${(d.wiki_extract || "No overview available.").slice(0,420)}</div>
        ${d.wiki_title ? `<div style="margin-top:8px;font-size:10px;color:var(--text3)">📖 Wikipedia — ${d.wiki_title}</div>` : ""}
      </div>

      <div class="grid4">
        <div class="card gr" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--rose)"></span>FDA Reports<span class="tab-src src-fda">FDA</span></div>
          <div class="stat-num" style="color:var(--rose)">${this.num(d.total_events)}</div>
          <div class="stat-lbl">adverse events</div>
        </div>
        <div class="card gv" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--violet2)"></span>Reactions<span class="tab-src src-fda">FDA</span></div>
          <div class="stat-num" style="color:var(--violet2)">${(d.top_reactions||[]).length}</div>
          <div class="stat-lbl">unique types</div>
        </div>
        <div class="card gc" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--cyan)"></span>Interactions<span class="tab-src src-rx">RxNorm</span></div>
          <div class="stat-num" style="color:var(--cyan)">${(d.interactions||[]).length}</div>
          <div class="stat-lbl">drug interactions</div>
        </div>
        <div class="card gl" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--lime)"></span>Generic cost<span class="tab-src src-rx">Estimate</span></div>
          <div class="stat-num" style="color:var(--lime);font-size:24px">₹${(d.cost||{}).gen_inr||"N/A"}</div>
          <div class="stat-lbl">per month India</div>
        </div>
      </div>

      <div class="grid2">
        <div class="card">
          <div class="card-lbl"><span class="dot" style="background:var(--amber)"></span>Top adverse reactions<span class="tab-src src-fda">FDA</span></div>
          <div class="tag-grid">${topFive || '<span style="color:var(--text3)">No data found</span>'}</div>
          ${d.purpose ? `<div style="margin-top:14px;font-size:13px;color:var(--text2);line-height:1.7"><b style="color:var(--text)">Purpose: </b>${d.purpose.slice(0,220)}</div>` : ""}
        </div>
        <div class="card">
          <div class="card-lbl"><span class="dot" style="background:var(--cyan)"></span>Recovery timeline preview<span class="tab-src src-wiki">Wiki+FDA</span></div>
          <div class="timeline">${tlPreview}</div>
          <div style="margin-top:8px;font-size:11px;color:var(--text3)">→ Full timeline in <b style="color:var(--violet2)">📅 Timeline</b> tab</div>
        </div>
      </div>
      <div class="disc">⚕ <span>Data from 5 free medical databases. FDA adverse event counts are reported events — not proven causation. Always consult a licensed healthcare professional.</span></div>`;
  },

  // ── SIDE EFFECTS ─────────────────────────────────────
  sideeff(d) {
    const reactions = d.top_reactions || [];
    if (!reactions.length) {
      document.getElementById("c-sideeff").innerHTML = `
        <div class="empty-state"><div class="empty-icon">⚠️</div>
          <div class="empty-title">No adverse event data found</div>
          <div class="empty-sub">Try searching with the exact generic name (e.g. "metformin hydrochloride").</div>
        </div>`;
      return;
    }
    const maxC = reactions[0]?.count || 1;
    const bars = reactions.map(r => `
      <div class="bar-row">
        <span class="bar-lbl">${r.name}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round(r.count/maxC*100)}%;background:${this.gradBar(r.severity)}">
            ${r.count.toLocaleString()}
          </div>
        </div>
        <span class="bar-count">${r.count.toLocaleString()}</span>
      </div>`).join("");

    const warnHtml = d.warnings
      ? `<div style="background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.2);border-radius:10px;padding:14px;font-size:13px;color:#fda4af;line-height:1.8">
           ${d.warnings.slice(0,600)}${d.warnings.length>600?"…":""}
         </div>`
      : `<div style="color:var(--emerald);font-size:13px">✓ No major warnings in label.</div>`;

    document.getElementById("c-sideeff").innerHTML = `
      <div class="card gr" style="margin-bottom:14px">
        <div class="card-lbl">
          <span class="dot" style="background:var(--rose)"></span>
          Top ${reactions.length} Adverse Reactions — ${this.num(d.total_events)} total FDA reports
          <span class="tab-src src-fda">OpenFDA FAERS</span>
        </div>
        ${bars}
        <div style="margin-top:12px;display:flex;gap:14px;flex-wrap:wrap">
          <span style="font-size:11px;display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:linear-gradient(90deg,#f43f5e,#f97316);display:inline-block"></span>High severity</span>
          <span style="font-size:11px;display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:linear-gradient(90deg,#f59e0b,#eab308);display:inline-block"></span>Moderate</span>
          <span style="font-size:11px;display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:linear-gradient(90deg,#10b981,#06b6d4);display:inline-block"></span>Low severity</span>
        </div>
      </div>
      ${d.adverse_text ? `
      <div class="card" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--orange)"></span>Adverse Reactions — Official FDA Label<span class="tab-src src-dm">DailyMed</span></div>
        <div class="info-block">${d.adverse_text.slice(0,600)}${d.adverse_text.length>600?"…":""}</div>
      </div>` : ""}
      <div class="card gr">
        <div class="card-lbl"><span class="dot" style="background:var(--rose)"></span>FDA Label Warnings<span class="tab-src src-fda">FDA</span></div>
        ${warnHtml}
      </div>`;
  },

  // ── TREATMENT INFO ────────────────────────────────────
  treatment(d) {
    const sections = [
      { title: "💊 Indications & Usage",    text: d.purpose,           color: "var(--violet2)" },
      { title: "📏 Dosage & Administration", text: d.dosage,            color: "var(--cyan)" },
      { title: "🚫 Contraindications",       text: d.contraindications, color: "var(--orange)" },
      { title: "🤰 Pregnancy",               text: d.pregnancy,         color: "var(--fuchsia)" },
    ].filter(s => s.text && s.text.length > 20);

    const wikiHtml = d.wiki_extract ? `
      <div class="card" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--amber)"></span>Condition / Drug Overview<span class="tab-src src-wiki">Wikipedia</span></div>
        <div class="info-block">${d.wiki_extract.slice(0,800)}${d.wiki_extract.length>800?"…":""}</div>
        ${d.wiki_title ? `<div style="margin-top:8px;font-size:11px;color:var(--text3)">Read more: <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(d.wiki_title)}" target="_blank" style="color:var(--violet2)">Wikipedia — ${d.wiki_title}</a></div>` : ""}
      </div>` : "";

    const medlineHtml = (d.medline_links || []).length ? `
      <div class="card" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--violet2)"></span>MedlinePlus Health Articles<span class="tab-src src-ml">MedlinePlus</span></div>
        ${d.medline_links.map(l => `
          <div class="int-item">
            <a href="${l.url}" target="_blank" style="color:var(--violet2);text-decoration:none;font-weight:600">📄 ${l.title}</a>
            ${l.summary ? `<div style="font-size:12px;color:var(--text3);margin-top:3px">${this.clean(l.summary).slice(0,150)}</div>` : ""}
          </div>`).join("")}
      </div>` : "";

    const labelHtml = sections.map(s => `
      <div class="card" style="margin-bottom:12px">
        <div class="card-lbl"><span class="dot" style="background:${s.color}"></span>${s.title}<span class="tab-src src-dm">FDA Label</span></div>
        <div class="info-block">${s.text.slice(0,500)}${s.text.length>500?"…":""}</div>
      </div>`).join("");

    document.getElementById("c-treatment").innerHTML = wikiHtml + labelHtml + medlineHtml +
      (sections.length===0 && !d.wiki_extract
        ? `<div class="empty-state"><div class="empty-icon">🏥</div><div class="empty-title">Limited treatment info available</div><div class="empty-sub">Try exact generic name.</div></div>`
        : `<div class="disc">🏥 <span>Treatment information from FDA official labels, MedlinePlus, and Wikipedia.</span></div>`);
  },

  // ── TIMELINE ──────────────────────────────────────────
  timeline(d) {
    const colors = ["#d946ef","#06b6d4","#10b981","#f59e0b","#a78bfa","#f43f5e"];
    const tl = (d.timeline || []).map((t, i) => `
      <div class="tl-item">
        <div class="tl-node" style="border-color:${colors[i%colors.length]}">
          <div class="tl-inner" style="background:${colors[i%colors.length]}"></div>
        </div>
        <div>
          <div class="tl-week" style="color:${colors[i%colors.length]}">${t.week}</div>
          <div class="tl-desc">${t.desc}</div>
        </div>
      </div>`).join("");

    document.getElementById("c-timeline").innerHTML = `
      <div class="card gv" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--violet2)"></span>Recovery & Treatment Timeline<span class="tab-src src-wiki">Wiki+FDA</span></div>
        <div class="timeline" style="padding-left:8px">${tl || "<div style='color:var(--text3)'>No timeline data</div>"}</div>
      </div>
      ${d.wiki_extract ? `
      <div class="card">
        <div class="card-lbl"><span class="dot" style="background:var(--amber)"></span>Background Information<span class="tab-src src-wiki">Wikipedia</span></div>
        <div class="info-block">${d.wiki_extract.slice(0,600)}</div>
      </div>` : ""}
      <div class="disc">📅 <span>Timeline estimated from drug class, FDA label data, and medical literature. Individual response varies. Not medical advice.</span></div>`;
  },

  // ── INTERACTIONS ──────────────────────────────────────
  interact(d) {
    const list = d.interactions || [];
    if (!d.rxcui || d.rxcui === "N/A") {
      document.getElementById("c-interact").innerHTML = `
        <div class="empty-state"><div class="empty-icon">🔄</div>
          <div class="empty-title">No RxNorm match</div>
          <div class="empty-sub">Could not find this drug in RxNorm. Try exact generic name.</div>
        </div>`;
      return;
    }

    const intHtml = list.length ? list.map(i => `
      <div class="int-item">
        <div style="font-weight:600;color:var(--text);margin-bottom:4px">
          ${i.drug1} + ${i.drug2}
          <span class="int-severity sev-${
            i.severity.toLowerCase().includes("major")||i.severity.toLowerCase().includes("high") ? "high"
            : i.severity.toLowerCase().includes("minor")||i.severity.toLowerCase().includes("low") ? "low"
            : "med"}">
            ${i.severity}
          </span>
        </div>
        <div style="font-size:12px;color:var(--text2)">${i.description.slice(0,260)}</div>
      </div>`).join("")
      : `<div style="color:var(--emerald);padding:14px 0;font-size:13px">✓ No major drug interactions found in RxNorm database for this drug.</div>`;

    const relHtml = (d.related_drugs||[]).length ? `
      <div class="card" style="margin-top:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--indigo)"></span>Related Drugs (Same Class)<span class="tab-src src-rx">RxNorm</span></div>
        <div class="tag-grid">${d.related_drugs.slice(0,12).map(r=>`<span class="tag tb">${r}</span>`).join("")}</div>
      </div>` : "";

    document.getElementById("c-interact").innerHTML = `
      <div class="card gc" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--cyan)"></span>
          Drug Interactions — RxNorm (RxCUI: ${d.rxcui})
          <span class="tab-src src-rx">RxNorm</span>
        </div>
        ${intHtml}
      </div>
      ${relHtml}
      ${d.interactions_text ? `
      <div class="card" style="margin-top:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--amber)"></span>FDA Label — Drug Interactions<span class="tab-src src-fda">FDA</span></div>
        <div class="info-block">${d.interactions_text.slice(0,500)}${d.interactions_text.length>500?"…":""}</div>
      </div>` : ""}
      <div class="disc">🔄 <span>Interaction data from RxNorm (NIH). Always inform your doctor of ALL medications including supplements.</span></div>`;
  },

  // ── DRUG LABEL ────────────────────────────────────────
  label(d) {
    const daily = d.dailymed_drugs || [];
    const dailyHtml = daily.length ? `
      <div class="card gc" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--cyan)"></span>DailyMed Entries<span class="tab-src src-dm">DailyMed</span></div>
        ${daily.map(dr => `
          <div class="int-item">
            <a href="https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${dr.setid}" target="_blank" style="color:var(--cyan);font-weight:600;text-decoration:none">
              📋 ${dr.name}
            </a>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">Click to view full prescribing info on DailyMed →</div>
          </div>`).join("")}
      </div>` : "";

    const sections = [
      { title:"💊 Indications & Usage",    text:d.purpose,            color:"var(--violet2)" },
      { title:"📏 Dosage",                 text:d.dosage,             color:"var(--cyan)" },
      { title:"⚠️ Warnings",               text:d.warnings,           color:"var(--rose)" },
      { title:"🚫 Contraindications",      text:d.contraindications,  color:"var(--orange)" },
      { title:"🔄 Drug Interactions",      text:d.interactions_text,  color:"var(--amber)" },
      { title:"🤰 Pregnancy",              text:d.pregnancy,          color:"var(--fuchsia)" },
      { title:"💊 Adverse Reactions",      text:d.adverse_text,       color:"var(--rose)" },
    ].filter(s => s.text && s.text.length > 20);

    if (!sections.length && !daily.length) {
      document.getElementById("c-label").innerHTML = `
        <div class="empty-state"><div class="empty-icon">📋</div>
          <div class="empty-title">No label found</div>
          <div class="empty-sub">Try exact generic name like "metformin hydrochloride".</div>
        </div>`;
      return;
    }

    document.getElementById("c-label").innerHTML = dailyHtml +
      `<div class="card" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--emerald)"></span>Official FDA Label — ${d.brand_name}<span class="tab-src src-fda">OpenFDA</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <span class="mbadge">Generic: ${d.generic_name}</span>
          <span class="mbadge">Brand: ${d.brand_name}</span>
          <span class="mbadge">Mfr: ${(d.manufacturer||"").slice(0,30)}</span>
        </div>
      </div>` +
      sections.map(s => `
        <div class="card" style="margin-bottom:10px">
          <div class="card-lbl"><span class="dot" style="background:${s.color}"></span>${s.title}<span class="tab-src src-dm">FDA</span></div>
          <div class="info-block">${s.text.slice(0,500)}${s.text.length>500?"…":""}</div>
        </div>`).join("") +
      `<div class="disc">📋 <span>Source: OpenFDA Drug Label API + DailyMed (NIH). All data from official FDA submissions.</span></div>`;
  },

  // ── COST ──────────────────────────────────────────────
  cost(d) {
    const c = d.cost || { brand_usd:60, gen_usd:12, brand_inr:4980, gen_inr:996 };
    const sav = Math.round(((c.brand_usd - c.gen_usd) / c.brand_usd) * 100);

    document.getElementById("c-cost").innerHTML = `
      <div class="card gl" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(132,204,22,0.08),rgba(16,185,129,0.06))">
        <div class="card-lbl"><span class="dot" style="background:var(--lime)"></span>Cost & Affordability — ${d.brand_name}</div>
        <div style="font-size:13px;color:var(--text2)">Monthly cost estimates. Always verify with GoodRx.com (USA) or local chemist (India).</div>
      </div>

      <div class="grid4">
        <div class="card gr" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--rose)"></span>Brand/month</div>
          <div class="price-big" style="color:var(--rose)">$${c.brand_usd}</div>
          <div class="price-sub">USD</div>
          <div class="price-inr" style="color:var(--rose)">₹${c.brand_inr.toLocaleString()}</div>
        </div>
        <div class="card ge" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--emerald)"></span>Generic/month</div>
          <div class="price-big" style="color:var(--emerald)">$${c.gen_usd}</div>
          <div class="price-sub">USD</div>
          <div class="price-inr" style="color:var(--emerald)">₹${c.gen_inr.toLocaleString()}</div>
        </div>
        <div class="card ga" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--amber)"></span>Annual (generic)</div>
          <div class="price-big" style="color:var(--amber)">$${c.gen_usd * 12}</div>
          <div class="price-sub">USD/year</div>
          <div class="price-inr" style="color:var(--amber)">₹${(c.gen_inr * 12).toLocaleString()}</div>
        </div>
        <div class="card gl" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--lime)"></span>You save</div>
          <div class="price-big" style="color:var(--lime)">${sav}%</div>
          <div class="price-sub">with generic</div>
          <div class="price-inr" style="color:var(--lime)">₹${(c.brand_inr - c.gen_inr).toLocaleString()}/mo</div>
        </div>
      </div>

      <div class="grid2">
        <div class="cost-card-b">
          <span class="cbadge cbadge-b">Brand Name</span>
          <div style="font-family:'Clash Display',sans-serif;font-size:18px;font-weight:700;color:var(--rose);margin-bottom:5px">${d.brand_name}</div>
          <div style="font-size:13px;color:var(--text2)">Monthly: <b style="color:var(--rose)">$${c.brand_usd}</b> · ₹${c.brand_inr.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:5px">Annual: $${c.brand_usd*12} · ₹${(c.brand_inr*12).toLocaleString()}</div>
        </div>
        <div class="cost-card-g">
          <span class="cbadge cbadge-g">Generic Version</span>
          <div style="font-family:'Clash Display',sans-serif;font-size:18px;font-weight:700;color:var(--emerald);margin-bottom:5px">${d.generic_name}</div>
          <div style="font-size:13px;color:var(--text2)">Monthly: <b style="color:var(--emerald)">$${c.gen_usd}</b> · ₹${c.gen_inr.toLocaleString()}</div>
          <div style="margin-top:10px;padding:7px 12px;border-radius:8px;background:rgba(132,204,22,0.1);border:1px solid rgba(132,204,22,0.25);font-size:12px;font-weight:600;color:var(--lime)">
            💚 Generic saves ${sav}% vs brand
          </div>
        </div>
      </div>
      <div class="disc">💡 <span>Prices are estimates. Check <b>GoodRx.com</b> for USA prices. Generic = same active ingredient at lower cost.</span></div>`;
  },

  // ── COMPARE ───────────────────────────────────────────
  compare(cmp) {
    const dA = cmp.drug_a;
    const dB = cmp.drug_b;

    function row(l, va, vb) {
      return `<div class="cmp-row">
        <span style="font-size:12px;color:var(--text3)">${l}</span>
        <span style="font-size:13px;font-weight:600;color:var(--violet2)">${va}</span>
        <span style="font-size:13px;font-weight:600;color:var(--cyan)">${vb}</span>
      </div>`;
    }

    const topA = (dA.top_reactions||[]).slice(0,4).map(r=>`<span class="tag tm">${r.name}</span>`).join("");
    const topB = (dB.top_reactions||[]).slice(0,4).map(r=>`<span class="tag tb">${r.name}</span>`).join("");

    document.getElementById("c-compare").innerHTML = `
      <div class="cmp-card" style="max-width:800px;margin:0 auto">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:12px">
          <div></div>
          <div style="font-family:'Clash Display',sans-serif;font-weight:700;color:var(--violet2);text-align:right;padding-right:10px">${dA.brand_name}</div>
          <div style="font-family:'Clash Display',sans-serif;font-weight:700;color:var(--cyan);text-align:right">${dB.brand_name}</div>
        </div>
        ${row("FDA Reports", (dA.total_events||0).toLocaleString(), (dB.total_events||0).toLocaleString())}
        ${row("Unique Reactions", (dA.top_reactions?.length||0), (dB.top_reactions?.length||0))}
        ${row("Generic/mo (USD)", "$"+(dA.cost?.gen_usd||"?"), "$"+(dB.cost?.gen_usd||"?"))}
        ${row("Generic/mo (INR)", "₹"+(dA.cost?.gen_inr||"?"), "₹"+(dB.cost?.gen_inr||"?"))}
        ${row("Interactions Found", (dA.interactions?.length||0), (dB.interactions?.length||0))}
        
        <div class="grid2" style="margin-top:20px;gap:20px">
          <div>
            <div class="card-lbl" style="font-size:11px"><span class="dot" style="background:var(--violet)"></span>${dA.brand_name} top reactions</div>
            <div class="tag-grid">${topA || '<span style="color:var(--text3)">No data</span>'}</div>
          </div>
          <div>
            <div class="card-lbl" style="font-size:11px"><span class="dot" style="background:var(--cyan)"></span>${dB.brand_name} top reactions</div>
            <div class="tag-grid">${topB || '<span style="color:var(--text3)">No data</span>'}</div>
          </div>
        </div>
      </div>`;
  },

  // ── COMPARE CONDITIONS ────────────────────────────────
  compareConditions(cmp) {
    const cA = cmp.drug_a;
    const cB = cmp.drug_b;

    function row(l, va, vb) {
      return `<div class="cmp-row">
        <span style="font-size:12px;color:var(--text3)">${l}</span>
        <span style="font-size:13px;font-weight:600;color:var(--teal)">${va}</span>
        <span style="font-size:13px;font-weight:600;color:var(--plasma)">${vb}</span>
      </div>`;
    }

    const medsA = (cA.medicines||[]).map(m=>`<span class="tag tm">${m}</span>`).join("") || '<span style="color:var(--text3)">N/A</span>';
    const medsB = (cB.medicines||[]).map(m=>`<span class="tag tb">${m}</span>`).join("") || '<span style="color:var(--text3)">N/A</span>';

    const tlA = (cA.timeline||[]).map(t=>`<div style="font-size:12px;margin-bottom:4px"><span style="color:var(--teal);font-weight:600;font-family:'JetBrains Mono'">${t.week}</span> — ${t.desc}</div>`).join("") || "N/A";
    const tlB = (cB.timeline||[]).map(t=>`<div style="font-size:12px;margin-bottom:4px"><span style="color:var(--plasma);font-weight:600;font-family:'JetBrains Mono'">${t.week}</span> — ${t.desc}</div>`).join("") || "N/A";

    document.getElementById("c-compare").innerHTML = `
      <div class="cmp-card" style="max-width:850px;margin:0 auto">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:12px">
          <div></div>
          <div style="font-family:'Clash Display',sans-serif;font-weight:700;color:var(--teal);text-align:right;padding-right:10px">${cA.name || "Condition A"}</div>
          <div style="font-family:'Clash Display',sans-serif;font-weight:700;color:var(--plasma);text-align:right">${cB.name || "Condition B"}</div>
        </div>
        ${row("Type", "\ud83e\ude7a Condition", "\ud83e\ude7a Condition")}
        ${row("Medicines Count", (cA.medicines||[]).length, (cB.medicines||[]).length)}
        ${row("Cost Estimate", cA.cost_estimate || "Varies", cB.cost_estimate || "Varies")}
        ${row("Timeline Phases", (cA.timeline||[]).length, (cB.timeline||[]).length)}
        
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)">
          <div class="card-lbl" style="font-size:11px;margin-bottom:10px"><span class="dot" style="background:var(--rose)"></span>Complications Comparison</div>
          <div class="grid2" style="gap:16px">
            <div class="info-block" style="border-left:3px solid var(--teal)">${(cA.complications||"No data available.").slice(0,300)}</div>
            <div class="info-block" style="border-left:3px solid var(--plasma)">${(cB.complications||"No data available.").slice(0,300)}</div>
          </div>
        </div>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)">
          <div class="card-lbl" style="font-size:11px;margin-bottom:10px"><span class="dot" style="background:var(--cyan)"></span>Prescribed Medicines</div>
          <div class="grid2" style="gap:16px">
            <div><div class="tag-grid">${medsA}</div></div>
            <div><div class="tag-grid">${medsB}</div></div>
          </div>
        </div>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)">
          <div class="card-lbl" style="font-size:11px;margin-bottom:10px"><span class="dot" style="background:var(--violet2)"></span>Recovery Timeline</div>
          <div class="grid2" style="gap:16px">
            <div style="color:var(--text2)">${tlA}</div>
            <div style="color:var(--text2)">${tlB}</div>
          </div>
        </div>
      </div>
      <div class="disc" style="margin-top:14px">\ud83e\ude7a <span>Condition data sourced from Wikipedia, MoHFW, and internal databases. Individual cases may vary \u2014 consult a physician.</span></div>`;
  },

  // ── COMPARE MIXED (drug vs condition) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  compareMixed(cmp) {
    const dA = cmp.drug_a;
    const dB = cmp.drug_b;

    function row(l, va, vb) {
      return `<div class="cmp-row">
        <span style="font-size:12px;color:var(--text3)">${l}</span>
        <span style="font-size:13px;font-weight:600;color:var(--teal)">${va}</span>
        <span style="font-size:13px;font-weight:600;color:var(--plasma)">${vb}</span>
      </div>`;
    }

    const nameA = dA.type === 'condition' ? (dA.name || 'Condition') : (dA.brand_name || dA.drug || 'Drug');
    const nameB = dB.type === 'condition' ? (dB.name || 'Condition') : (dB.brand_name || dB.drug || 'Drug');
    const typeA = dA.type === 'condition' ? '\ud83e\ude7a Condition' : '\ud83d\udc8a Drug';
    const typeB = dB.type === 'condition' ? '\ud83e\ude7a Condition' : '\ud83d\udc8a Drug';

    const costA = dA.type === 'condition' ? (dA.cost_estimate || 'Varies') : ('$'+(dA.cost?.gen_usd||'?')+' / \u20b9'+(dA.cost?.gen_inr||'?')+' /mo');
    const costB = dB.type === 'condition' ? (dB.cost_estimate || 'Varies') : ('$'+(dB.cost?.gen_usd||'?')+' / \u20b9'+(dB.cost?.gen_inr||'?')+' /mo');

    const wikiA = (dA.wiki_extract || 'No overview.').slice(0,250);
    const wikiB = (dB.wiki_extract || 'No overview.').slice(0,250);

    document.getElementById("c-compare").innerHTML = `
      <div class="cmp-card" style="max-width:850px;margin:0 auto">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:12px">
          <div></div>
          <div style="font-family:'Clash Display',sans-serif;font-weight:700;color:var(--teal);text-align:right;padding-right:10px">${nameA}</div>
          <div style="font-family:'Clash Display',sans-serif;font-weight:700;color:var(--plasma);text-align:right">${nameB}</div>
        </div>
        ${row("Type", typeA, typeB)}
        ${row("Cost", costA, costB)}
        ${row("Timeline Phases", (dA.timeline||[]).length, (dB.timeline||[]).length)}
        
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)">
          <div class="card-lbl" style="font-size:11px;margin-bottom:10px"><span class="dot" style="background:var(--amber)"></span>Overview</div>
          <div class="grid2" style="gap:16px">
            <div class="info-block" style="border-left:3px solid var(--teal)">${wikiA}</div>
            <div class="info-block" style="border-left:3px solid var(--plasma)">${wikiB}</div>
          </div>
        </div>
      </div>
      <div class="disc" style="margin-top:14px">\u2696\ufe0f <span>Mixed comparison \u2014 one entry is a drug, the other a condition. Data from multiple medical sources.</span></div>`;
  },

  // ── REPORT ────────────────────────────────────────────
  report(d) {
    const dt = new Date().toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" });
    
    let infoHtml = "";
    if (d.type === 'condition') {
      infoHtml = `
      <div class="rep-sec">
        <div class="rep-sec-title">Condition Information</div>
        <div class="rep-item"><span class="rep-bul">▸</span><span style="color:var(--text3);min-width:160px;display:inline-block">Name:</span><span>${d.name}</span></div>
        <div class="rep-item"><span class="rep-bul">▸</span><span style="color:var(--text3);min-width:160px;display:inline-block">Cost Estimate:</span><span>${d.cost_estimate}</span></div>
      </div>
      <div class="rep-sec"><div class="rep-sec-title">Complications</div><div style="font-size:13px;line-height:1.8">${d.complications}</div></div>
      <div class="rep-sec"><div class="rep-sec-title">MoHFW Guidelines</div><div style="font-size:13px;line-height:1.8">${d.mohfw_guidelines}</div></div>
      <div class="rep-sec">
        <div class="rep-sec-title">Recovery Timeline</div>
        ${(d.timeline||[]).map(t=>`<div class="rep-item"><span class="rep-bul">▸</span><span style="color:var(--violet2);min-width:120px;display:inline-block;font-family:'JetBrains Mono'">${t.week}</span><span>${t.desc}</span></div>`).join("")}
      </div>`;
    } else {
      infoHtml = `
      <div class="rep-sec">
        <div class="rep-sec-title">Drug Information</div>
        ${[["Brand Name",d.brand_name],["Generic Name",d.generic_name],["Manufacturer",d.manufacturer||"Unknown"],["RxCUI",d.rxcui||"N/A"],["Total FDA Reports",(d.total_events||0).toLocaleString()]].map(([l,v])=>`<div class="rep-item"><span class="rep-bul">▸</span><span style="color:var(--text3);min-width:160px;display:inline-block">${l}:</span><span>${v}</span></div>`).join("")}
      </div>
      ${d.purpose ? `<div class="rep-sec"><div class="rep-sec-title">Indications</div><div style="font-size:13px;line-height:1.8;color:var(--text2)">${d.purpose.slice(0,400)}</div></div>` : ""}
      <div class="rep-sec">
        <div class="rep-sec-title">Top Adverse Reactions</div>
        ${(d.top_reactions||[]).slice(0,10).map(r=>`<div class="rep-item"><span class="rep-bul">▸</span><span style="min-width:200px;display:inline-block">${r.name}</span><span style="color:var(--text3)">${r.count.toLocaleString()} reports · severity: ${r.severity}</span></div>`).join("")}
      </div>
      <div class="rep-sec">
        <div class="rep-sec-title">Recovery Timeline</div>
        ${(d.timeline||[]).map(t=>`<div class="rep-item"><span class="rep-bul">▸</span><span style="color:var(--violet2);min-width:120px;display:inline-block;font-family:'JetBrains Mono'">${t.week}</span><span>${t.desc}</span></div>`).join("")}
      </div>
      <div class="rep-sec">
        <div class="rep-sec-title">Cost Estimates</div>
        ${[["Generic/month USD","$"+(d.cost?.gen_usd||"N/A")],["Generic/month INR","₹"+(d.cost?.gen_inr||"N/A")],["Brand/month USD","$"+(d.cost?.brand_usd||"N/A")],["Brand/month INR","₹"+(d.cost?.brand_inr||"N/A")]].map(([l,v])=>`<div class="rep-item"><span class="rep-bul">▸</span><span style="color:var(--text3);min-width:200px;display:inline-block">${l}:</span><span>${v}</span></div>`).join("")}
      </div>`;
    }

    document.getElementById("c-report").innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        <button class="btn-primary" onclick="window.print()">🖨️ Print / PDF</button>
        <button class="btn-outline" onclick="App.copyReport()">📋 Copy Text</button>
        <button class="btn-outline" onclick="App.downloadJSON()">💾 Download JSON</button>
      </div>
      <div class="report-preview">
        <div class="rep-hdr">
          <div class="rep-title">Intelligence Report — ${d.brand_name || d.name}</div>
          <div class="rep-sub">Generated: ${dt} · Sources: OpenFDA, RxNorm, MedlinePlus, DailyMed, Wikipedia, MoHFW · MediPulse Platform</div>
        </div>
        <div class="rep-body">
          ${infoHtml}
          <div style="margin-top:20px;padding:12px;background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);border-radius:10px;font-size:11px;color:#fcd34d;line-height:1.7">
            ⚕ Data sources: OpenFDA · RxNorm · MedlinePlus · DailyMed · Wikipedia · MoHFW. For educational use only. Not medical advice.
          </div>
        </div>
      </div>`;
  },

  // ── LOADING ───────────────────────────────────────────
  showLoad(id) {
    const steps = [
      "📡 Querying OpenFDA adverse events…",
      "🔬 Loading RxNorm drug interactions…",
      "🏥 Fetching MedlinePlus treatment info…",
      "📋 Retrieving DailyMed drug labels…",
      "📖 Getting Wikipedia condition data…",
      "⚙️ Processing all 5 data sources…"
    ];
    document.getElementById(id).innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <div>${steps.map((s,i)=>`<div class="lstep" id="ls${i}">${s}</div>`).join("")}</div>
      </div>`;
    let i = 0;
    return setInterval(() => {
      document.querySelectorAll(".lstep").forEach(e => e.classList.remove("on"));
      const e = document.getElementById("ls" + i);
      if (e) e.classList.add("on");
      i = (i + 1) % steps.length;
    }, 750);
  },

  error(id, message) {
    document.getElementById(id).innerHTML = `
      <div class="error-box">
        <div style="font-size:20px;margin-bottom:10px">⚠️</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">Error loading data</div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:12px">${message}</div>
        <div style="background:#1c2238;border-radius:10px;padding:12px 16px;margin-bottom:14px;text-align:left;font-size:12px;line-height:2;color:#c8b8e8">
          <div style="font-weight:700;color:#a78bfa;margin-bottom:4px">Make sure backend is running:</div>
          <div>1. Open a terminal in the <b>backend/</b> folder</div>
          <div>2. Run: <code style="color:#e040fb">python -m uvicorn main:app --reload --port 8000</code></div>
        </div>
        <button class="btn-primary" onclick="App.analyze()" style="font-size:12px;padding:8px 18px">Try Again</button>
      </div>`;
  },

  // ── CONDITION-SPECIFIC RENDERS ───────────────────────
  overviewCondition(d) {
    document.getElementById("c-overview").innerHTML = `
      <div class="sum-hero">
        <div class="sum-title">🩺 ${d.name}</div>
        <div class="sum-meta">
          <span class="mbadge">🇮🇳 MoHFW Analyzed</span>
        </div>
        <div class="sum-text">${d.wiki_extract || "Condition overview not found."}</div>
        ${d.wiki_title ? `<div style="margin-top:8px;font-size:10px;color:var(--text3)">📖 Wikipedia — ${d.wiki_title}</div>` : ""}
      </div>
      
      <div class="grid4" style="margin-bottom:14px">
        <div class="card gl" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--lime)"></span>Cost Estimate<span class="tab-src src-rx">India</span></div>
          <div class="stat-num" style="color:var(--lime);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${d.cost_estimate}">${d.cost_estimate || "Varies"}</div>
        </div>
        <div class="card gc" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--cyan)"></span>Medicines<span class="tab-src src-wiki">Common</span></div>
          <div class="stat-num" style="color:var(--cyan)">${(d.medicines||[]).length}</div>
          <div class="stat-lbl">prescribed</div>
        </div>
        <div class="card gv" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--violet2)"></span>Timeline<span class="tab-src src-wiki">Wiki</span></div>
          <div class="stat-num" style="color:var(--violet2)">${(d.timeline||[]).length}</div>
          <div class="stat-lbl">recovery phases</div>
        </div>
        <div class="card ga" style="text-align:center;padding:18px">
          <div class="card-lbl" style="justify-content:center"><span class="dot" style="background:var(--amber)"></span>Articles<span class="tab-src src-ml">Medline</span></div>
          <div class="stat-num" style="color:var(--amber)">${(d.medline_links||[]).length}</div>
          <div class="stat-lbl">resources</div>
        </div>
      </div>
      
      <div class="grid2">
        <div class="card gr" style="cursor:pointer" onclick="App.tab('complications')">
          <div class="card-lbl"><span class="dot" style="background:var(--rose)"></span>Complications Preview</div>
          <div class="info-block">${d.complications.slice(0, 150)}...</div>
          <div style="font-size:11px;color:var(--text3);margin-top:10px">→ More info in Complications tab</div>
        </div>
        <div class="card gc" style="cursor:pointer" onclick="App.tab('treatment')">
          <div class="card-lbl"><span class="dot" style="background:var(--cyan)"></span>Treatment & Therapies</div>
          <div class="info-block">${(d.medicines||[]).join(", ") || "General therapy and resources available in the Treatment tab."}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:10px">→ View clinical resources in Treatment</div>
        </div>
      </div>`;
  },
  complications(d) {
    document.getElementById("c-complications").innerHTML = `
      <div class="card gr" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--rose)"></span>If Left Untreated</div>
        <div class="info-block" style="font-size:15px;line-height:1.7;color:var(--text);padding:10px">${d.complications}</div>
      </div>`;
  },
  treatmentCondition(d) {
    const medlineHtml = (d.medline_links || []).length ? `
      <div class="card" style="margin-top:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--violet2)"></span>Official Therapy & Health Articles<span class="tab-src src-ml">MedlinePlus</span></div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.6">Official lifestyle modifications, therapies, and clinical guides prescribed for this condition:</div>
        ${d.medline_links.map(l => `
          <div class="int-item">
            <a href="${l.url}" target="_blank" style="color:var(--violet2);text-decoration:none;font-weight:600">📄 ${l.title}</a>
            ${l.summary ? `<div style="font-size:12px;color:var(--text3);margin-top:3px">${Render.clean(l.summary).slice(0,180)}</div>` : ""}
          </div>`).join("")}
      </div>` : `
      <div class="card" style="margin-top:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--violet2)"></span>Therapy Recommendations</div>
        <div class="info-block">Non-medicinal therapies generally include physical therapy, lifestyle modifications, and dietary improvements. Consult a healthcare provider for personalized therapies.</div>
      </div>`;

    document.getElementById("c-treatment").innerHTML = `
      <div class="card">
        <div class="card-lbl"><span class="dot" style="background:var(--cyan)"></span>Commonly Prescribed Medicines</div>
        ${(d.medicines||[]).length 
          ? `<div class="tag-grid">${d.medicines.map(m=>`<span class="tag tm" onclick="App.quick('${m.toLowerCase()}')" style="cursor:pointer">${m}</span>`).join("")}</div>
             <div style="font-size:12px;color:var(--text3);margin-top:10px">Click any medicine to view detailed drug information.</div>`
          : `<div class="info-block" style="color:var(--text2)">Specific pharmaceutical interventions dictate therapy. View MedlinePlus resources below.</div>`}
      </div>
      ${medlineHtml}`;
  },
  costCondition(d) {
    document.getElementById("c-cost").innerHTML = `
      <div class="card gl" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--lime)"></span>Estimated Treatment Cost (India)</div>
        <div style="padding:24px;text-align:center">
          <div style="font-family:'Clash Display',sans-serif;font-size:32px;color:var(--lime);font-weight:700">${d.cost_estimate}</div>
          <div style="color:var(--text2);margin-top:10px">Estimated monthly output based on common generics.</div>
        </div>
      </div>`;
  },
  mohfwCondition(d) {
    document.getElementById("c-mohfw").innerHTML = `
      <div class="card ga" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--amber)"></span>🇮🇳 MoHFW National Health Guidelines</div>
        <div class="info-block" style="font-size:15px;line-height:1.7;padding:15px">${d.mohfw_guidelines}</div>
      </div>`;
  },
  mohfwDrug(d) {
    const md = d.mohfw_guidelines || {};
    document.getElementById("c-mohfw").innerHTML = `
      <div class="card ga" style="margin-bottom:14px">
        <div class="card-lbl"><span class="dot" style="background:var(--amber)"></span>🇮🇳 Indian NLEM / MoHFW Status</div>
        <div class="grid2" style="margin-bottom:15px">
          <div style="padding:15px;background:rgba(255,255,255,0.03);border-radius:8px">
            <div style="font-size:12px;color:var(--text3);margin-bottom:5px">Essential Medicine (NLEM 2022)</div>
            <div style="color:${md.nlem ? 'var(--emerald)':'var(--rose)'};font-weight:600;font-size:16px">${md.nlem ? '✅ Yes' : '❌ No'}</div>
          </div>
          <div style="padding:15px;background:rgba(255,255,255,0.03);border-radius:8px">
            <div style="font-size:12px;color:var(--text3);margin-bottom:5px">Drug Schedule</div>
            <div style="color:var(--cyan);font-weight:600;font-size:16px">📄 ${md.schedule}</div>
          </div>
        </div>
        <div class="info-block" style="font-size:14px;border-left:3px solid var(--amber)">
          <b>MoHFW / CDSCO Alert:</b><br/>${md.alert || "No special Indian alert."}
        </div>
      </div>`;
  }
};
