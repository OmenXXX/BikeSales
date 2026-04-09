// XOR Scrambler Utility
// Matches backend implementation for bidirectional communication

export const scramble = (data, key) => {
    if (!data || !key) return data;
    try {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        const keyStr = String(key);
        let result = '';
        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
        }
        return window.btoa(result);
    } catch (e) {
        console.error("Scramble Error", e);
        return null;
    }
};

export const descramble = (encoded, key) => {
    if (!encoded || !key) return encoded;
    try {
        const str = window.atob(encoded);
        const keyStr = String(key);
        let result = '';
        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
        }
        return JSON.parse(result);
    } catch (e) {
        console.error("Descramble Error", e);
        return null; // Return null on failure so app can handle it
    }
};
