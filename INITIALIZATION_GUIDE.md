# Project Initialization Guide

Use the following steps to get the development environment running from a fresh clone.

## Prerequisites
- Node.js (v20 recommended)
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase Account (logged in via `firebase login`)

## 1. Install Dependencies
Run this in the root directory:
```bash
npm install
```
This will also install dependencies in `frontend/` and `functions/` (if configured with postinstall) or you can do them manually:
```bash
# Optional: Manual install if root install doesn't cover sub-repos
cd functions && npm install
cd ../frontend && npm install
```

## 2. Start Firebase Emulators
The project requires the Auth, Firestore, and UI emulators.
```bash
npm run emulators
```
- Emulator UI: [http://127.0.0.1:4000](http://127.0.0.1:4000)

## 3. Seed Users (One-time or after emulator wipe)
```bash
npm run seed
```

## 4. Start Servers
Launch the project using the helper script:
```bash
# In the root directory
npm run start-all
```
> [!TIP]
> If the frontend is unreachable (ERR_CONNECTION_REFUSED), try running it with the explicit host:
> `npm run dev -- --host 127.0.0.1` (already included in the root `npm run frontend` script).

Alternatively, in separate terminals:
- **Node Server**: `npm run server`
- **Frontend**: `npm run frontend`

## 5. View Project
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **API (Proxy)**: [http://127.0.0.1:5001/bikesakes/us-central1/api](http://127.0.0.1:5001/bikesakes/us-central1/api)
