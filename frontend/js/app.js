/**
 * MediPulse — app.js
 * Main application controller.
 */

const App = {
  data: null,
  loadTimer: null,
  currentLang: 'en',

  // ── Init ─────────────────────────────────────────────
  async init() {
    // Check backend health
    try {
      const h = await ApiService.health();
      document.getElementById("beDot").style.background = "#10b981";
      document.getElementById("beText").textContent = "Backend online ✓";
      document.getElementById("backendStatus").classList.add("online");
    } catch {
      document.getElementById("beDot").style.background = "#f43f5e";
      document.getElementById("beText").textContent = "Backend offline — start Python server";
      document.getElementById("backendStatus").classList.add("offline");
    }

    // Enter key to search
    document.getElementById("q").addEventListener("keydown", e => {
      if (e.key === "Enter") App.analyze();
    });
  },

  // ── Tab switch ────────────────────────────────────────
  tab(name) {
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("p-" + name).classList.add("active");
    document.getElementById("t-" + name).classList.add("active");
  },

  quick(q) {
    document.getElementById("q").value = q;
    this.analyze();
  },

  // ── Theme & Language Actions ──────────────────────────
  toggleTheme() {
    const isLight = document.documentElement.classList.toggle('light-theme');
    document.getElementById('themeIcon').textContent = isLight ? '☀️' : '🌙';
  },

  toggleLangMenu() {
    document.getElementById('langMenu').classList.toggle('show');
  },

  setLang(code) {
    const opt = document.querySelector(`.lang-opt[data-lang="${code}"]`);
    if (!opt) return;

    document.querySelectorAll('.lang-opt').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    
    // Update button text and flag
    const flag = opt.querySelector('span').textContent;
    document.getElementById('langFlag').textContent = flag;
    document.getElementById('langLabel').textContent = code.toUpperCase();
    
    // Hide menu
    document.getElementById('langMenu').classList.remove('show');
    
    if (this.currentLang !== code) {
      this.currentLang = code;
      this.translatePage();
    }
  },
    
  async translatePage() {
    if (this.currentLang === 'en') {
      // Reload is simplest to revert static english content
      window.location.reload();
      return;
    }

    const els = document.querySelectorAll("h1, h2, h3, h4, p, .hero-sub, .sum-text, .tl-desc, .feat-desc, .hiw-desc, .empty-sub, .info-block b, .info-block span, .int-item, .rep-item, .card-lbl, .tab-btn, .footer-tagline");
    const nodes = [];
    const texts = [];

    els.forEach(el => {
      const txt = el.innerHTML.trim();
      if (txt && el.getAttribute('data-lang') !== this.currentLang) {
        nodes.push(el);
        texts.push(txt);
      }
    });

    if (texts.length === 0) return;

    try {
      const btn = document.getElementById("langLabel");
      const oldTxt = btn.textContent;
      btn.textContent = "Translating…";

      const res = await ApiService.translate(texts, this.currentLang);
      const translated = res.translations;

      if (translated && translated.length === nodes.length) {
        for (let i = 0; i < nodes.length; i++) {
          nodes[i].innerHTML = translated[i];
          nodes[i].setAttribute('data-lang', this.currentLang);
        }
      }
      btn.textContent = oldTxt;
    } catch (e) {
      console.error("Translation fail:", e);
      document.getElementById("langLabel").textContent = "Error";
    }
  },

  // ── Main analyze ──────────────────────────────────────
  async analyze() {
    const q = document.getElementById("q").value.trim();
    if (!q) return;

    const btn = document.getElementById("srchBtn");
    btn.disabled = true;
    btn.textContent = "Loading…";

    // Show loader
    clearInterval(this.loadTimer);
    this.loadTimer = Render.showLoad("c-overview");
    this.tab("overview");

    try {
      const data = await ApiService.analyze(q);
      clearInterval(this.loadTimer);
      this.data = data;

      if (data.type === 'condition') {
        document.getElementById('t-sideeff').style.display = 'none';
        document.getElementById('t-label').style.display = 'none';
        document.getElementById('t-interact').style.display = 'none';
        document.getElementById('t-complications').style.display = 'inline-block';
        
        Render.overviewCondition(data);
        Render.complications(data);
        Render.treatmentCondition(data);
        Render.timeline(data);
        Render.costCondition(data);
        Render.mohfwCondition(data);
      } else {
        document.getElementById('t-sideeff').style.display = 'inline-block';
        document.getElementById('t-label').style.display = 'inline-block';
        document.getElementById('t-interact').style.display = 'inline-block';
        document.getElementById('t-complications').style.display = 'none';

        Render.overview(data);
        Render.sideeff(data);
        Render.treatment(data);
        Render.timeline(data);
        Render.interact(data);
        Render.label(data);
        Render.cost(data);
        Render.mohfwDrug(data);
      }

      Render.report(data);

      if (this.currentLang !== 'en') {
        this.translatePage();
      }

    } catch (e) {
      clearInterval(this.loadTimer);
      Render.error("c-overview", e.message);
    }

    btn.disabled = false;
    btn.textContent = "Search All DBs →";
  },

  // ── Compare ───────────────────────────────────────────
  async doCompare() {
    const a = document.getElementById("cmpA").value.trim();
    const b = document.getElementById("cmpB").value.trim();
    if (!a || !b) return;

    const btn = document.getElementById("cmpBtn");
    btn.disabled = true;
    btn.textContent = "Comparing…";
    clearInterval(this.loadTimer);
    this.loadTimer = Render.showLoad("c-compare");

    try {
      const cmp = await ApiService.compare(a, b);
      clearInterval(this.loadTimer);

      const typeA = cmp.drug_a?.type || 'drug';
      const typeB = cmp.drug_b?.type || 'drug';

      if (typeA === 'condition' && typeB === 'condition') {
        Render.compareConditions(cmp);
      } else if (typeA === 'condition' || typeB === 'condition') {
        Render.compareMixed(cmp);
      } else {
        Render.compare(cmp);
      }
      
      if (this.currentLang !== 'en') {
        this.translatePage();
      }
    } catch (e) {
      clearInterval(this.loadTimer);
      Render.error("c-compare", e.message);
    }

    btn.disabled = false;
    btn.textContent = "Compare →";
  },

  // ── Export ────────────────────────────────────────────
  copyReport() {
    if (!this.data) return;
    const d = this.data;
    const txt = `MEDIPULSE REPORT — ${d.brand_name} (${d.generic_name})
Generated: ${new Date().toLocaleDateString()} | Sources: OpenFDA, RxNorm, MedlinePlus, DailyMed, Wikipedia

FDA Adverse Reports: ${(d.total_events||0).toLocaleString()}
Drug Interactions: ${(d.interactions||[]).length}
RxCUI: ${d.rxcui || "N/A"}

TOP ADVERSE REACTIONS:
${(d.top_reactions||[]).slice(0,10).map(r => `- ${r.name}: ${r.count.toLocaleString()} reports (${r.severity})`).join("\n")}

RECOVERY TIMELINE:
${(d.timeline||[]).map(t => `- ${t.week}: ${t.desc}`).join("\n")}

DRUG INTERACTIONS:
${(d.interactions||[]).length ? d.interactions.slice(0,5).map(i=>`- ${i.drug1} + ${i.drug2}: ${i.severity}`).join("\n") : "No major interactions found"}

COST ESTIMATES:
- Generic/month: $${d.cost?.gen_usd || "N/A"} / ₹${d.cost?.gen_inr || "N/A"}
- Brand/month:   $${d.cost?.brand_usd || "N/A"} / ₹${d.cost?.brand_inr || "N/A"}

Not medical advice. Consult a licensed healthcare professional.`;
    navigator.clipboard.writeText(txt).then(() => alert("Report copied to clipboard!"));
  },

  downloadJSON() {
    if (!this.data) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(this.data, null, 2)], { type: "application/json" }));
    a.download = `medipulse_${(this.data.drug || this.data.name).replace(/\s+/g,"_")}.json`;
    a.click();
  }
};

// Start app on load
window.addEventListener("DOMContentLoaded", () => App.init());
