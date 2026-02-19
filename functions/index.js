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

app.use(cors({ origin: true }));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

const validateFirebaseIdToken = async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    logger.warn('No Firebase ID token found in request headers.');
    req.user = null;
    next();
    return;
  }

  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedIdToken;
    next();
  } catch (error) {
    logger.error('Error while verifying Firebase ID token:', error);
    res.status(403).json(formatResponse(false, null, null, "Unauthorized: Invalid Token", "403"));
  }
};

app.use(validateFirebaseIdToken);

app.post("/filemaker/layouts/:layout/_find", async (req, res) => {
  try {
    const { layout } = req.params;
    const { query, sort, limit, offset } = req.body;
    const deviceUUID = req.headers['x-device-uuid'];
    const result = await proxyService.find(layout, query, sort, limit, offset, req.user?.uid, deviceUUID);
    res.status(result.success ? 200 : (result.filemakerCode === "401" ? 404 : 500)).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/filemaker/layouts/:layout/records", async (req, res) => {
  try {
    const { layout } = req.params;
    const { limit, offset } = req.query;
    const deviceUUID = req.headers['x-device-uuid'];
    const query = [{ PrimaryKey: "*" }];
    const result = await proxyService.find(layout, query, [], limit, offset, req.user?.uid, deviceUUID);
    res.status(result.success ? 200 : (result.filemakerCode === "401" ? 404 : 500)).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

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

app.post("/filemaker/layouts/:layout/records", async (req, res) => {
  try {
    const { layout } = req.params;
    const { fieldData } = req.body;
    const deviceUUID = req.headers['x-device-uuid'];
    const result = await proxyService.create(layout, fieldData, req.user?.uid, deviceUUID);
    res.status(result.success ? 201 : 500).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

app.patch("/filemaker/layouts/:layout/records/:recordId", async (req, res) => {
  try {
    const { layout, recordId } = req.params;
    const { fieldData } = req.body;
    const deviceUUID = req.headers['x-device-uuid'];
    const result = await proxyService.update(layout, recordId, fieldData, req.user?.uid, deviceUUID);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/auth/logout-global", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(formatResponse(false, null, null, "Unauthorized"));
    }
    await admin.auth().revokeRefreshTokens(req.user.uid);
    res.status(200).json(formatResponse(true, null, null, "Global logout successful"));
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/admin/suspend-user", async (req, res) => {
  try {
    const { uid, recordId } = req.body;
    await proxyService.update("Employees", recordId, { z_active_state: "SUSPENDED" }, req.user.uid, req.headers['x-device-uuid']);
    await admin.auth().revokeRefreshTokens(uid);
    await admin.auth().updateUser(uid, { disabled: true });
    res.status(200).json(formatResponse(true, null, null, "User Suspended"));
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/admin/activate-user", async (req, res) => {
  try {
    const { uid, recordId } = req.body;
    await proxyService.update("Employees", recordId, {
      z_active_state: "ACTIVE",
      z_session_id: ""
    }, req.user.uid, req.headers['x-device-uuid']);
    await admin.auth().updateUser(uid, { disabled: false });
    res.status(200).json(formatResponse(true, null, null, "User Activated"));
  } catch (error) {
    handleError(res, error);
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

function handleError(res, error) {
  logger.error("API Error", error);
  const status = error.status || 500;
  const message = error.message || "Internal Server Error";
  res.status(status).json(formatResponse(false, null, null, message));
}

exports.api = onRequest(app);
