# Kuwait Smart Border Declaration

A digital travel declaration form, built as a responsive website that looks and works like the mobile mockups. Travelers enter their information, fill out a customs declaration, and receive a simulated border-clearance decision with a QR pass.

## Features

- **Welcome screen** — branding, feature highlights, and a language toggle.
- **Step 1 — Traveler Information** — passport, name, nationality, date of birth, mobile, email (with scan/NFC placeholders).
- **Step 2 — Travel Declaration** — purpose of visit, country of departure, previously visited countries, duration, items to declare, cash declaration, and customs questions.
- **Decision screen** — simulated AI decision:
  - **Approved for Automated Clearance** (Fast Track Lane) with a Border Clearance Pass QR, or
  - **Additional Inspection Required** with an inspection counter and reference QR.
- **Bilingual** — full **English / العربية** support with right-to-left layout for Arabic.
- **Responsive** — phone-first layout that also looks good centered on desktop.
- **Zero dependencies** — plain HTML, CSS, and JavaScript. Hosts anywhere.

## How the decision works

The declaration is flagged for **inspection** if any of these are true; otherwise it is **approved**:

- "Restricted/prohibited goods" = Yes
- "Commercial merchandise" = Yes
- "Cash exceeding KWD 10,000" = Yes
- Declared cash amount > 10,000 KWD
- "Commercial Goods" checked in Items to Declare

## Running locally

It's a static site — just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## File structure

| File | Purpose |
|------|---------|
| `index.html` | Markup for all screens (welcome, step 1, step 2, result, bottom nav) |
| `styles.css` | All styling, responsive layout, and RTL rules |
| `i18n.js` | English/Arabic translation strings and the shared country list |
| `app.js` | Navigation, form handling, language switching, decision logic, QR rendering |

## Notes / next steps

- The QR code is a styled placeholder generated from the declaration reference. Swap in a real QR library to encode actual pass data.
- "Scan Passport" and "Read Passport (NFC)" are UI placeholders.
- No backend yet — submissions are processed entirely in the browser. Add an API to persist declarations and issue real clearance decisions.
