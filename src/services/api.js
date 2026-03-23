import axios from 'axios';
import { getCurrentUser } from './firebase';
import { getDeviceUUID } from '../utils/device';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/bikesaleserp/us-central1/api',
});

// Add a request interceptor
api.interceptors.request.use(async (config) => {
    const user = await getCurrentUser();
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add Device UUID to all requests for session validation
    config.headers['X-Device-UUID'] = getDeviceUUID();

    // Check for Session Claim metadata
    if (config.isSessionClaim) {
        config.headers['X-Session-Claim'] = 'true';
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

export const filemaker = {
    find: (layout, query, sort = [], limit = 25, offset = 0) => 
        api.post('/fm/find', { layout, query, sort, limit, offset }),
    create: (layout, fieldData) => 
        api.post('/fm/create', { layout, fieldData }),
    update: (layout, recordId, fieldData, isSessionClaim = false) => 
        api.patch('/fm/update', { layout, recordId, fieldData }, { 
            // Pass metadata in config for interceptor
            isSessionClaim: isSessionClaim 
        }),
    delete: (layout, recordId) => 
        api.delete('/fm/delete', { data: { layout, recordId } }),
    executeScript: (layout, script, scriptParam) =>
        api.get(`/fm/script/${layout}/${script}`, { params: { scriptParam } }),
    getSessionStatus: () => 
        api.get('/fm/session-status')
};

export default api;
