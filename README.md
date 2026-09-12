# Moleculon

AI-run clinical trial operations & medicine discovery — concept site.

**Live site:** https://aditya-bhaika.github.io/Moleculon/

## What's here

A single-page concept site for Moleculon, an AI agent with two connected jobs:
running clinical trial operations (adverse event triage, protocol deviation
monitoring, patient matching, regulatory reporting) and accelerating early
drug discovery (in-silico candidate screening for diseases with no current
treatment).

Two interactive demos simulate each side of the platform:

- **Research Engine** — simulates narrowing a large pool of candidate compounds
  down to a lab-feasible shortlist.
- **Operations Engine** — simulates drafting an adverse-event triage report
  from a case narrative.

Both demos run entirely client-side (`js/script.js`) so they work on this
static GitHub Pages deployment. A small Flask backend (`server.py`) provides
the same two endpoints plus a contact-form log for local development — the
front end calls the backend first and falls back to the client-side
simulation automatically if it's not reachable.

## Running locally with the Flask backend

```bash
pip install flask
python server.py
```

Then open http://127.0.0.1:5000.

## Structure

```
index.html      Page markup
css/style.css   Styling (black/white/gray, Apple-style scroll animations)
js/script.js    Interactions, animations, demo logic + client-side fallback
server.py       Optional local Flask backend for the two demos + contact form
```
