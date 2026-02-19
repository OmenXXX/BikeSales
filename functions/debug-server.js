const path = require('path');
const envPath = path.resolve(__dirname, '.env');
const result = require('dotenv').config({ path: envPath });

console.log(`\n[DIAGNOSTIC] Environment Path: ${envPath}`);
if (result.error) {
    console.error(`[DIAGNOSTIC] Dotenv Error:`, result.error.message);
} else {
    const keys = Object.keys(result.parsed || {});
    console.log(`[DIAGNOSTIC] Keys found in .env: ${keys.join(', ') || 'NONE'}`);
    console.log(`[DIAGNOSTIC] FILEMAKER_HOST: ${process.env.FILEMAKER_HOST || 'MISSING'}`);
}

const express = require('express');
const cors = require('cors');

const proxyService = require("./services/filemakerProxyService");
const { formatResponse } = require("./utils/responseFormatter");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// SUPER VERBOSE LOGGER
app.use((req, res, next) => {
    console.log(`[DEBUG_SRV] ${new Date().toLocaleTimeString()} -> ${req.method} ${req.url}`);
    next();
});

// Import Middleware from the main app structure
const scrambleMiddleware = require('./middleware/scrambleMiddleware');

// MOCK AUTH: But we need the REAL UID from the token to match Scrambling encryption!
// Frontend expects response encrypted with ITS uid.
app.use((req, res, next) => {
    // Basic JWT Decoder (No Crypto Sig Check - just for debug server matching)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            const token = req.headers.authorization.split('Bearer ')[1];
            // JWT is Header.Body.Signature
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const decoded = JSON.parse(jsonPayload);

            req.user = decoded; // { uid: "...", ... }
            req.user.uid = decoded.user_id || decoded.sub || decoded.uid;

            console.log(`[DEBUG_SRV] 🟢 Extracted UID from Token: ${req.user.uid}`);
        } catch (e) {
            console.error(`[DEBUG_SRV] 🔴 Failed to decode token:`, e.message);
        }
    }

    // Fallback if no token (e.g. initial ping)
    if (!req.user) {
        req.user = { uid: "IvmpqrKNcrM9vB67ApEltuiU5h92", email: "local@example.com" };
        console.log(`[DEBUG_SRV] 🟡 Using Mock User: ${req.user.uid}`);
    }
    next();
});

// APPLY GLOBAL SCRAMBLER
app.use(scrambleMiddleware);

app.get("/ping", (req, res) => res.json({ status: "alive", timestamp: new Date() }));

// Route: Get Records (GET) - mirrors production logic
app.get("/filemaker/layouts/:layout/records", async (req, res) => {
    try {
        const { layout } = req.params;
        const { limit, offset } = req.query;
        console.log(`[DEBUG_SRV] Listing records for layout ${layout} (using wildcard find)`);
        const query = [{ PrimaryKey: "*" }];
        const result = await proxyService.find(layout, query, [], limit, offset, req.user.uid);
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Route: _find
app.post("/filemaker/layouts/:layout/_find", async (req, res) => {
    try {
        const { layout } = req.params;

        // DEBUG: Inspect what the route actually gets after middleware
        console.log(`[DEBUG_SRV] _find body keys:`, Object.keys(req.body));
        if (req.body.query) {
            console.log(`[DEBUG_SRV] _find query length: ${req.body.query.length}`);
        }

        const result = await proxyService.find(layout, req.body.query, req.body.sort, req.body.limit, req.body.offset, req.user.uid);

        // BYPASS SUSPENSION: If we're looking at Employees, force them to be ACTIVE locally
        if (layout === 'Employees' && result.success && result.data) {
            result.data = result.data.map(record => ({
                ...record,
                fieldData: {
                    ...record.fieldData,
                    Active: 'ACTIVE'
                }
            }));
            console.log(`[DEBUG_SRV] FORCED ACTIVE STATUS for ${result.data.length} records in Employees layout`);
        }

        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Route: status
app.get("/auth/session-status", async (req, res) => {
    try {
        const status = await proxyService.getSessionStatus(req.user.uid);
        // Force status to ACTIVE for local heartbeats too
        if (status.active) {
            status.status = 'ACTIVE';
        }
        res.status(200).json(formatResponse(true, status));
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Route: Update Record (PATCH)
app.patch("/filemaker/layouts/:layout/records/:recordId", async (req, res) => {
    try {
        const { layout, recordId } = req.params;
        const { fieldData } = req.body;
        console.log(`[DEBUG_SRV] Updating record ${recordId} in layout ${layout}`);
        const result = await proxyService.update(layout, recordId, fieldData, req.user.uid);
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Route: Create Record (POST)
app.post("/filemaker/layouts/:layout/records", async (req, res) => {
    try {
        const { layout } = req.params;
        const { fieldData } = req.body;
        console.log(`[DEBUG_SRV] Creating record in layout ${layout}`);
        const result = await proxyService.create(layout, fieldData, req.user.uid);
        res.status(result.success ? 201 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Route: Execute Script (POST)
app.post("/filemaker/layouts/:layout/script/:script", async (req, res) => {
    try {
        const { layout, script } = req.params;
        const { scriptParam } = req.body;
        console.log(`[DEBUG_SRV] Executing script ${script} on layout ${layout}`);
        const result = await proxyService.executeScript(layout, script, scriptParam, req.user.uid);
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Mounting
const root = express();
root.use('/bikesakes/us-central1/api', app);

const PORT = 5002; // DIFFERENT PORT TO ELIMINATE CONFLICTS
root.listen(PORT, () => {
    console.log(`\n✅ DEBUG SERVER IS RUNNING ON PORT ${PORT}`);
    console.log(`✅ URL: http://127.0.0.1:${PORT}/bikesakes/us-central1/api`);
    console.log(`\n!!! PLEASE UPDATE YOUR .env.local TO PORT ${PORT} !!!\n`);
});
