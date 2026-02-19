const axios = require("axios");
const https = require('https');
const logger = require("firebase-functions/logger");
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

            const response = await axios(config);
            return response.data;

        } catch (error) {
            if (error.response && error.response.status === 401 && retry) {
                sessionService.clearToken();
                return this._request(method, endpoint, data, params, false); 
            }
            throw error;
        }
    }

    async find(layout, query = [], sort = [], limit = 25, offset = 0, uid = null, deviceUUID = null) {
        this._validateLayout(layout);
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
            const result = await this._request("POST", `/layouts/${layout}/_find`, body);
            const records = result.response.data;
            const dataInfo = result.response.dataInfo;

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
        if (isSessionClaim) return;
        if (!uid) {
            throw { status: 401, message: "Authentication required for write operations." };
        }
        const query = [{ FireBaseUserID: `==${uid}` }];
        const result = await this.find("Employees", query, [], 1, 0);

        if (!result.success || !result.data || result.data.length === 0) {
            throw { status: 403, message: "User record not found." };
        }

        const employee = result.data[0].fieldData;
        const sessionKey = employee.z_session_id || "";
        const activeDeviceUUID = sessionKey.split('|')[0]; 

        if (employee.z_active_state === 'SUSPENDED') {
            throw { status: 403, message: "Account Suspended." };
        }

        if (!activeDeviceUUID) return;

        if (activeDeviceUUID !== deviceUUID) {
            throw { status: 403, message: "Session Active Elsewhere. Write Blocked." };
        }
    }

    async executeScript(layout, script, scriptParam = "", uid = null, deviceUUID = null) {
        this._validateLayout(layout);
        this._validateScript(script);

        try {
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

    async update(layout, recordId, fieldData, uid = null, deviceUUID = null) {
        this._validateLayout(layout);

        try {
            // Check if this is a Session Claim (updating z_session_id)
            const isSessionClaim = fieldData.hasOwnProperty('z_session_id');
            await this._validateSession(uid, deviceUUID, isSessionClaim);

            const body = { fieldData };
            const result = await this._request("PATCH", `/layouts/${layout}/records/${recordId}`, body);

            return formatResponse(true, result.response, null, "Record updated successfully");
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
            return {
                active: true,
                sessionId: data.z_session_id,
                status: data.z_active_state
            };
        } catch (error) {
            throw error;
        }
    }

    _handleError(error) {
        if (error.status) return formatResponse(false, null, null, error.message);
        if (error.response) {
            const fmError = error.response.data && error.response.data.messages && error.response.data.messages[0];
            const code = fmError ? fmError.code : "Unknown";
            const message = fmError ? fmError.message : error.message;
            if (error.response.status === 401) return formatResponse(false, null, null, "Authentication failed", "401");
            return formatResponse(false, null, null, message, code);
        }
        return formatResponse(false, null, null, error.message, "500");
    }
}

module.exports = new FileMakerProxyService();
