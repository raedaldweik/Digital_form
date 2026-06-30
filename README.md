# Kuwait Smart Border Declaration (Customs)

A digital customs declaration built as two responsive, phone-style web apps:

1. **User app** (`index.html`) — the traveller in the car fills in their information,
   uploads their documents, and submits the declaration to Kuwait Customs.
2. **Officer app** (`officer/index.html`) — the customs officer reviews every
   applicant, sees all submitted answers + documents and a risk score, and either
   **moves the case to the investigator** or **rejects** it.
3. **Investigator screen** (inside the officer app) — a SAS Visual Investigator–style
   mobile view: entity-relationship network, related entities, risk indicators and a
   case timeline.

Everything is **Arabic-first (RTL)**, with an English toggle on the welcome screen.

## User app flow

- **Welcome** — government branding, language toggle, "ابدأ التصريح".
- **Step 1 — Traveler info** — upload the **passport** photo to auto-fill (simulated
  OCR) passport number, name, nationality and date of birth; remaining personal fields.
- **Step 2 — Travel declaration** — purpose, country of departure, previous countries,
  duration, items to declare, cash and the customs yes/no questions.
- **Step 3 — Vehicle + Wakala** — upload the **car daftar (registration)** to auto-fill
  plate, make/model, type and colour; plus the **Wakala** (agency) section with a
  **Kuwaiti / non-Kuwaiti** toggle.
- **Result** — neutral submission confirmation (assigned lane + crossing details).
  **No QR code** — the officer reviews the case on their side.

Submissions (including the uploaded document images) are passed to the officer app via
shared `localStorage` (`ksb_submissions`).

## Officer app

- **Home** — KPIs (total / high-risk / under investigation), **search by name** and
  **search by vehicle number** (with a "scan plate" option), and the latest applicants.
- **Applicants** — the full list of everyone who applied, with filters and search.
- **Applicant detail** — risk score + **every answer** from the form, the **attached
  documents**, the risk-score breakdown, and **Move to Investigator / Reject** actions.
- **Investigator** — cases moved by the officer, each opening into the entity-network
  case view. Officer decisions persist in `localStorage` (`ksb_decisions`).

## OCR / autofill

Document upload currently **simulates** OCR extraction (it fills realistic sample
fields after a short "reading" animation) and stores a compressed copy of the uploaded
image so the officer can see it. Wire the uploader to a real OCR backend (or a
client-side engine such as Tesseract.js) to read live document data.

## Running locally

Static site — open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# user app:    http://localhost:8000/index.html   (framed: device.html)
# officer app: http://localhost:8000/officer/      (framed: officer/device.html)
```

## File structure

| File | Purpose |
|------|---------|
| `index.html` / `app.js` / `i18n.js` / `styles.css` | User app (welcome, steps 1–3, result) |
| `officer/index.html` / `officer/app.js` / `officer/styles.css` | Officer + investigator app |
| `device.html`, `officer/device.html` | iPhone-frame wrappers (load the apps in an iframe) |
| `assets/` | Logos, emblems and background imagery |
