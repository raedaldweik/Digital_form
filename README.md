# Kuwait Smart Border Declaration (Customs)

A digital customs declaration built as **three** responsive, phone-style web apps —
one per persona:

1. **Traveller app** (`index.html`) — the person in the car fills in their information,
   uploads their documents, and submits the declaration to Kuwait Customs.
2. **Officer app** (`officer/index.html`) — the officer **at the border** looks the
   traveller up by name or scans the plate, double-checks the submitted declaration +
   risk score, then **forwards the case to the investigator** or **rejects** it.
3. **Investigator app** (`investigator/index.html`) — a full **SAS Visual Investigator**
   experience on a phone for the customs intelligence investigator, who has the **final
   say (approve / reject)**: an alert-triage queue, a scorecard with named scenario
   sub-scores (C1…C9), a link-analysis network with entity resolution, a goods/vehicle
   map, an x-ray/scan panel, triggers, score & alert history, source record, and an
   investigation assistant.

Everything is **Arabic-first (RTL)**. Data flows between the apps via shared
`localStorage`: `ksb_submissions` (full declarations + documents), `ksb_decisions`
(`investigator` / `approved` / `rejected`), and `ksb_history` (alert audit log).

The investigator app's data model and disposition flow mirror the SAS VI REST APIs
(`svi-alert`, `svi-datahub`, `svi-sand`, `workflows`, `svi-transport`) so it can be
wired to a live SAS Viya / Visual Investigator backend later — see the mapping table in
`investigator/app.js`.

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
