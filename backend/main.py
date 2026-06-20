# ═══════════════════════════════════════════════════════════
# MediPulse — main.py
# FastAPI backend — queries 5 free medical databases
#
# Databases:
#   1. OpenFDA      — adverse events, drug labels
#   2. RxNorm       — drug interactions, related drugs
#   3. MedlinePlus  — health articles, treatment info
#   4. DailyMed     — full prescribing info
#   5. Wikipedia    — condition overview, recovery info
#
# Run:  python -m uvicorn main:app --reload --port 8000
# Docs: http://localhost:8000/docs
# ═══════════════════════════════════════════════════════════

import asyncio
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medipulse")

app = FastAPI(
    title="MediPulse API",
    description="Multi-database treatment intelligence — OpenFDA, RxNorm, MedlinePlus, DailyMed, Wikipedia",
    version="2.0.0"
)

# Allow frontend (Live Server) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request/Response Models ──────────────────────────────
class AnalyzeRequest(BaseModel):
    drug: str

class CompareRequest(BaseModel):
    drug_a: str
    drug_b: str

class TranslateRequest(BaseModel):
    texts: list[str]
    target_lang: str

# ── HTTP Client ──────────────────────────────────────────
TIMEOUT = httpx.Timeout(10.0, connect=5.0)


# ═══════════════════════════════════════════════════════════
# DATABASE 1: OpenFDA
# ═══════════════════════════════════════════════════════════

async def fda_adverse_events(client: httpx.AsyncClient, drug: str) -> dict:
    """Get top adverse reaction counts from FDA FAERS database."""
    enc = httpx.URL("").copy_with(params={"q": drug}).params
    urls = [
        f'https://api.fda.gov/drug/event.json?search=patient.drug.openfda.generic_name:"{drug}"&count=patient.reaction.reactionmeddrapt.exact&limit=20',
        f'https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"{drug}"&count=patient.reaction.reactionmeddrapt.exact&limit=20',
    ]
    for url in urls:
        try:
            r = await client.get(url, timeout=TIMEOUT)
            if r.status_code == 200:
                data = r.json()
                if data.get("results"):
                    return data
        except Exception as e:
            logger.warning(f"FDA adverse events error: {e}")
    return {}


async def fda_adverse_total(client: httpx.AsyncClient, drug: str) -> int:
    """Get total number of adverse event reports for this drug."""
    url = f'https://api.fda.gov/drug/event.json?search=patient.drug.openfda.generic_name:"{drug}"&limit=1'
    try:
        r = await client.get(url, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json().get("meta", {}).get("results", {}).get("total", 0)
    except Exception as e:
        logger.warning(f"FDA total error: {e}")
    return 0


async def fda_drug_label(client: httpx.AsyncClient, drug: str) -> dict:
    """Get official FDA drug label (warnings, dosage, interactions, etc.)."""
    urls = [
        f'https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{drug}"&limit=1',
        f'https://api.fda.gov/drug/label.json?search=openfda.brand_name:"{drug}"&limit=1',
    ]
    for url in urls:
        try:
            r = await client.get(url, timeout=TIMEOUT)
            if r.status_code == 200:
                data = r.json()
                if data.get("results"):
                    return data
        except Exception as e:
            logger.warning(f"FDA label error: {e}")
    return {}


# ═══════════════════════════════════════════════════════════
# DATABASE 2: RxNorm (NIH)
# ═══════════════════════════════════════════════════════════

async def rxnorm_get_cui(client: httpx.AsyncClient, drug: str) -> Optional[str]:
    """Get RxCUI (RxNorm Concept Unique Identifier) for a drug."""
    url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={drug}&search=1"
    try:
        r = await client.get(url, timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json()
            ids = data.get("idGroup", {}).get("rxnormId", [])
            return ids[0] if ids else None
    except Exception as e:
        logger.warning(f"RxNorm CUI error: {e}")
    return None


async def rxnorm_interactions(client: httpx.AsyncClient, rxcui: str) -> dict:
    """Get drug-drug interactions for a given RxCUI."""
    if not rxcui:
        return {}
    url = f"https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui={rxcui}"
    try:
        r = await client.get(url, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        logger.warning(f"RxNorm interactions error: {e}")
    return {}


async def rxnorm_related(client: httpx.AsyncClient, rxcui: str) -> dict:
    """Get related drugs (same drug class)."""
    if not rxcui:
        return {}
    url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/related.json?tty=BN+IN"
    try:
        r = await client.get(url, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        logger.warning(f"RxNorm related error: {e}")
    return {}


# ═══════════════════════════════════════════════════════════
# DATABASE 3: MedlinePlus (NIH)
# ═══════════════════════════════════════════════════════════

async def medlineplus_topic(client: httpx.AsyncClient, drug: str) -> dict:
    """Get MedlinePlus health topic articles for a drug/condition."""
    url = (
        f"https://connect.medlineplus.gov/application"
        f"?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88"
        f"&mainSearchCriteria.v.dn={drug}"
        f"&knowledgeResponseType=application/json"
    )
    try:
        r = await client.get(url, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        logger.warning(f"MedlinePlus error: {e}")
    return {}


# ═══════════════════════════════════════════════════════════
# DATABASE 4: DailyMed (NIH)
# ═══════════════════════════════════════════════════════════

async def dailymed_search(client: httpx.AsyncClient, drug: str) -> dict:
    """Search DailyMed for official prescribing information."""
    url = f"https://dailymed.nlm.nih.gov/dailymed/services/v2/drugnames.json?drug_name={drug}&pagesize=5"
    try:
        r = await client.get(url, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        logger.warning(f"DailyMed error: {e}")
    return {}


# ═══════════════════════════════════════════════════════════
# DATABASE 5: Wikipedia REST API
# ═══════════════════════════════════════════════════════════

async def wikipedia_summary(client: httpx.AsyncClient, query: str) -> dict:
    """Get Wikipedia article summary for a drug or condition."""
    try:
        # Step 1: OpenSearch for exact title match
        r_search = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={"action": "opensearch", "search": query, "limit": 1, "format": "json"},
            timeout=TIMEOUT, 
            headers={"User-Agent": "MediPulse/2.0 (student@example.com)"}
        )
        if r_search.status_code == 200:
            search_data = r_search.json()
            if len(search_data) > 1 and len(search_data[1]) > 0:
                best_title = search_data[1][0]
                
                # Step 2: Fetch summary
                import urllib.parse
                url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(best_title.replace(' ', '_'))}"
                r = await client.get(url, timeout=TIMEOUT, headers={"User-Agent": "MediPulse/2.0 (student@example.com)"})
                if r.status_code == 200:
                    return r.json()
    except Exception as e:
        logger.warning(f"Wikipedia error: {e}")
    return {}


# ═══════════════════════════════════════════════════════════
# DATA PROCESSING
# ═══════════════════════════════════════════════════════════

SEVERE_TERMS = ["death","cardiac","anaphylaxis","stroke","seizure","liver failure",
                "renal failure","respiratory","haemorrhage","suicide","coma","overdose"]
MODERATE_TERMS = ["nausea","vomiting","diarrhoea","headache","dizziness","fatigue",
                  "rash","pain","insomnia","anxiety","nausea","diarrhea"]

def classify_severity(name: str) -> str:
    n = name.lower()
    if any(t in n for t in SEVERE_TERMS):   return "high"
    if any(t in n for t in MODERATE_TERMS): return "med"
    return "low"


MOHFW_DB = {
    "metformin": {"nlem": True, "schedule": "Schedule H", "alert": "NLEM 2022 approved for Type 2 Diabetes management. Use strictly under physician guidance."},
    "ibuprofen": {"nlem": True, "schedule": "Schedule H", "alert": "NLEM 2022 included. Monitor for GI bleeding risk in Indian population."},
    "aspirin": {"nlem": True, "schedule": "Schedule H", "alert": "NLEM 2022 included for antiplatelet and analgesic use."},
    "atorvastatin": {"nlem": True, "schedule": "Schedule H", "alert": "NLEM 2022 included for primary and secondary prevention of CV events."},
    "amoxicillin": {"nlem": True, "schedule": "Schedule H1", "alert": "Schedule H1 drug. Do not self-medicate due to rising antimicrobial resistance (AMR) in India."},
    "paracetamol": {"nlem": True, "schedule": "Schedule H", "alert": "NLEM 2022 included. Do not exceed 4000mg/day to prevent hepatotoxicity."}
}

CONDITION_DB = {
    "diabetes": {
        "medicines": ["Metformin", "Glimepiride", "Sitagliptin", "Insulin"],
        "cost_estimate": "₹500 - ₹2,500 per month depending on oral meds vs insulin.",
        "timeline": [
            {"week": "Month 1", "desc": "Initial glycemic control. Possible GI side effects from Metformin."},
            {"week": "Month 3", "desc": "HbA1c target reached. Diet and lifestyle modifications show effect."},
            {"week": "Yearly", "desc": "Monitor for neuropathy, retinopathy, and nephropathy."}
        ],
        "complications": "If untreated, high blood sugar can cause severe nerve damage, kidney failure (Diabetic Nephropathy), vision loss (Diabetic Retinopathy), and increased risk of cardiovascular diseases.",
        "mohfw_guidelines": "NPCDCS guidelines recommend population-based screening for >30 years, promoting healthy lifestyle, and free dispensing of Metformin at AB-HWCs (Health and Wellness Centres).",
        "wiki_title": "Diabetes",
        "wiki_extract": "Diabetes mellitus, commonly known as diabetes, is a group of metabolic disorders characterized by a high blood sugar level over a prolonged period of time."
    },
    "hypertension": {
        "medicines": ["Amlodipine", "Losartan", "Lisinopril", "Hydrochlorothiazide"],
        "cost_estimate": "₹200 - ₹1,000 per month.",
        "timeline": [
            {"week": "Week 1-2", "desc": "BP levels start normalizing. Mild dizziness may occur initially."},
            {"week": "Month 1", "desc": "Stable target BP. Adjust dosage if necessary."},
            {"week": "Lifelong", "desc": "Avoid sudden discontinuation. Regular BP monitoring required."}
        ],
        "complications": "Severe untreated hypertension significantly increases the risk of stroke, heart attack, heart failure, and aneurysms. It is often a 'silent killer' with no symptoms until an emergency.",
        "mohfw_guidelines": "India Hypertension Control Initiative (IHCI) enforces standard treatment protocols, opportunistic screening, and free blood pressure medicines at local PHCs.",
        "wiki_title": "Hypertension",
        "wiki_extract": "Hypertension, also known as high blood pressure, is a long-term medical condition in which the blood pressure in the arteries is persistently elevated."
    },
    "asthma": {
         "medicines": ["Salbutamol", "Budesonide", "Formoterol", "Montelukast"],
         "cost_estimate": "₹800 - ₹2,000 per month (inhalers & pills).",
         "timeline": [
            {"week": "Immediate", "desc": "Reliever inhaler (Salbutamol) opens airways within minutes."},
            {"week": "Week 1-2", "desc": "Controller inhalers reduce chronic inflammation."},
            {"week": "Ongoing", "desc": "Trigger avoidance is crucial. Adjust medication based on seasons."}
         ],
         "complications": "Chronic airway remodeling, frequent severe asthma attacks requiring hospitalization, sleep disturbances, and ultimately respiratory failure in acute severe episodes.",
         "mohfw_guidelines": "National Health Mission includes asthma under NCD management. Emphasis on using pressurized metered-dose inhalers (pMDIs) with spacers over oral formulations.",
         "wiki_title": "Asthma",
         "wiki_extract": "Asthma is a long-term inflammatory disease of the airways of the lungs. It is characterized by variable and recurring symptoms, reversible airflow obstruction, and easily triggered bronchospasms."
    },
    "malaria": {
         "medicines": ["Artemether-Lumefantrine", "Chloroquine", "Primaquine"],
         "cost_estimate": "₹50 - ₹400 for a full treatment course.",
         "timeline": [
            {"week": "Day 1-2", "desc": "Fever peaks reduce as parasite clearance begins."},
            {"week": "Day 3-14", "desc": "Complete radical treatment course even if asymptomatic."},
            {"week": "After 2 weeks", "desc": "Full recovery expected if correctly treated and uncomplicated."}
         ],
         "complications": "Cerebral malaria, severe anemia, acute kidney failure, and potentially death. Plasmodium falciparum infections can rapidly progress to severe illness if delayed.",
         "mohfw_guidelines": "National Center for Vector Borne Diseases Control (NCVBDC) mandates ACT (Artemisinin-based Combination Therapy) for P. falciparum, and Chloroquine + 14-day Primaquine for P. vivax.",
         "wiki_title": "Malaria",
         "wiki_extract": "Malaria is a mosquito-borne infectious disease that affects humans and other animals. Malaria causes symptoms that typically include fever, tiredness, vomiting, and headaches."
    }
}

COST_DB = {
    "metformin":    {"brand_usd":45,  "gen_usd":4,   "brand_inr":3740,  "gen_inr":330},
    "ibuprofen":    {"brand_usd":12,  "gen_usd":3,   "brand_inr":1000,  "gen_inr":250},
    "aspirin":      {"brand_usd":8,   "gen_usd":2,   "brand_inr":665,   "gen_inr":166},
    "atorvastatin": {"brand_usd":140, "gen_usd":8,   "brand_inr":11620, "gen_inr":665},
    "amoxicillin":  {"brand_usd":25,  "gen_usd":6,   "brand_inr":2075,  "gen_inr":498},
    "lisinopril":   {"brand_usd":55,  "gen_usd":5,   "brand_inr":4565,  "gen_inr":415},
    "omeprazole":   {"brand_usd":30,  "gen_usd":7,   "brand_inr":2490,  "gen_inr":581},
    "amlodipine":   {"brand_usd":75,  "gen_usd":6,   "brand_inr":6225,  "gen_inr":498},
    "cetirizine":   {"brand_usd":20,  "gen_usd":4,   "brand_inr":1660,  "gen_inr":332},
    "paracetamol":  {"brand_usd":10,  "gen_usd":2,   "brand_inr":830,   "gen_inr":166},
    "losartan":     {"brand_usd":60,  "gen_usd":7,   "brand_inr":4980,  "gen_inr":581},
    "simvastatin":  {"brand_usd":90,  "gen_usd":6,   "brand_inr":7470,  "gen_inr":498},
}

TIMELINE_DB = {
    "antibiotic": [
        {"week": "Day 1–2",    "desc": "Start full course. Symptoms may start improving within 24–48 hours."},
        {"week": "Day 3–5",    "desc": "Noticeable reduction in infection symptoms. Do not stop early."},
        {"week": "Day 7–10",   "desc": "Complete the full prescribed course to prevent antibiotic resistance."},
        {"week": "Week 2",     "desc": "Full recovery expected. Follow up with doctor if symptoms persist."},
    ],
    "diabetes": [
        {"week": "Week 1–2",   "desc": "Starting dose — GI side effects (nausea) may occur as body adjusts."},
        {"week": "Week 4",     "desc": "Blood sugar levels begin stabilizing. Dose may be adjusted by doctor."},
        {"week": "Month 3",    "desc": "A1C checked to assess effectiveness. Lifestyle changes reinforce effect."},
        {"week": "Ongoing",    "desc": "Long-term management. Regular monitoring every 3–6 months."},
    ],
    "pain": [
        {"week": "Within 30 min", "desc": "Pain relief typically begins within 30 minutes of oral dose."},
        {"week": "1–2 hours",     "desc": "Peak effect reached. Maximum pain relief experienced."},
        {"week": "4–6 hours",     "desc": "Effect duration ends — repeat dose as prescribed if needed."},
        {"week": "Long-term use", "desc": "Consult doctor before using more than 10 days. Risk of GI issues."},
    ],
    "cholesterol": [
        {"week": "Week 1–2",   "desc": "Starting medication. Minor muscle aches possible as body adjusts."},
        {"week": "Month 1",    "desc": "Cholesterol levels begin decreasing. Blood test at 4–6 weeks."},
        {"week": "Month 3",    "desc": "Significant LDL reduction typically seen. Dose adjustment possible."},
        {"week": "Long-term",  "desc": "Continued daily use required. Liver function tests every 6–12 months."},
    ],
    "blood_pressure": [
        {"week": "Day 1–7",    "desc": "Blood pressure begins to lower. Dizziness may occur initially."},
        {"week": "Week 2–4",   "desc": "Stabilization phase. BP checked regularly. Dose adjusted if needed."},
        {"week": "Month 2–3",  "desc": "Target blood pressure range maintained with medication."},
        {"week": "Long-term",  "desc": "Lifelong management required. Never stop suddenly without doctor advice."},
    ],
    "default": [
        {"week": "Days 1–7",   "desc": "Initial adjustment period. Minor side effects possible."},
        {"week": "Week 2–4",   "desc": "Therapeutic effect begins. Doctor may adjust dose."},
        {"week": "Month 1–3",  "desc": "Full therapeutic effect typically reached. Follow-up recommended."},
        {"week": "Long-term",  "desc": "Continue as prescribed. Do not stop without consulting your doctor."},
    ],
}

DRUG_TYPE_MAP = {
    "antibiotic":     ["amoxicillin","azithromycin","ciprofloxacin","doxycycline","penicillin","cephalexin","levofloxacin"],
    "diabetes":       ["metformin","glipizide","insulin","sitagliptin","glimepiride","empagliflozin","semaglutide"],
    "pain":           ["ibuprofen","aspirin","paracetamol","naproxen","diclofenac","celecoxib","tramadol"],
    "cholesterol":    ["atorvastatin","simvastatin","rosuvastatin","lovastatin","pravastatin","fluvastatin"],
    "blood_pressure": ["lisinopril","amlodipine","losartan","atenolol","hydrochlorothiazide","ramipril","valsartan"],
}

def get_timeline(drug: str, wiki_text: str, label: dict) -> list:
    d = drug.lower().strip()
    combined = (wiki_text + " " + (label.get("dosage_and_administration", [""])[0] or "")).lower()
    for dtype, drugs in DRUG_TYPE_MAP.items():
        if d in drugs:
            return TIMELINE_DB[dtype]
    if "antibiotic" in combined or "bacterial" in combined:    return TIMELINE_DB["antibiotic"]
    if "diabetes" in combined or "blood glucose" in combined:  return TIMELINE_DB["diabetes"]
    if "pain" in combined or "anti-inflammatory" in combined:  return TIMELINE_DB["pain"]
    if "cholesterol" in combined or "statin" in combined:      return TIMELINE_DB["cholesterol"]
    if "blood pressure" in combined or "hypertension" in combined: return TIMELINE_DB["blood_pressure"]
    return TIMELINE_DB["default"]


def clean_text(text) -> str:
    """Clean HTML tags and normalize whitespace."""
    if not text:
        return ""
    if isinstance(text, list):
        text = text[0] if text else ""
    import re
    text = re.sub(r"<[^>]+>", " ", str(text))
    return re.sub(r"\s+", " ", text).strip()


def process_all_data(drug: str, raw: dict) -> dict:
    """Process all raw API responses into a clean unified structure."""

    # ── FDA Label fields ──────────────────────────────────
    label_results = raw.get("fda_label", {}).get("results", [])
    label = label_results[0] if label_results else {}
    openfda = label.get("openfda", {})

    brand_name   = (openfda.get("brand_name",  [drug.upper()])[0]).upper()
    generic_name = (openfda.get("generic_name", [drug.lower()])[0]).lower()
    manufacturer = openfda.get("manufacturer_name", ["Unknown"])[0]
    rxcui        = raw.get("rxcui") or "N/A"

    purpose           = clean_text(label.get("purpose",                  label.get("indications_and_usage", [""])))
    dosage            = clean_text(label.get("dosage_and_administration", [""]))
    warnings          = clean_text(label.get("warnings",                 label.get("boxed_warning", [""])))
    adverse_text      = clean_text(label.get("adverse_reactions",        [""]))
    contraindications = clean_text(label.get("contraindications",        [""]))
    interactions_text = clean_text(label.get("drug_interactions",        [""]))
    pregnancy         = clean_text(label.get("pregnancy",                [""]))

    # ── FDA Adverse Events ────────────────────────────────
    reactions_raw = raw.get("fda_adverse", {}).get("results", [])
    top_reactions = [
        {
            "name":     r["term"],
            "count":    r["count"],
            "severity": classify_severity(r["term"])
        }
        for r in reactions_raw
    ]

    # ── RxNorm Interactions ───────────────────────────────
    interactions = []
    interaction_groups = raw.get("rxnorm_interactions", {}).get("interactionTypeGroup", [])
    for group in interaction_groups:
        for itype in group.get("interactionType", []):
            for pair in itype.get("interactionPair", []):
                concepts = pair.get("interactionConcept", [])
                drugs_in_pair = [c.get("minConceptItem", {}).get("name", "?") for c in concepts]
                if len(drugs_in_pair) >= 2:
                    interactions.append({
                        "drug1":       drugs_in_pair[0],
                        "drug2":       drugs_in_pair[1],
                        "description": pair.get("description", "Potential interaction"),
                        "severity":    pair.get("severity", "moderate"),
                    })

    # ── Related drugs ─────────────────────────────────────
    related_drugs = []
    for group in raw.get("rxnorm_related", {}).get("relatedGroup", {}).get("conceptGroup", []):
        for prop in group.get("conceptProperties", []):
            name = prop.get("name")
            if name and name not in related_drugs:
                related_drugs.append(name)

    # ── Wikipedia ─────────────────────────────────────────
    wiki = raw.get("wikipedia", {})
    wiki_extract = wiki.get("extract", "")
    wiki_title   = wiki.get("title", drug)

    # ── MedlinePlus ───────────────────────────────────────
    medline_entries = raw.get("medlineplus", {}).get("feed", {}).get("entry", [])
    medline_links = [
        {
            "title":   (e.get("title") or {}).get("_value", "MedlinePlus Article") if isinstance(e.get("title"), dict) else str(e.get("title", "Article")),
            "url":     (e.get("link", [{}])[0] or {}).get("href", "#"),
            "summary": clean_text((e.get("summary") or {}).get("_value", "") if isinstance(e.get("summary"), dict) else ""),
        }
        for e in medline_entries[:5]
    ]

    # ── DailyMed ──────────────────────────────────────────
    dailymed_drugs = [
        {"name": d.get("drug_name",""), "setid": d.get("setid","")}
        for d in raw.get("dailymed", {}).get("data", [])[:5]
    ]

    # ── Timeline ──────────────────────────────────────────
    timeline = get_timeline(drug, wiki_extract, label)

    # ── Cost data ─────────────────────────────────────────
    cost = COST_DB.get(drug.lower().strip(), {
        "brand_usd": 60, "gen_usd": 12, "brand_inr": 4980, "gen_inr": 996
    })

    # ── Sources loaded flags ──────────────────────────────
    sources_loaded = {
        "fda":         bool(label_results or raw.get("total_events", 0) > 0),
        "rxnorm":      bool(raw.get("rxcui")),
        "medlineplus": bool(medline_entries),
        "dailymed":    bool(dailymed_drugs),
        "wikipedia":   bool(wiki_extract),
        "mohfw":       bool(drug.lower().strip() in MOHFW_DB),
    }

    mohfw_data = MOHFW_DB.get(drug.lower().strip(), {"nlem": False, "schedule": "Unknown", "alert": "No specific Indian MoHFW alert found."})

    # Dynamic Condition fallback if no drug identifiers found
    if rxcui == "N/A" and raw.get("total_events", 0) == 0:
        return {
            "type": "condition",
            "name": wiki_title,
            "medicines": [],
            "cost_estimate": "Varies significantly by severity and treatment protocol.",
            "timeline": [{"week": "Ongoing", "desc": "Consult a healthcare professional for a specific timeline."}],
            "complications": "As this is a complex condition, consult your physician for potential complications and risks if left untreated.",
            "mohfw_guidelines": f"Please refer to official Indian MoHFW guidelines for managing {wiki_title}.",
            "wiki_title": wiki_title,
            "wiki_extract": wiki_extract or "No overview available.",
            "sources_loaded": {
                "fda": False, "rxnorm": False, "medlineplus": False,
                "dailymed": False, "wikipedia": bool(wiki_extract), "mohfw": False
            }
        }

    return {
        "type":            "drug",
        "drug":            drug,
        "brand_name":      brand_name,
        "generic_name":    generic_name,
        "manufacturer":    manufacturer,
        "rxcui":           rxcui,
        "total_events":    raw.get("total_events", 0),
        "top_reactions":   top_reactions,
        "interactions":    interactions,
        "related_drugs":   related_drugs[:12],
        "wiki_extract":    wiki_extract,
        "wiki_title":      wiki_title,
        "timeline":        timeline,
        "medline_links":   medline_links,
        "dailymed_drugs":  dailymed_drugs,
        "purpose":         purpose,
        "dosage":          dosage,
        "warnings":        warnings,
        "adverse_text":    adverse_text,
        "contraindications": contraindications,
        "interactions_text": interactions_text,
        "pregnancy":       pregnancy,
        "cost":            cost,
        "mohfw_guidelines": mohfw_data,
        "sources_loaded":  sources_loaded,
    }


# ═══════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {
        "name":    "MediPulse API",
        "version": "2.0.0",
        "status":  "running",
        "databases": ["OpenFDA","RxNorm","MedlinePlus","DailyMed","Wikipedia","MoHFW"],
        "endpoints": ["/health", "/analyze", "/compare", "/docs"]
    }


@app.get("/health")
async def health():
    return {"status": "ok", "message": "MediPulse backend is running"}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    drug = req.drug.strip().lower()
    if not drug:
        raise HTTPException(status_code=400, detail="Drug name cannot be empty")

    logger.info(f"Analyzing: {drug}")

    # Check if this is a condition
    if drug in CONDITION_DB:
        cond = CONDITION_DB[drug]
        return {
            "type": "condition",
            "name": drug.title(),
            "medicines": cond["medicines"],
            "cost_estimate": cond["cost_estimate"],
            "timeline": cond["timeline"],
            "complications": cond["complications"],
            "mohfw_guidelines": cond["mohfw_guidelines"],
            "wiki_title": cond["wiki_title"],
            "wiki_extract": cond["wiki_extract"],
            "sources_loaded": {
                "fda": False, "rxnorm": False, "medlineplus": False,
                "dailymed": False, "wikipedia": True, "mohfw": True
            }
        }

    async with httpx.AsyncClient() as client:

        # ── Step 1: Run all independent queries in parallel ──
        (
            adverse_events,
            adverse_total,
            fda_label,
            rxcui,
            wiki,
            dailymed,
            medline,
        ) = await asyncio.gather(
            fda_adverse_events(client, drug),
            fda_adverse_total(client, drug),
            fda_drug_label(client, drug),
            rxnorm_get_cui(client, drug),
            wikipedia_summary(client, drug),
            dailymed_search(client, drug),
            medlineplus_topic(client, drug),
            return_exceptions=False,
        )

        # ── Step 2: RxNorm follow-up (needs rxcui) ───────────
        rxnorm_int, rxnorm_rel = await asyncio.gather(
            rxnorm_interactions(client, rxcui),
            rxnorm_related(client, rxcui),
        )

    raw = {
        "fda_adverse":          adverse_events,
        "total_events":         adverse_total,
        "fda_label":            fda_label,
        "rxcui":                rxcui,
        "rxnorm_interactions":  rxnorm_int,
        "rxnorm_related":       rxnorm_rel,
        "wikipedia":            wiki,
        "dailymed":             dailymed,
        "medlineplus":          medline,
    }

    result = process_all_data(drug, raw)
    logger.info(f"Done: {drug} | type={result.get('type')}")
    return result


@app.post("/compare")
async def compare(req: CompareRequest):
    drug_a = req.drug_a.strip().lower()
    drug_b = req.drug_b.strip().lower()

    if not drug_a or not drug_b:
        raise HTTPException(status_code=400, detail="Both drug names are required")

    logger.info(f"Comparing: {drug_a} vs {drug_b}")

    # Analyze both drugs in parallel
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            _analyze_single(client, drug_a),
            _analyze_single(client, drug_b),
        )

    return {
        "drug_a": results[0],
        "drug_b": results[1],
    }


async def _analyze_single(client: httpx.AsyncClient, drug: str) -> dict:
    """Internal helper: analyze one drug using existing client."""
    adverse_events, adverse_total, fda_label, rxcui, wiki = await asyncio.gather(
        fda_adverse_events(client, drug),
        fda_adverse_total(client, drug),
        fda_drug_label(client, drug),
        rxnorm_get_cui(client, drug),
        wikipedia_summary(client, drug),
    )
    rxnorm_int = await rxnorm_interactions(client, rxcui)

    raw = {
        "fda_adverse":         adverse_events,
        "total_events":        adverse_total,
        "fda_label":           fda_label,
        "rxcui":               rxcui,
        "rxnorm_interactions": rxnorm_int,
        "rxnorm_related":      {},
        "wikipedia":           wiki,
        "dailymed":            {},
        "medlineplus":         {},
    }
    return process_all_data(drug, raw)


LANG_CODE_MAP = {
    "hi": "hi", "es": "es", "fr": "fr", "zh": "zh-CN", "ar": "ar",
    "pt": "pt", "de": "de", "ja": "ja", "ru": "ru", "ko": "ko", "bn": "bn"
}

async def _translate_via_mymemory(client: httpx.AsyncClient, text: str, target_lang: str) -> str:
    """Free fallback translation using MyMemory API."""
    lang_code = LANG_CODE_MAP.get(target_lang, target_lang)
    try:
        r = await client.get(
            "https://api.mymemory.translated.net/get",
            params={"q": text[:500], "langpair": f"en|{lang_code}"},
            timeout=10.0
        )
        if r.status_code == 200:
            data = r.json()
            translated = data.get("responseData", {}).get("translatedText", "")
            if translated and "MYMEMORY WARNING" not in translated:
                return translated
    except Exception as e:
        logger.warning(f"MyMemory fallback error: {e}")
    return text


@app.post("/translate")
async def translate_text(req: TranslateRequest):
    if not req.texts:
        return {"translations": []}

    import json

    XAI_API_KEY = ""
    
    # ── Try xAI Grok first ──
    async with httpx.AsyncClient() as client:
        try:
            system_prompt = f"You are a medical localization expert. Translate the provided JSON array of strings into {req.target_lang}. Preserve any HTML tags or markdown. Return ONLY a valid JSON array of strings in the exact same order and length."
            payload = {
                "model": "grok-3-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(req.texts)}
                ],
                "temperature": 0.1
            }
            r = await client.post(
                "https://api.x.ai/v1/chat/completions",
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {XAI_API_KEY}"},
                json=payload,
                timeout=25.0
            )
            r.raise_for_status()
            res_data = r.json()
            reply = res_data["choices"][0]["message"]["content"].strip()
            
            if reply.startswith("```json"): reply = reply[7:]
            if reply.startswith("```"): reply = reply[3:]
            if reply.endswith("```"): reply = reply[:-3]
            reply = reply.strip()
            
            translations = json.loads(reply)
            if len(translations) == len(req.texts):
                logger.info(f"✅ Grok translated {len(req.texts)} texts to {req.target_lang}")
                return {"translations": translations}
        except Exception as e:
            logger.warning(f"⚠️ Grok API failed ({e}), falling back to MyMemory free translation")

        # ── Fallback: MyMemory free translation ──
        logger.info(f"Using MyMemory free translation for {len(req.texts)} texts → {req.target_lang}")
        translations = []
        for text in req.texts:
            import re
            clean = re.sub(r"<[^>]+>", "", text).strip()
            if not clean or len(clean) < 2:
                translations.append(text)
                continue
            translated = await _translate_via_mymemory(client, clean, req.target_lang)
            translations.append(translated)
        
        return {"translations": translations}
