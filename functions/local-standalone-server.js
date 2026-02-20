const path = require('path');
const envPath = path.resolve(__dirname, '.env');
require('dotenv').config({ path: envPath });

const express = require('express');
const cors = require('cors');

const proxyService = require("./services/filemakerProxyService");
const { formatResponse } = require("./utils/responseFormatter");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// SUPER VERBOSE LOGGER
app.use((req, res, next) => {
    console.log(`[LOCAL_SRV] ${new Date().toLocaleTimeString()} -> ${req.method} ${req.url}`);
    next();
});

// Mock Auth - Using the real UID found in logs to ensure session lookups work
app.use((req, res, next) => {
    req.user = { uid: "IvmpqrKNcrM9vB67ApEltuiU5h92", email: "local@example.com" };
    next();
});

app.get("/ping", (req, res) => res.json({ status: "alive[VERSION 3.5]", timestamp: new Date() }));

// Route: Get Records (GET) - uses wildcard find per USER request
app.get("/filemaker/layouts/:layout/records", async (req, res) => {
    try {
        const { layout } = req.params;
        const { limit, offset } = req.query;
        console.log(`[LOCAL_SRV] Listing records for layout ${layout} (Wildcard Search: PrimaryKey: *)`);
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
        const result = await proxyService.find(layout, req.body.query, req.body.sort, req.body.limit, req.body.offset, req.user.uid);
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Route: status
app.get("/auth/session-status", async (req, res) => {
    try {
        const status = await proxyService.getSessionStatus(req.user.uid);
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
        console.log(`[LOCAL_SRV] Updating record ${recordId} in layout ${layout}`);
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
        console.log(`[LOCAL_SRV] Creating record in layout ${layout}`);
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
        console.log(`[LOCAL_SRV] Executing script ${script} on layout ${layout}`);
        const result = await proxyService.executeScript(layout, script, scriptParam, req.user.uid);
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Mounting
const root = express();
root.use('/bikesakes/us-central1/api', app);

const PORT = 5001;
root.listen(PORT, () => {
    console.log(`\n🚀 [LOCAL STANDALONE SERVER] Version 3.5`);
    console.log(`✅ RUNNING ON PORT ${PORT}`);
    console.log(`\nURL: http://127.0.0.1:${PORT}/bikesakes/us-central1/api`);
});
