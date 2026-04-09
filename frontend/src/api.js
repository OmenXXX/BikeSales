import axios from 'axios';
import { auth } from './firebase';
import { scramble, descramble } from './utils/scrambler';

// Get the base URL for the API Cloud Function
// In the new structure, we have a single 'api' Cloud Function exporting an Express app.
// The URL will be http://<host>/<project>/<region>/api
// VITE_API_URL in .env.local should be updated to point to this base.
const API_URL = import.meta.env.VITE_API_URL || '/api';
console.log("%c API: Base URL initialized as:", "color: #fbbf24; font-weight: bold;", API_URL);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Inject Auth Token, Device UUID & Scramble Payload
api.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    let token = null;

    // 1. Firebase ID Token
    if (user) {
        try {
            token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
            console.warn("API: Failed to get ID token", error);
        }
    }

    // 2. Device Identity
    const deviceUUID = localStorage.getItem('device_uuid');
    if (deviceUUID) {
        config.headers['X-Device-UUID'] = deviceUUID;
    }

    // 3. Global Outbound Scrambling (POST/PATCH)
    if ((config.method === 'post' || config.method === 'patch')) {
        if (config.data && user) {
            // Sanitize: Strip __pk_ID from PATCH to prevent FM errors
            if (config.method === 'patch' && config.data.fieldData && config.data.fieldData.__pk_ID) {
                delete config.data.fieldData.__pk_ID;
            }

            const scrambled = scramble(config.data, user.uid);
            config.data = { payload: scrambled };
            // console.log("📤 Sending Scrambled Payload:", config.data);
        } else if (config.data && !user) {
            console.warn("⚠️ Request not scrambled: Missing user", { method: config.method });
        }
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Descramble Incoming Data
api.interceptors.response.use((response) => {
    // Check for Global Scrambling
    if (response.data && response.data._transport === 'XOR_GLOBAL' && response.data.payload) {
        const user = auth.currentUser;
        if (user) {

            const decoded = descramble(response.data.payload, user.uid);
            if (decoded) {
                response.data = decoded; // Unmask for the app
            }
        }
    }
    return response;
}, (error) => {
    return Promise.reject(error);
});

export const loginEmployee = async (loginName, password) => {
    try {
        // Authenticate by finding the employee record
        // POST /filemaker/layouts/Employees/_find
        const response = await api.post('/filemaker/layouts/Employees/_find', {
            query: [{
                LoginName: `==${loginName}`,
                Password: `==${password}`,
                Active: "1"
            }]
        });

        // Response structure from our proxy:
        // { success: true, data: [...records], pagination: {...} }

        if (response.data.success && response.data.data.length > 0) {
            // Return object structure expected by App.jsx
            // App.jsx expects: { employee: ... }
            // Our proxy returns records in 'data' array.
            // Each record is: { fieldData: {...}, portalData: {...}, recordId: "..." }
            // The old code returned: { employee: results[0].fieldData }

            const employeeRecord = response.data.data[0];
            return {
                message: "Login successful",
                employee: employeeRecord.fieldData
            };
        } else {
            throw { error: "Invalid credentials" };
        }

    } catch (error) {
        console.error("Login API Error", error);
        const errorMessage = error.response?.data?.error || error.error || 'Network error';
        throw { error: errorMessage };
    }
};

/**
 * Generic function to fetch records from any FileMaker layout.
 * Automatically chooses between GET (all records) and POST (filtered search).
 */
export const getRecords = async (layout, options = {}) => {
    const { query, sort, limit, offset } = options;

    try {
        let response;
        if (query && query.length > 0) {
            // Use _find for complex queries
            response = await api.post(`/filemaker/layouts/${layout}/_find`, {
                query,
                sort,
                limit,
                offset
            });
        } else {
            // Use records for simple list fetching
            response = await api.get(`/filemaker/layouts/${layout}/records`, {
                params: { limit, offset }
            });
        }

        if (response.data.success) {
            return response.data; // Returns { success, data, pagination }
        } else {
            throw { error: response.data.error || `Failed to fetch records from ${layout}` };
        }
    } catch (error) {
        console.error(`API Error: getRecords(${layout})`, error);
        const errorMessage = error.response?.data?.error || error.error || 'Network error';
        throw { error: errorMessage };
    }
};

export const getEmployees = async (options = {}) => {
    try {
        const result = await getRecords('Employees', options);
        return result; // Return full result including pagination info
    } catch (error) {
        throw error;
    }
};

/**
 * Dedicated semantic endpoints for structural data
 */
export const getCenters = async () => {
    try {
        const response = await api.get('/structure/centers');
        if (response.data.success) return response.data;
        throw { error: response.data.error || "Failed to fetch centers" };
    } catch (error) {
        console.error("API Error: getCenters", error);
        throw error;
    }
};

export const getWarehouses = async () => {
    try {
        const response = await api.get('/structure/warehouses');
        if (response.data.success) return response.data;
        throw { error: response.data.error || "Failed to fetch warehouses" };
    } catch (error) {
        console.error("API Error: getWarehouses", error);
        throw error;
    }
};

export const getModules = async () => {
    try {
        const response = await api.get('/structure/modules');
        if (response.data.success) return response.data;
        throw { error: response.data.error || "Failed to fetch modules" };
    } catch (error) {
        console.error("API Error: getModules", error);
        throw error;
    }
};

/**
 * Inventory adjustment (single backend transaction):
 * - creates InventoryLogs
 * - runs FileMaker script to create/update Inventory
 */
export const adjustInventory = async ({
    ProductID,
    WarehouseID,
    Qty,
    AdjustmentType,
    Reason,
}) => {
    try {
        const response = await api.post('/inventory/adjust', {
            ProductID,
            WarehouseID,
            Qty,
            AdjustmentType,
            Reason
        });

        if (response.data.success) {
            return response.data;
        } else {
            throw { error: response.data.error || 'Failed to adjust inventory' };
        }
    } catch (error) {
        console.error('API Error: adjustInventory', error);
        const errorMessage = error.response?.data?.error || error.error || error.message || 'Network error';
        throw { error: errorMessage };
    }
};

/**
 * Create a new record in a specific layout
 */
export const createRecord = async (layout, fieldData) => {
    try {
        const response = await api.post(`/filemaker/layouts/${layout}/records`, {
            fieldData
        });

        if (response.data.success) {
            return response.data;
        } else {
            throw { error: response.data.error || `Failed to create record in ${layout}` };
        }
    } catch (error) {
        console.error(`API Error: createRecord(${layout})`, error);
        const errorMessage = error.response?.data?.error || error.error || 'Network error';
        throw { error: errorMessage };
    }
};

/**
 * Update a record in a specific layout
 */
export const updateRecord = async (layout, recordId, fieldData, isSessionClaim = false) => {
    try {
        const patchUrl = `/filemaker/layouts/${layout}/records/${recordId}`;
        const payload = { fieldData, isSessionClaim: !!isSessionClaim };

        console.log(`📡 API REQUEST: PATCH ${patchUrl}`, payload);

        const response = await api.patch(patchUrl, payload);

        if (response.data.success) {
            return response.data;
        } else {
            throw { error: response.data.error || `Failed to update record ${recordId} in ${layout}` };
        }
    } catch (error) {
        console.error(`API Error: updateRecord(${layout}, ${recordId})`, error);
        const errorMessage = error.response?.data?.error || error.error || 'Network error';
        throw { error: errorMessage };
    }
};

/**
 * Get Employee by Firebase User ID
 */
export const getEmployeeByFirebaseId = async (uid) => {
    try {
        // Use generic _find endpoint (Scrambled by Global Middleware)
        const response = await api.post('/filemaker/layouts/Employees/_find', {
            query: [{ FireBaseUserID: `==${uid}` }]
        });

        if (response.data.success && response.data.data.length > 0) {
            return {
                message: "Employee found",
                employee: response.data.data[0] // Return the full record object
            };
        } else {
            throw { error: "No employee record found for this user." };
        }

    } catch (error) {
        console.error("getEmployeeByFirebaseId Error", error);
        const errorMessage = error.response?.data?.error || error.error || 'Network error';
        throw { error: errorMessage };
    }
};

/**
 * Global Logout (Revoke Tokens)
 */
export const logoutGlobal = async () => {
    try {
        const response = await api.post('/auth/logout-global');
        return response.data;
    } catch (error) {
        console.warn("Global Logout Failed", error);
        // Don't throw, just allow local logout to proceed
        return null;
    }
};

export const verifySession = async () => {
    try {
        const response = await api.get('/auth/session-status');
        return response.data;
    } catch (error) {
        console.warn("Session Verification Failed", error);
        return null;
    }
};

export const suspendUser = async (uid, recordId) => {
    const response = await api.post('/admin/suspend-user', { uid, recordId });
    return response.data;
};

export const activateUser = async (uid, recordId) => {
    const response = await api.post('/admin/activate-user', { uid, recordId });
    return response.data;
};

export const updateUserCredentials = async (uid, credentials) => {
        try {
            const response = await api.post('/admin/update-credentials', {
                uid,
                ...credentials
            });
            return response.data;
        } catch (error) {
            console.error("API Error: updateUserCredentials", error);
            const errorMessage = error.response?.data?.error || error.error || 'Network error';
            throw { error: errorMessage };
        }
    };

    /**
     * Delete a record from a specific layout
     */
    export const deleteRecord = async (layout, recordId) => {
        try {
            const response = await api.delete(`/filemaker/layouts/${layout}/records/${recordId}`);
            if (response.data.success) {
                return response.data;
            } else {
                throw { error: response.data.error || `Failed to delete record ${recordId} from ${layout}` };
            }
        } catch (error) {
            console.error(`API Error: deleteRecord(${layout}, ${recordId})`, error);
            const errorMessage = error.response?.data?.error || error.error || 'Network error';
            throw { error: errorMessage };
        }
    };


    
