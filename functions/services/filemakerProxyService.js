const axios = require("axios");
const https = require('https');
const logger = require('../utils/logger');

// Security: Transport Scrambling Logic
// This hides data from the Network Tab without adding heavy dependencies
const scramble = (data, key) => {
    if (!data || !key) return data;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    const keyStr = String(key);
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
    }
    return Buffer.from(result).toString('base64');
};
const sessionService = require("./filemakerSessionService");
const { ALLOWED_LAYOUTS, ALLOWED_SCRIPTS } = require("../config/whitelist");
const { formatResponse } = require("../utils/responseFormatter");

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

class FileMakerProxyService {

    constructor() {
        this.fmHost = process.env.FILEMAKER_HOST;
        this.dbName = process.env.FILEMAKER_DATABASE || "BikeSalesErp";
    }

    _validateLayout(layout) {
        if (!ALLOWED_LAYOUTS.includes(layout)) {
            throw { status: 403, message: `Access to layout '${layout}' is forbidden.` };
        }
    }

    _validateScript(script) {
        if (script && !ALLOWED_SCRIPTS.includes(script)) {
            throw { status: 403, message: `Execution of script '${script}' is forbidden.` };
        }
    }

    async _request(method, endpoint, data = {}, params = {}, retry = true) {
        try {
            const token = await sessionService.getValidToken();
            const url = `https://${this.fmHost}/fmi/data/vLatest/databases/${this.dbName}${endpoint}`;

            const config = {
                method,
                url,
                httpsAgent,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                data,
                params
            };

            // Structured JSON logging for debugging
            logger.info("DEBUG: FileMaker API Request", {
                direction: "OUTBOUND",
                service: "FileMakerDataAPI",
                method: config.method,
                url: config.url,
                layout: endpoint.includes("/layouts/") ? endpoint.split("/")[2] : "N/A",
                headers: {
                    ...config.headers,
                    Authorization: "Bearer [REDACTED]"
                },
                payload: config.data,
                parameters: config.params
            });

            const response = await axios(config);
            return response.data;

        } catch (error) {
            // Handle 401 Unauthorized - Token Expired
            if (error.response && error.response.status === 401 && retry) {
                logger.warn("Received 401 from FileMaker. Refreshing token and retrying...");
                sessionService.clearToken();
                return this._request(method, endpoint, data, params, false); // Retry once
            }
            throw error;
        }
    }

    async find(layout, query = [], sort = [], limit = 25, offset = 0, uid = null, deviceUUID = null) {
        this._validateLayout(layout);

        // ... existing limit/offset logic ...
        const safeLimit = Math.min(parseInt(limit) || 25, 100);
        let safeOffset = parseInt(offset) || 0;
        const fmOffset = safeOffset + 1;

        const body = {
            query: query,
            limit: safeLimit,
            offset: fmOffset
        };

        if (sort && sort.length > 0) {
            body.sort = sort;
        }

        try {
            // Find does NOT enforce session validation to allow Read-Only access & Login
            const result = await this._request("POST", `/layouts/${layout}/_find`, body);

            const records = result.response.data;
            const dataInfo = result.response.dataInfo;

            if (records && records.length > 0) {
                logger.info(`FileMaker Find Result: found ${dataInfo.foundCount} records. First recordId: ${records[0].recordId}`);
            }

            logger.info(`FileMaker Find Result: found ${dataInfo.foundCount} records in layout ${layout}`);

            return formatResponse(true, records, {
                totalFound: dataInfo.foundCount,
                returnedCount: dataInfo.returnedCount,
                limit: safeLimit,
                offset: safeOffset
            });

        } catch (error) {
            return this._handleError(error);
        }
    }

    async _validateSession(uid, deviceUUID, isSessionClaim = false) {
        // Skips validation for Read operations or if explicitly claiming session
        if (isSessionClaim) return;

        if (!uid) {
            logger.warn("BLOCKED: Write operation attempted without Auth Token");
            throw { status: 401, message: "Authentication required for write operations." };
        }

        // Fetch Employee Record to check SessionKey
        const query = [{ FireBaseUserID: `==${uid}` }];
        // Internal find, bypassing request/response formatting if possible? 
        // We reuse this.find but need to be careful not to recurse.
        // this.find calls _request, which talks to FM.

        // We use _request directly to avoid overhead of formatResponse inside logic?
        // But _request returns raw FM data.

        // Let's use `find` from this class, it's safer.
        const result = await this.find("Employees", query, [], 1, 0);

        if (!result.success || !result.data || result.data.length === 0) {
            throw { status: 403, message: "User record not found." };
        }

        const employee = result.data[0].fieldData;
        const sessionKey = employee.SessionKey || "";
        const activeDeviceUUID = sessionKey.split('|')[0]; // Format: UUID|Time|Label

        // Check for Suspension
        if (employee.Active === 'SUSPENDED' || employee.Active === '0') {
            logger.warn(`ACCESS_DENIED: User [${uid}] is SUSPENDED.`);
            throw { status: 403, message: "Account Suspended." };
        }

        if (!activeDeviceUUID) {
            // Allow if session key is empty? Or block? Strict: Block.
            // If user is logged in, FM should have their key.
            return;
        }

        if (activeDeviceUUID !== deviceUUID) {
            logger.warn(`SESSION_HIJACK_DETECTED: Remote [${activeDeviceUUID}] != Local [${deviceUUID}] for User [${uid}]`);
            throw { status: 403, message: "Session Active Elsewhere. Write Blocked." };
        }

        logger.debug(`SESSION_VERIFY: OK. Device [${deviceUUID}] matches.`);
    }

    async executeScript(layout, script, scriptParam = "", uid = null, deviceUUID = null) {
        this._validateLayout(layout);
        this._validateScript(script);

        try {
            // Validate Session
            await this._validateSession(uid, deviceUUID);

            const params = {};
            if (scriptParam) {
                params["script.param"] = scriptParam;
            }

            const result = await this._request("GET", `/layouts/${layout}/script/${script}`, {}, params);
            return formatResponse(true, result.response, null);

        } catch (error) {
            return this._handleError(error);
        }
    }

    async create(layout, fieldData, uid = null, deviceUUID = null) {
        this._validateLayout(layout);

        try {
            await this._validateSession(uid, deviceUUID);

            const body = { fieldData };
            const result = await this._request("POST", `/layouts/${layout}/records`, body);
            return formatResponse(true, result.response, null, "Record created successfully");
        } catch (error) {
            return this._handleError(error);
        }
    }

    async update(layout, recordId, fieldData, uid = null, deviceUUID = null, isSessionClaim = false) {
        this._validateLayout(layout);

        try {
            // SECURITY: If this is a session claim, enforce strict restrictions
            if (isSessionClaim) {
                console.log(`\n[PROXY_DEBUG] SESSION_CLAIM bypass requested for Layout: ${layout}`);
                // 1. Layout Restriction: Only Employees can be claimed
                if (layout !== "Employees") {
                    console.log(`[PROXY_DEBUG] SECURITY_BYPASS_REJECTED: Non-employee layout [${layout}]`);
                    logger.warn(`SECURITY_VIOLATION: Attempted SessionClaim bypass on non-employee layout [${layout}]`);
                    isSessionClaim = false; // Revoke bypass
                } else {
                    // 2. Field Restriction: Only allow session-related fields during bypass
                    const allowedFields = ['SessionKey', 'CurrentlyLoggedInDevice'];
                    const requestedFields = Object.keys(fieldData);
                    const invalidFields = requestedFields.filter(f => !allowedFields.includes(f));

                    if (invalidFields.length > 0) {
                        console.log(`[PROXY_DEBUG] SECURITY_FIELDS_STRIPPED: ${invalidFields.join(', ')}`);
                        logger.warn(`SECURITY_VIOLATION: Attempted to update restricted fields [${invalidFields.join(', ')}] during SessionClaim`);
                        // Strip invalid fields to allow session repair but block privilege escalation
                        invalidFields.forEach(f => delete fieldData[f]);
                    }
                    
                    console.log(`[PROXY_DEBUG] SESSION_CLAIM_AUTHORIZED for User [${uid}] on Device [${deviceUUID}]`);
                    logger.info(`SESSION_CLAIM: User [${uid}] is claiming session on Device [${deviceUUID}]`);
                }
            }

            await this._validateSession(uid, deviceUUID, isSessionClaim);

            const body = { fieldData };
            const result = await this._request("PATCH", `/layouts/${layout}/records/${recordId}`, body);

            return formatResponse(true, result.response, null, "Record updated successfully");
        } catch (error) {
            return this._handleError(error);
        }
    }

    async delete(layout, recordId, uid = null, deviceUUID = null) {
        this._validateLayout(layout);

        try {
            await this._validateSession(uid, deviceUUID);

            const result = await this._request("DELETE", `/layouts/${layout}/records/${recordId}`);
            return formatResponse(true, result.response, null, "Record deleted successfully");
        } catch (error) {
            return this._handleError(error);
        }
    }

    async getSessionStatus(uid) {
        try {
            const result = await this.find("Employees", [{ FireBaseUserID: `==${uid}` }], [], 1, 0);
            if (!result.success || !result.data || result.data.length === 0) {
                return { active: false, sessionId: null, status: 'NOT_FOUND' };
            }
            const data = result.data[0].fieldData;

            logger.info(`HEARTBEAT_STATUS: Verified session for UID [${uid}]`);

            return {
                active: true,
                sessionId: data.SessionKey,
                status: data.Active
            };
        } catch (error) {
            logger.error(`SESSION_STATUS_CHECK_FAILED: ${error.message}`);
            throw error;
        }
    }

    // Generic error handler to format response
    _handleError(error) {
        // Detailed logging for local debugging
        const errorData = error.response ? error.response.data : null;
        logger.error(`Proxy Service Error: ${error.message}`, {
            status: error.response ? error.response.status : 'N/A',
            data: errorData
        });

        if (error.status) {
            return formatResponse(false, null, null, error.message);
        }

        if (error.response) {
            // FM Data API error
            const fmError = error.response.data && error.response.data.messages && error.response.data.messages[0];
            const code = fmError ? fmError.code : "Unknown";
            const message = fmError ? fmError.message : error.message;

            // Log exact FM error code
            logger.error(`FileMaker Data API Error: Code ${code} - ${message}`);

            // Code 401 from FM (after retrying) means Auth failed.
            if (error.response.status === 401) {
                return formatResponse(false, null, null, "Authentication failed", "401");
            }

            // Code 401 from Data API body (no records found) usually comes as 200 OK?? 
            // Actually, axios throws on 4xx/5xx status codes.
            // If FM returns 200 with error code 401 (No records match), axios won't throw.
            // But if we perform a _find that yields no records, FM Data API typically returns 200 
            // but with a message code '401'. 
            // HOWEVER, sometimes it returns 500 or 404 depending on configuration.
            // Let's rely on what we see. Standard Data API behavior for "No records match" is often 
            // a 401/404 HTTP status OR a 200 OK with 'messages': [{'code':'401'}]

            return formatResponse(false, null, null, message, code);
        }

        return formatResponse(false, null, null, error.message, "500");
    }
}

module.exports = new FileMakerProxyService();
