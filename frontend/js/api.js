/**
 * MediPulse — api.js
 * Handles all communication with the Python FastAPI backend.
 * Backend runs on http://localhost:8000
 */

const API_BASE = "http://localhost:8000";

const ApiService = {

  // ── Health check ─────────────────────────────────────
  async health() {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    return res.json();
  },

  // ── Main analyze — queries all 5 databases ───────────
  async analyze(drug) {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drug })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: HTTP ${res.status}`);
    }
    return res.json();
  },

  // ── Compare two drugs ────────────────────────────────
  async compare(drug_a, drug_b) {
    const res = await fetch(`${API_BASE}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drug_a, drug_b })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: HTTP ${res.status}`);
    }
    return res.json();
  },

  // ── Translate elements ───────────────────────────────
  async translate(texts, target_lang) {
    const res = await fetch(`${API_BASE}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, target_lang })
    });
    if (!res.ok) {
        throw new Error(`Server error: HTTP ${res.status}`);
    }
    return res.json();
  }
};
