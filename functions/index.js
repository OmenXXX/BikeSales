require('dotenv').config();
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const proxyService = require("./services/filemakerProxyService");
const { formatResponse } = require("./utils/responseFormatter");

admin.initializeApp();

const app = express();

// Middleware
// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Ensure JSON headers for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Authentication Middleware
const validateFirebaseIdToken = async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    logger.warn('No Firebase ID token found in request headers.');
    // For now, we allow unauthenticated requests to proceed with a warning, 
    // unless it's a Write operation which Proxy will block?
    // User requested "All 'Write' operations ... must include ... Proxy to verify".
    // If we block here, we block everything.
    // Let's attach user if present, else null.
    req.user = null;
    next();
    return;
  }

  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedIdToken;
    logger.info(`AUTH_SUCCESS: Verified token for user ${decodedIdToken.uid}`);
    next();
  } catch (error) {
    logger.error('Error while verifying Firebase ID token:', error);
    res.status(403).json(formatResponse(false, null, null, "Unauthorized: Invalid Token", "403"));
  }
};

const scrambleMiddleware = require('./middleware/scrambleMiddleware');

app.use(validateFirebaseIdToken);
app.use(scrambleMiddleware);

// Routes with Session Context

/**
 * FIND Records
 */
app.post("/filemaker/layouts/:layout/_find", async (req, res) => {
  const { layout } = req.params;
  const { query, sort, limit, offset } = req.body;

  // DEBUG LOGGING
  logger.info(`API_REQUEST: _find on layout ${layout}`, {
    hasQuery: !!query,
    bodyKeys: Object.keys(req.body),
    user: req.user ? req.user.uid : 'Unauthenticated'
  });

  // Enforce Authentication
  if (!req.user) {
    logger.warn(`BLOCKED: Unauthenticated _find attempt on ${layout}`);
    return res.status(401).json(formatResponse(false, null, null, "Authentication Required"));
  }

  try {
    const deviceUUID = req.headers['x-device-uuid'];

    logger.debug("INCOMING: _find", { layout, uid: req.user?.uid, deviceUUID });

    const result = await proxyService.find(layout, query, sort, limit, offset, req.user?.uid, deviceUUID);
    logger.debug("OUTGOING: _find", { success: result.success });

    res.status(result.success ? 200 : (result.filemakerCode === "401" ? 404 : 500)).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET All Records
 */
app.get("/filemaker/layouts/:layout/records", async (req, res) => {
  try {
    const { layout } = req.params;
    const { limit, offset } = req.query;
    const deviceUUID = req.headers['x-device-uuid'];

    logger.debug("INCOMING: records", { layout, uid: req.user?.uid });

    const query = [{ PrimaryKey: "*" }];
    const result = await proxyService.find(layout, query, [], limit, offset, req.user?.uid, deviceUUID);

    res.status(result.success ? 200 : (result.filemakerCode === "401" ? 404 : 500)).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * STRUCTURE: Get All Centers
 */
app.get("/structure/centers", async (req, res) => {
  try {
    const deviceUUID = req.headers['x-device-uuid'];
    const result = await proxyService.find("Centers", [{ PrimaryKey: "*" }], [], 1000, 0, req.user?.uid, deviceUUID);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * STRUCTURE: Get All Warehouses
 */
app.get("/structure/warehouses", async (req, res) => {
  try {
    const deviceUUID = req.headers['x-device-uuid'];
    const result = await proxyService.find("Warehouses", [{ PrimaryKey: "*" }], [], 1000, 0, req.user?.uid, deviceUUID);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * STRUCTURE: Get All Modules
 */
app.get("/structure/modules", async (req, res) => {
  try {
    const deviceUUID = req.headers['x-device-uuid'];
    const result = await proxyService.find("Modules", [{ Active: "1" }], [], 1000, 0, req.user?.uid, deviceUUID);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * EXECUTE SCRIPT
 */
app.post("/filemaker/layouts/:layout/script/:script", async (req, res) => {
  try {
    const { layout, script } = req.params;
    const { scriptParam } = req.body;
    const deviceUUID = req.headers['x-device-uuid'];

    const result = await proxyService.executeScript(layout, script, scriptParam, req.user?.uid, deviceUUID);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * CREATE Record
 */
app.post("/filemaker/layouts/:layout/records", async (req, res) => {
  try {
    const { layout } = req.params;
    const { fieldData } = req.body;
    const deviceUUID = req.headers['x-device-uuid'];

    logger.info("INCOMING: create", { layout, uid: req.user?.uid, deviceUUID });

    const result = await proxyService.create(layout, fieldData, req.user?.uid, deviceUUID);
    res.status(result.success ? 201 : 500).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * UPDATE Record
 */
app.patch("/filemaker/layouts/:layout/records/:recordId", async (req, res) => {
  try {
    const { layout, recordId } = req.params;
    const { fieldData } = req.body;
    const deviceUUID = req.headers['x-device-uuid'];

    logger.info("INCOMING: update", { layout, recordId, uid: req.user?.uid, deviceUUID });

    const result = await proxyService.update(layout, recordId, fieldData, req.user?.uid, deviceUUID);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GLOBAL LOGOUT
 * POST /auth/logout-global
 */
app.post("/auth/logout-global", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(formatResponse(false, null, null, "Unauthorized"));
    }

    await admin.auth().revokeRefreshTokens(req.user.uid);
    logger.info(`TOKEN_REVOKED: Global logout for user ${req.user.uid}`);

    res.status(200).json(formatResponse(true, null, null, "Global logout successful"));
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * ADMIN: Suspend User
 * POST /admin/suspend-user
 */
app.post("/admin/suspend-user", async (req, res) => {
  try {
    // TODO: Add RBAC check here (Middleware? or check role in token)
    const { uid, recordId } = req.body;

    // 1. Update FileMaker
    const employeeResult = await proxyService.find("Employees", [{ recordId: `==${recordId}` }], [], 1, 0);
    const employeeName = employeeResult.data?.[0]?.fieldData?.Name_First || uid;

    await proxyService.update("Employees", recordId, { Active: "SUSPENDED" }, req.user.uid, req.headers['x-device-uuid']);

    // 2. Revoke Tokens & Disable in Firebase
    await admin.auth().revokeRefreshTokens(uid);
    await admin.auth().updateUser(uid, { disabled: true });

    logger.info(`KILLED: Account for [${employeeName}] suspended by Admin; tokens revoked`);

    res.status(200).json(formatResponse(true, null, null, "User Suspended"));
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * ADMIN: Activate User
 * POST /admin/activate-user
 */
app.post("/admin/activate-user", async (req, res) => {
  try {
    const { uid, recordId } = req.body;

    logger.info(`ADMIN_CONTROL: Activating User ${uid}`);

    // 1. Update FileMaker (Reset Session to allow login)
    await proxyService.update("Employees", recordId, {
      Active: "1",
      SessionKey: ""
    }, req.user.uid, req.headers['x-device-uuid']);

    // 2. Enable in Firebase
    await admin.auth().updateUser(uid, { disabled: false });

    res.status(200).json(formatResponse(true, null, null, "User Activated"));
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * ADMIN: Update User Credentials (Firebase Auth Sync)
 * POST /admin/update-credentials
 */
app.post("/admin/update-credentials", async (req, res) => {
  try {
    const { uid, email, password } = req.body;

    if (!uid) {
      return res.status(400).json(formatResponse(false, null, null, "User UID is required"));
    }

    const updates = {};
    if (email) updates.email = email;
    if (password) updates.password = password;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json(formatResponse(false, null, null, "No updates provided"));
    }

    // Update Firebase Auth
    await admin.auth().updateUser(uid, updates);

    // If password was changed, revoke tokens to force re-login
    if (password) {
      await admin.auth().revokeRefreshTokens(uid);
      logger.info(`CREDENTIAL_SYNC: Password updated for user ${uid}; tokens revoked`);
    } else {
      logger.info(`CREDENTIAL_SYNC: Email updated for user ${uid}`);
    }

    res.status(200).json(formatResponse(true, null, null, "Credentials updated successfully in Firebase"));
  } catch (error) {
    logger.error("CREDENTIAL_SYNC_ERROR", error);
    // Handle specific Firebase errors (e.g. email already in use)
    let message = error.message;
    if (error.code === 'auth/email-already-exists') {
      message = "This email is already associated with another account.";
    }
    res.status(400).json(formatResponse(false, null, null, message));
  }
});

app.get("/auth/session-status", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(formatResponse(false, null, null, "Unauthorized"));
    }
    const status = await proxyService.getSessionStatus(req.user.uid);
    res.status(200).json(formatResponse(true, status));
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET Employee Data (scrambled)
 * GET /auth/get-employee
 */
app.get("/auth/get-employee", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(formatResponse(false, null, null, "Unauthorized"));
    }
    const deviceUUID = req.headers['x-device-uuid'];
    // Assuming 'FirebaseUID' is the field in the Employees layout that stores the Firebase UID
    const employeeResult = await proxyService.find("Employees", [{ FirebaseUID: `==${req.user.uid}` }], [], 1, 0, req.user.uid, deviceUUID);

    if (!employeeResult.success || !employeeResult.data || employeeResult.data.length === 0) {
      return res.status(404).json(formatResponse(false, null, null, "Employee record not found"));
    }

    const employee = employeeResult.data[0]; // Get the first employee record

    // For employee data, we scramble the transport to hide from Network Tab
    res.status(200).json(formatResponse(true, {
      employee
    }));
  } catch (error) {
    handleError(res, error);
  }
});


// Centralized Error Handling for Express Routes
function handleError(res, error) {
  logger.error("API Error", error);
  const status = error.status || 500;
  const message = error.message || "Internal Server Error";
  res.status(status).json(formatResponse(false, null, null, message));
}

// Expose Express App as Cloud Function
exports.api = onRequest(app);
