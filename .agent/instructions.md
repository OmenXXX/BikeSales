# BikeSales ERP - Developer & Agent Instructions

This document contains critical business logic, schema mappings, and environmental rules that must be followed by any AI agent or developer working on this codebase.

## 1. FileMaker Data API Logic
- **NEVER** use the standard "Get All Records" endpoint for listing.
- **ALWAYS** use the `_find` endpoint with a wildcard search: `[{ "PrimaryKey": "*" }]`.
- This ensures consistency with production logic and handles large datasets predictably.

## 2. Field Name Mapping (Source of Truth)
The following fields in the frontend code map to specific FileMaker fields in the `Employees` layout:
- `z_session_id` → **`SessionKey`**
- `z_device_name` → **`CurrentlyLoggedInDevice`**
- `z_active_state` → **`Active`** (Possible values: `1` for Active, `0`/Empty/Null for Inactive)
- `FireBaseUserID` → **`FireBaseUserID`**

## 3. Local Development Environment
- **Standalone Server**: Run with `npm run standalone` from the `functions` directory. This uses `nodemon` for automatic restarts on code changes.
- **Port**: `5001`.
- **API Prefix**: `/bikesakes/us-central1/api`.
- **Auth**: The local server dynamically extracts the UID from incoming Firebase ID tokens. It strictly respects the `Active` and `Role` fields returned by FileMaker for that specific user.

## 4. Running the Project (Dev Setup)
To start the full development environment, open two terminals and run:

### Terminal 1: Backend API
```powershell
cd functions
npm run standalone
```

### Terminal 2: Frontend UI
```powershell
cd frontend
npm run dev
```

## 5. Admin Structure Logic
- Layout names often differ from their display names:
  - Modules → `Modules`
  - Centers → `Centers`
  - Passcodes → `PAC`
- Always verify layout names in `AdminStructure.jsx` before performing API calls.

## 5. UI Components
- `StructureList.jsx` is the core component for all admin lists.
- It requires `isCreating`, `editingId`, and `isSaving` states to function correctly.
- Always include defensive checks (e.g., `Array.isArray(data)`) before mapping over items to prevent crashes on failed fetches.
