# MindfulAI 🧠
Privacy-first mood check-ins with concise AI coaching. Stored locally by default.

> **Disclaimer:** MindfulAI is a wellness tool, not a medical service. It does not provide medical advice, diagnosis, or treatment.  
> **In crisis (US):** Call/text **988**. If outside the US, contact your local emergency number or a trusted person nearby.

---

## What this is
MindfulAI is a single-page, local-first mood check-in UI that:
- Lets users select a mood in one click
- Runs a lightweight “check-in chat”
- Stores session data locally (browser storage)
- Generates simple 7-day insights (trend + streak + rule-based recommendations)
- Includes crisis routing language and safety disclaimers in the UI

The UI is designed to feel “calm, dark, clean” with a glassmorphism card layout and minimal animations.

---

## Key features
- **Mood selector**: Amazing / Good / Okay / Down / Anxious
- **Check-in chat**: Simple message input + session display area
- **Insights**: Mood trend, streak, and recommendations based on last 7 days
- **Privacy-first**: Local storage by default, with a “Delete data” control
- **Accessible motion**: Respects `prefers-reduced-motion`
- **Crisis resources**: Built-in messaging and hotline reference (988)

---

## Tech stack
- **HTML + TailwindCSS (CDN)** for layout and styling
- **Vanilla JS** (`app.js`) for state, chat behavior, and localStorage persistence

No build system required.

---

## Project structure
Recommended minimal layout:

mindfulai/
index.html
app.js
README.md


`index.html` includes the UI and loads `./app.js`.

---

## Getting started
### Option A: Open locally (quickest)
1. Download/clone the project.
2. Open `index.html` in your browser.

### Option B: Run a local server (recommended)
Some browsers restrict certain features when opening files directly. Use a simple local server:

**Python**
```bash
python -m http.server 5173
Then open:

http://localhost:5173
Node (optional)

npx serve .
