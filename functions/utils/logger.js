const { logger } = require("firebase-functions");

// Wrapper to allow use in both Cloud Functions and local node
const log = {
    info: (msg, data) => {
        if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV === 'development') {
            console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : '');
        } else {
            logger.info(msg, data);
        }
    },
    error: (msg, error) => {
        if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV === 'development') {
            console.error(`[ERROR] ${msg}`, error);
        } else {
            logger.error(msg, error);
        }
    },
    warn: (msg, data) => {
        if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV === 'development') {
            console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data) : '');
        } else {
            logger.warn(msg, data);
        }
    },
    debug: (msg, data) => {
        if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${msg}`, data ? JSON.stringify(data) : '');
        } else {
            logger.debug(msg, data);
        }
    }
};

module.exports = log;
