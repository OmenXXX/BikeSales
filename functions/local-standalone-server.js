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

/**
 * INVENTORY: Adjust (single source of truth)
 * - Validates required fields
 * - Creates InventoryLogs record
 * - Runs FileMaker script PSOS_UpdateInventory to create/update Inventory
 */
app.post("/inventory/adjust", async (req, res) => {
    try {
        const deviceUUID = req.headers['x-device-uuid'];
        const {
            ProductID,
            WarehouseID,
            Qty,
            AdjustmentType,
            Reason,
            PerformedByUserID,
            PerformedByUser
        } = req.body || {};

        // Resolve operator from session (preferred) if not provided by UI
        let resolvedPerformedByUserID = PerformedByUserID ? String(PerformedByUserID) : "";
        let resolvedPerformedByUser = PerformedByUser ? String(PerformedByUser) : "";
        if (!resolvedPerformedByUserID) {
            const employeeResult =
                (await proxyService.find(
                    "Employees",
                    [{ FireBaseUserID: `==${req.user?.uid}` }],
                    [],
                    1,
                    0,
                    req.user?.uid,
                    deviceUUID
                )) ||
                (await proxyService.find(
                    "Employees",
                    [{ FirebaseUID: `==${req.user?.uid}` }],
                    [],
                    1,
                    0,
                    req.user?.uid,
                    deviceUUID
                ));

            const emp = employeeResult?.data?.[0]?.fieldData;
            resolvedPerformedByUserID = emp?.EmployeeID ? String(emp.EmployeeID) : "";
            if (!resolvedPerformedByUser) {
                const name = [emp?.Name_First, emp?.Name_Last].filter(Boolean).join(" ").trim();
                resolvedPerformedByUser = name || emp?.DisplayName || emp?.LoginName || "";
            }
        }

        const missing = [];
        if (!ProductID) missing.push("ProductID");
        if (!WarehouseID) missing.push("WarehouseID");
        if (Qty == null || Qty === "" || Number.isNaN(Number(Qty))) missing.push("Qty");
        if (!AdjustmentType) missing.push("AdjustmentType");
        if (!resolvedPerformedByUserID) missing.push("PerformedByUserID");
        if (!Reason) missing.push("Reason");

        if (missing.length > 0) {
            return res.status(400).json(formatResponse(false, null, null, `Missing/invalid fields: ${missing.join(", ")}`));
        }

        const qtyNum = Number(Qty);
        if (qtyNum <= 0) {
            return res.status(400).json(formatResponse(false, null, null, "Qty must be > 0"));
        }

        const normalizedType = String(AdjustmentType).toUpperCase();
        const signedQty = normalizedType === "SUBTRACT" || normalizedType === "OUT" ? -Math.abs(qtyNum) : Math.abs(qtyNum);
        const logAdjustmentType = signedQty >= 0 ? "ADJUSTMENT IN" : "ADJUSTMENT OUT";

        const logData = {
            ProductID: String(ProductID),
            WarehouseID: String(WarehouseID),
            AdjustmentType: logAdjustmentType,
            Reason: String(Reason),
            Quantity: signedQty,
            PerformedByUser: resolvedPerformedByUser,
            PerformedByUserID: resolvedPerformedByUserID
        };

        console.log(`[LOCAL_SRV] INVENTORY_ADJUST -> InventoryLogs + PSOS_UpdateInventory script`);
        console.log(`[LOCAL_SRV] DeviceUUID Header: ${deviceUUID}`);
        console.log(`[LOCAL_SRV] Payload:`, JSON.stringify({ ProductID, WarehouseID, Qty: qtyNum, AdjustmentType: normalizedType }, null, 2));

        const logResult = await proxyService.create("InventoryLogs", logData, req.user?.uid, deviceUUID);
        if (!logResult.success) {
            return res.status(500).json(logResult);
        }

        const scriptParam = JSON.stringify({
            ProductID: String(ProductID),
            WarehouseID: String(WarehouseID),
            Qty: qtyNum,
            AdjustmentType: normalizedType,
            PerformedByUser: resolvedPerformedByUser,
            PerformedByUserID: resolvedPerformedByUserID,
            Reason: String(Reason)
        });

        const scriptResult = await proxyService.executeScript("Inventory", "PSOS_UpdateInventory", scriptParam, req.user?.uid, deviceUUID);
        if (!scriptResult.success) {
            return res.status(500).json(formatResponse(false, { logResult, scriptResult }, null, "Adjustment logged, but inventory script failed"));
        }

        const scriptResultText =
            (scriptResult && scriptResult.data && (scriptResult.data.scriptResult ?? scriptResult.data.script_result)) ?? "";

        let parsed = null;
        if (typeof scriptResultText === "string" && scriptResultText.trim().startsWith("{")) {
            try {
                parsed = JSON.parse(scriptResultText);
            } catch {
                parsed = null;
            }
        }

        const status = parsed?.Status || parsed?.status;
        const message = parsed?.Message || parsed?.message;
        if (status && String(status).toLowerCase() !== "success") {
            return res.status(400).json(formatResponse(false, { logResult, scriptResult }, null, message || "Inventory script failed"));
        }

        return res.status(200).json(formatResponse(true, { logResult, scriptResult, scriptParsed: parsed }, null, "Inventory adjusted"));
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
