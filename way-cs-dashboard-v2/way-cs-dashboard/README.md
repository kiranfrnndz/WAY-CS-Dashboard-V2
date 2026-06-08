# WAY CS Operations Dashboard V2

A production-grade customer support operations dashboard built with React + TypeScript + Vite + Material UI.

## Features

- **Home Page** — Agent tiles with productivity, utilisation, and FCR at a glance
- **Tab 1: Individual Performance** — Utilisation, calls, emails, chats, productivity target tracking, bounce rate drill-down
- **Tab 2: Queue Performance** — Queue summary, email/chat drill-down by reason, high hold time & long AHT alerts
- **Tab 3: Work Pattern** — Hourly timeline, occupancy breakdown, wrap-up bucket analysis, between-call gap analysis
- **Tab 4: QC & Compliance** — FCR analysis with contact pattern, duplicate ticket detection, missing ticket logging, multi-interaction review
- **Tab 5: Coaching** — Strength/improvement cards with severity ratings, clickable evidence drill-downs

## Data Sources

Upload any of these Excel/CSV files:

| File | Purpose |
|------|---------|
| Call Center Call Detail Report (CCDR) | Inbound/outbound calls, talk, hold, wrap times |
| Agent Call Detail Report | Per-agent call breakdown |
| CRM Ticket Export (Zoho/WP) | Ticket IDs, order IDs, reason, sub-reason, action taken |

## Deployment

This project auto-deploys to GitHub Pages via the included GitHub Actions workflow.

1. Push to the `main` branch
2. GitHub Actions builds and deploys automatically
3. Enable GitHub Pages in repo Settings → Pages → Source: GitHub Actions

## Local Development

```bash
npm install
npm run dev
```

## CRM Matching Logic

Priority 1: Phone + Agent Name + Date  
Priority 2: Phone + Date  
Priority 3: Nearest interaction timestamp (same agent, same date)

## Role Filtering

Non-frontline roles (Team Leads, Leadership, Reviews, Disputes, QC, L2, Reporting, SME) are automatically excluded from all KPI calculations.
