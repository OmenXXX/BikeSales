const path = require('path');
const envPath = path.resolve(__dirname, '.env');
require('dotenv').config({ path: envPath });

const express = require('express');
const cors = require('cors');

const proxyService = require("./services/filemakerProxyService");
const { formatResponse } = require("./utils/responseFormatter");
const scrambleMiddleware = require('./middleware/scrambleMiddleware');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// SUPER VERBOSE LOGGER
app.use((req, res, next) => {
    console.log(`[LOCAL_SRV] ${new Date().toLocaleTimeString()} -> ${req.method} ${req.url}`);
    next();
});

// Mock Auth - Dynamically extract UID from token to ensure descrambling works
app.use((req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            const token = req.headers.authorization.split('Bearer ')[1];
            // Decode JWT payload without verification for local development
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            req.user = { uid: payload.user_id || payload.uid, email: payload.email };
            console.log(`[LOCAL_SRV] Detected User: ${req.user.uid}`);
        } catch (e) {
            req.user = { uid: "IvmpqrKNcrM9vB67ApEltuiU5h92", email: "local@example.com" };
        }
    } else {
        req.user = { uid: "IvmpqrKNcrM9vB67ApEltuiU5h92", email: "local@example.com" };
    }
    next();
});

// Apply Scramble Middleware
app.use(scrambleMiddleware);

// Enhanced Logging for Debugging Payload issues
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PATCH') {
        console.log(`[LOCAL_SRV] Final Body State for ${req.url}:`, JSON.stringify(req.body, null, 2));
    }
    next();
});

app.get("/", (req, res) => res.json({
    message: "Nexora ERP Standalone Proxy Server is running.",
    endpoints: [
        "/ping",
        "/filemaker/layouts/:layout/records",
        "/filemaker/layouts/:layout/_find"
    ]
}));

const partnersMock = require('../scripts/partners.json');

app.get("/filemaker/layouts/BusinessPartners/records", (req, res) => {
    console.log(`[LOCAL_SRV] Serving MOCK records for layout BusinessPartners`);
    res.status(200).json(formatResponse(true, partnersMock, {
        totalFound: partnersMock.length,
        returnedCount: partnersMock.length,
        limit: 100,
        offset: 0
    }));
});

app.get("/ping", (req, res) => res.json({ status: "alive[VERSION 3.7]", timestamp: new Date() }));

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

/**
 * STRUCTURE: Get All Centers
 */
app.get("/structure/centers", async (req, res) => {
    try {
        const result = await proxyService.find("Centers", [{ PrimaryKey: "*" }], [], 1000, 0, req.user.uid);
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

/**
 * STRUCTURE: Get All Warehouses
 */
app.get("/structure/warehouses", async (req, res) => {
    try {
        const result = await proxyService.find("Warehouses", [{ PrimaryKey: "*" }], [], 1000, 0, req.user.uid);
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

/**
 * STRUCTURE: Get All Modules
 */
app.get("/structure/modules", async (req, res) => {
    try {
        const result = await proxyService.find("Modules", [{ Active: "1" }], [], 1000, 0, req.user.uid);
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

/**
 * GET Employee Data (scrambled)
 */
app.get("/auth/get-employee", async (req, res) => {
    try {
        const employeeResult = await proxyService.find("Employees", [{ FirebaseUID: `==${req.user.uid}` }], [], 1, 0, req.user.uid);

        if (!employeeResult.success || !employeeResult.data || employeeResult.data.length === 0) {
            return res.status(404).json(formatResponse(false, null, null, "Employee record not found"));
        }

        const employee = employeeResult.data[0];
        res.status(200).json(formatResponse(true, { employee }));
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

/**
 * ADMIN: Update Credentials (Email/Password) - triggered from System Access
 */
app.post("/admin/update-credentials", async (req, res) => {
    try {
        const { employeeId, newEmail, newPassword } = req.body;
        const uid = req.user?.uid;
        const deviceUUID = req.headers['x-device-uuid'];
        console.log(`[LOCAL_SRV] REQUEST: update-credentials for ${employeeId} (Device: ${deviceUUID})`);
        const result = await proxyService.executeScript("Employees", "ADMIN_UpdateCredentials", JSON.stringify({ employeeId, newEmail, newPassword }), uid, deviceUUID);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

/**
 * ADMIN: Suspend/Activate User
 */
app.post("/admin/suspend-user", async (req, res) => {
    try {
        const { employeeId } = req.body;
        const uid = req.user?.uid;
        const deviceUUID = req.headers['x-device-uuid'];
        const result = await proxyService.executeScript("Employees", "ADMIN_SuspendEmployee", employeeId, uid, deviceUUID);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

app.post("/admin/activate-user", async (req, res) => {
    try {
        const { employeeId } = req.body;
        const uid = req.user?.uid;
        const deviceUUID = req.headers['x-device-uuid'];
        const result = await proxyService.executeScript("Employees", "ADMIN_ActivateEmployee", employeeId, uid, deviceUUID);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

/**
 * AUTH: Global Logout
 */
app.post("/auth/logout-global", async (req, res) => {
    try {
        const uid = req.user?.uid;
        const deviceUUID = req.headers['x-device-uuid'];
        const result = await proxyService.executeScript("Employees", "AUTH_LogoutGlobal", "", uid, deviceUUID);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Route: Update Record (PATCH)
app.patch('/filemaker/layouts/:layout/records/:recordId', async (req, res) => {
    try {
        const { layout, recordId } = req.params;
        const { fieldData, isSessionClaim } = req.body;
        const uid = req.user?.uid;
        const deviceUUID = req.headers['x-device-uuid'];

        console.log(`\n[PATCH_DEBUG] Layout: ${layout}, RecordID: ${recordId}`);
        console.log(`[PATCH_DEBUG] isSessionClaim: ${isSessionClaim} (${typeof isSessionClaim})`);
        console.log(`[PATCH_DEBUG] UID: ${uid}`);
        console.log(`[PATCH_DEBUG] DeviceUUID Header: ${deviceUUID}`);
        console.log(`[PATCH_DEBUG] Fields: ${Object.keys(fieldData || {}).join(', ')}`);

        const result = await proxyService.update(layout, recordId, fieldData, uid, deviceUUID, isSessionClaim);
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
        const uid = req.user?.uid;
        const deviceUUID = req.headers['x-device-uuid'];

        console.log(`[LOCAL_SRV] Creating record in layout ${layout}`);
        console.log(`[LOCAL_SRV] DeviceUUID Header: ${deviceUUID}`);

        const result = await proxyService.create(layout, fieldData, uid, deviceUUID);
        res.status(result.success ? 201 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Route: Delete Record (DELETE)
app.delete('/filemaker/layouts/:layout/records/:recordId', async (req, res) => {
    try {
        const { layout, recordId } = req.params;
        const uid = req.user?.uid;
        const deviceUUID = req.headers['x-device-uuid'];

        console.log(`[LOCAL_SRV] Deleting record ${recordId} from layout ${layout}`);
        const result = await proxyService.delete(layout, recordId, uid, deviceUUID);
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        res.status(500).json(formatResponse(false, null, null, error.message));
    }
});

// Route: Execute Script (POST)
app.post("/filemaker/layouts/:layout/script/:script", async (req, res) => {
    try {
        const { layout, script } = req.params;
        const { scriptParam } = req.body;
        const uid = req.user?.uid;
        const deviceUUID = req.headers['x-device-uuid'];

        console.log(`[LOCAL_SRV] Executing script ${script} on layout ${layout}`);
        console.log(`[LOCAL_SRV] DeviceUUID Header: ${deviceUUID}`);

        const result = await proxyService.executeScript(layout, script, scriptParam, uid, deviceUUID);
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
    console.log(`✅ URL: http://127.0.0.1:${PORT}/bikesakes/us-central1/api`);
});

// HEARTBEAT: Keep the process alive even if the event loop is momentarily empty
setInterval(() => {}, 1000 * 60 * 60);
