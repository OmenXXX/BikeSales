# BikeSales ERP

Web front end for bike sales operations: **products**, **inventory**, **storage**, **sales**, **business partners**, and **admin** (employees, org structure, modules). Business data is stored in **FileMaker**; this app talks to FileMaker through **Firebase Cloud Functions** that proxy the FileMaker Data API. Authentication and session semantics use **Firebase Auth** (and related rules).

## What we’re building

- Give operations and admin staff a **modern UI** (React) on top of existing FileMaker layouts and records.
- Keep **FileMaker as the source of truth** for ERP data; the cloud layer adds auth, transport, and whitelisted API access.
- Ship **module-based** areas (e.g. partners with linked addresses, storage adjustments, product lists) that map to specific layouts and generic `_find` / `PATCH` / `POST` routes—no duplicate business logic in ad-hoc backends for every screen.

## Stack

| Layer | Technology |
|--------|------------|
| UI | React 19, Vite, React Router, Tailwind CSS |
| Hosting / backend entry | Firebase Hosting + Cloud Functions (Node 20) |
| Auth | Firebase Authentication |
| Data | FileMaker Data API (via Express routes in `functions`) |
| Optional local dev | Firebase emulators, local proxy / standalone server under `functions` |

## Repository layout

```
BikeSalesErp/
├── frontend/          # Vite SPA (env: VITE_API_URL, Firebase client config)
├── functions/         # Cloud Function: Express app, FileMaker proxy, whitelist
├── firebase.json      # Hosting, functions, emulator ports
├── firestore.rules    # Firestore rules (if used)
└── scripts/           # Seeds, helpers (e.g. emulator data)
```

## Prerequisites

- **Node.js 20** (for Cloud Functions)
- **npm**
- **Firebase CLI** (`npm i -g firebase-tools`) for deploy/emulators
- Access to **FileMaker** host + database and valid API credentials (configured in Cloud Function / local env—see team docs or `.env` patterns in `functions`)

## Local development (overview)

1. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Point `VITE_API_URL` at your running API (e.g. local emulator or deployed function URL).

2. **Functions**
   ```bash
   cd functions
   npm install
   ```
   Use Firebase emulators or the project’s local standalone server script as documented for your environment (`npm run standalone` where applicable).

3. **Emulators** (optional)
   ```bash
   firebase emulators:start
   ```
   Ports are defined in `firebase.json` (e.g. functions often on **5001**).

Exact env var names and FileMaker connection steps are environment-specific; keep secrets out of git.

## Git / `main` branch

`main` is the **canonical application line** for this repository (aligned with ongoing ERP work: partners, addresses, admin structure, storage, etc.). If you need the previous tip of `main` for comparison, maintain a local backup branch or tag (your team may use a name like `backup/main-before-feat-merge-0cb2332`).

## Contributing

This is a **personal proof-of-concept** repository. If you ever collaborate, use **feature branches** and **pull requests** into `main`, run **lint** in `frontend` before pushing when applicable, and do not commit secrets or production credentials.

## Rights / use of this code

**All rights reserved.** This repository and its contents are **private intellectual property** of the owner. It is **not** open source. **Do not copy, redistribute, or reuse** this code without explicit written permission. This project is for **proof-of-concept and learning** only; it is not a grant of license to others.
