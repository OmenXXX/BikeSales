import axios from 'axios';
import { auth } from './firebase';

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

// Request Interceptor: Inject Auth Token & Device UUID
api.interceptors.request.use(async (config) => {
    // 1. Firebase ID Token
    if (auth.currentUser) {
        try {
            const token = await auth.currentUser.getIdToken();
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

    return config;
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

        if (response.data.success && response.data.data.length > 0) {
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

export const getRecords = async (layout, options = {}) => {
    const { query, sort, limit, offset } = options;

    try {
        let response;
        if (query && query.length > 0) {
            response = await api.post(`/filemaker/layouts/${layout}/_find`, {
                query,
                sort,
                limit,
                offset
            });
        } else {
            response = await api.get(`/filemaker/layouts/${layout}/records`, {
                params: { limit, offset }
            });
        }

        if (response.data.success) {
            return response.data;
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
        return result;
    } catch (error) {
        throw error;
    }
};

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

export const updateRecord = async (layout, recordId, fieldData) => {
    try {
        const response = await api.patch(`/filemaker/layouts/${layout}/records/${recordId}`, {
            fieldData
        });

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

export const getEmployeeByFirebaseId = async (uid) => {
    try {
        const response = await api.post('/filemaker/layouts/Employees/_find', {
            query: [{
                FireBaseUserID: `==${uid}`
            }]
        });

        if (response.data.success && response.data.data.length > 0) {
            const employeeRecord = response.data.data[0];
            return {
                message: "Employee found",
                employee: {
                    ...employeeRecord.fieldData,
                    recordId: employeeRecord.recordId,
                    modId: employeeRecord.modId
                }
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

export const logoutGlobal = async () => {
    try {
        const response = await api.post('/auth/logout-global');
        return response.data;
    } catch (error) {
        console.warn("Global Logout Failed", error);
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
