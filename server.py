"""
Moleculon — local demo backend.

Serves the static site and powers two illustrative, simulated endpoints:
  - POST /api/screen   -> mock in-silico candidate-compound screening
  - POST /api/triage    -> mock adverse-event triage draft
  - POST /api/contact   -> logs a contact-form submission to data/leads.json

None of this touches real clinical, safety, or regulatory systems — it exists
to make the "Research" and "Operations" pillars of the site tangible.

Run:  python server.py
Then open http://127.0.0.1:5000
"""

import json
import math
import random
import string
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

ROOT = Path(__file__).parent.resolve()
DATA_DIR = ROOT / "data"
LEADS_FILE = DATA_DIR / "leads.json"

app = Flask(__name__, static_folder=None)

# ---------------------------------------------------------------------------
# Static file serving
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(ROOT, filename)


# ---------------------------------------------------------------------------
# Research demo: candidate compound screening (simulated)
# ---------------------------------------------------------------------------

COMPOUND_PREFIXES = ["MLC", "BRX", "NVR", "CDX", "PXL", "ZTN"]


def _compound_id(rng: random.Random) -> str:
    prefix = rng.choice(COMPOUND_PREFIXES)
    number = rng.randint(100, 999)
    suffix = "".join(rng.choices(string.ascii_uppercase, k=2))
    return f"{prefix}-{number}{suffix}"


@app.route("/api/screen", methods=["POST"])
def screen_candidates():
    payload = request.get_json(silent=True) or {}
    candidates = int(payload.get("candidates", 5000))
    candidates = max(100, min(candidates, 200_000))

    rng = random.Random()

    # Deterministic-ish shortlist size: grows sub-linearly with pool size,
    # mirroring how simulation narrows a large pool to a lab-feasible handful.
    shortlisted = max(3, min(15, round(math.sqrt(candidates) / 14)))

    scores = sorted((round(rng.uniform(62, 97), 1) for _ in range(shortlisted)), reverse=True)
    top_candidates = [
        {"id": _compound_id(rng), "score": score}
        for score in scores
    ]

    # Toy estimate: assume ~35 minutes of wet-lab time per compound saved
    # by simulating first instead of testing everything physically.
    minutes_saved = (candidates - shortlisted) * 35
    weeks_saved = minutes_saved / (60 * 40)  # 40-hour lab weeks
    time_saved = f"~{weeks_saved:,.0f} lab-weeks" if weeks_saved >= 1 else f"~{minutes_saved} minutes"

    return jsonify({
        "screened": candidates,
        "shortlisted": shortlisted,
        "top_candidates": top_candidates,
        "time_saved": time_saved,
    })


# ---------------------------------------------------------------------------
# Operations demo: adverse-event triage draft (simulated, rule-based)
# ---------------------------------------------------------------------------

SOC_KEYWORDS = [
    (("headache", "migraine", "dizziness", "seizure", "numbness"), "Nervous system disorders"),
    (("rash", "itch", "hives", "skin"), "Skin & subcutaneous disorders"),
    (("nausea", "vomit", "diarrhea", "abdominal", "stomach"), "Gastrointestinal disorders"),
    (("breath", "cough", "wheeze", "respiratory", "lung"), "Respiratory disorders"),
    (("chest pain", "palpitation", "cardiac", "heart"), "Cardiac disorders"),
    (("fever", "fatigue", "chills", "malaise", "weakness"), "General disorders & administration site conditions"),
    (("anxiety", "depression", "insomnia", "confusion"), "Psychiatric disorders"),
]

SERIOUSNESS_LABELS = {
    "hospitalization": "Serious — Hospitalization",
    "life_threatening": "Serious — Life-threatening",
    "disability": "Serious — Persistent disability",
}


@app.route("/api/triage", methods=["POST"])
def triage_case():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").lower().strip()
    flags = payload.get("flags") or []

    if any(f in SERIOUSNESS_LABELS for f in flags):
        seriousness = next(SERIOUSNESS_LABELS[f] for f in flags if f in SERIOUSNESS_LABELS)
    else:
        seriousness = "Non-serious"

    expectedness = "Expected (listed in reference safety information)" \
        if "known" in text or "expected" in text \
        else "Unexpected — flagged for expedited review"

    system_organ_class = "General disorders & administration site conditions"
    for keywords, soc in SOC_KEYWORDS:
        if any(k in text for k in keywords):
            system_organ_class = soc
            break

    snippet = text[:160] + ("…" if len(text) > 160 else "") if text else "no narrative provided"
    draft_report = (
        f"Case narrative indicates a {seriousness.split('—')[-1].strip().lower() if '—' in seriousness else 'non-serious'} "
        f"event consistent with {system_organ_class.lower()}. Reported presentation: \"{snippet}\". "
        f"Recommend causality assessment against current reference safety information and "
        f"routing for {('expedited' if 'Serious' in seriousness else 'periodic')} regulatory reporting."
    )

    return jsonify({
        "seriousness": seriousness,
        "expectedness": expectedness,
        "system_organ_class": system_organ_class,
        "draft_report": draft_report,
        "manual_time": "4–6 hours",
        "ai_time": "~12 minutes (human-reviewed)",
    })


# ---------------------------------------------------------------------------
# Contact form
# ---------------------------------------------------------------------------

@app.route("/api/contact", methods=["POST"])
def contact():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip()

    if not name or not email:
        return jsonify({"error": "name and email are required"}), 400

    DATA_DIR.mkdir(exist_ok=True)
    leads = []
    if LEADS_FILE.exists():
        try:
            leads = json.loads(LEADS_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            leads = []

    leads.append({
        "name": name,
        "email": email,
        "org": (payload.get("org") or "").strip(),
        "message": (payload.get("message") or "").strip(),
        "received_at": datetime.now(timezone.utc).isoformat(),
    })
    LEADS_FILE.write_text(json.dumps(leads, indent=2), encoding="utf-8")

    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
