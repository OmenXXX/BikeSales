const logger = require("firebase-functions/logger");

const scramble = (data, key) => {
    if (!data || !key) return data;
    try {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        const keyStr = String(key);
        let result = '';
        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
        }
        return Buffer.from(result, 'binary').toString('base64');
    } catch (e) {
        logger.error("Scramble Error", e);
        return null;
    }
};

const descramble = (encoded, key) => {
    if (!encoded || !key) return encoded;
    try {
        // Use 'binary' to match window.atob behavior 1:1
        const decodedStr = Buffer.from(encoded, 'base64').toString('binary');
        const keyStr = String(key);
        let result = '';
        for (let i = 0; i < decodedStr.length; i++) {
            result += String.fromCharCode(decodedStr.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
        }
        return JSON.parse(result);
    } catch (e) {
        logger.error("Descramble Error", e);
        return null;
    }
};

module.exports = { scramble, descramble };
