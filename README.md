# 🧬 MediPulse — Multi-Database Treatment Intelligence

Real medical data from **5 free APIs** combined into one dashboard.  
No API key required. No paid services. 100% free forever.

---

## 📁 Project Structure

```
medipulse/
├── frontend/
│   ├── index.html          ← Main HTML page
│   ├── css/
│   │   └── style.css       ← All styles
│   └── js/
│       ├── api.js          ← Backend API calls
│       ├── render.js       ← Tab rendering functions
│       └── app.js          ← Main app controller
│
├── backend/
│   ├── main.py             ← FastAPI server (all 5 databases)
│   └── requirements.txt    ← Python dependencies
│
└── README.md               ← This file
```

---

## 🗄️ 5 Databases Used

| Database | What it provides | API Endpoint |
|---|---|---|
| **OpenFDA** | Adverse events, drug labels, warnings | api.fda.gov |
| **RxNorm** | Drug interactions, related drugs | rxnav.nlm.nih.gov |
| **MedlinePlus** | Treatment articles, health info | medlineplus.gov |
| **DailyMed** | Full prescribing information | dailymed.nlm.nih.gov |
| **Wikipedia** | Condition overview, recovery info | en.wikipedia.org |

All APIs are **completely free** — no registration, no API key, no rate limits.

---

## 🚀 How to Run

### Step 1 — Start the Python Backend

Open a terminal and navigate to the `backend/` folder:

```bash
cd backend
```

Install dependencies (only needed once):

```bash
pip install -r requirements.txt
```

Start the server:

```bash
python -m uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

✅ Backend is now running at **http://localhost:8000**

---

### Step 2 — Open the Frontend

1. Open VS Code
2. Open the `frontend/` folder
3. Right-click `index.html` → **Open with Live Server**
4. Browser opens at `http://127.0.0.1:5500`

> ⚠️ **Important:** You MUST use Live Server — do not double-click the HTML file. Double-clicking opens it as `file://` which blocks API calls (CORS policy).

---

### Step 3 — Search a Drug

Type any drug name in the search box:
- `metformin`
- `ibuprofen`  
- `aspirin`
- `atorvastatin`
- `amoxicillin`

The app queries all 5 databases simultaneously and shows results in 9 tabs.

---

## 📊 Features (9 Tabs)

| Tab | Data Source | What you see |
|---|---|---|
| 📊 Overview | All 5 DBs | Summary stats, top reactions, timeline preview |
| ⚠️ Side Effects | OpenFDA | Bar chart of adverse reactions by frequency |
| 🏥 Treatment | MedlinePlus + Wiki | Treatment info, articles, Wikipedia overview |
| 📅 Timeline | Wiki + FDA Label | Recovery timeline by drug type |
| 🔄 Interactions | RxNorm | Drug-drug interaction checker |
| 📋 Drug Label | DailyMed + FDA | Official warnings, dosage, contraindications |
| 💰 Cost | Built-in DB | USD + INR brand vs generic pricing |
| ⚖️ Compare | All DBs | Side-by-side comparison of two drugs |
| 📄 Export | All data | Print PDF, copy text, download JSON |

---

## 🔧 API Endpoints

Once backend is running, visit **http://localhost:8000/docs** for interactive API docs.

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/analyze` | POST | Full drug analysis (all 5 DBs) |
| `/compare` | POST | Compare two drugs |

### Example Request:

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"drug": "metformin"}'
```

---

## ❓ Troubleshooting

**"Backend offline"** shown in header:
→ Make sure Python server is running: `python -m uvicorn main:app --reload --port 8000`

**"Failed to fetch" error:**
→ Open frontend with Live Server, not by double-clicking the HTML file

**"pip not found":**
→ Install Python from python.org — check "Add Python to PATH" during install

**Windows uvicorn error:**
→ Use `python -m uvicorn main:app --reload --port 8000` (not just `uvicorn`)

**No data for a drug:**
→ Try the exact generic name (e.g. "metformin hydrochloride" instead of "metformin")

---

## 📝 Notes

- This project is for **educational purposes only**
- Data is from official US FDA and NIH databases
- FDA adverse event counts are **reported events** — not proven causation
- Cost estimates are approximate — always verify with GoodRx or local pharmacy
- **Not medical advice** — always consult a licensed healthcare professional

---

Built for **Prayogam Hackathon** · BCA 2nd Semester
