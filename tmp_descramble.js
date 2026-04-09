const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('d:\\BikeSalesErp\\tmp_product_raw.json', 'utf8'));
const encoded = raw.payload;
const key = "IvmpqrKNcrM9vB67ApEltuiU5h92";

function descramble(encoded, key) {
    try {
        const str = Buffer.from(encoded, 'base64').toString('binary');
        const keyStr = String(key);
        let result = '';
        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
        }
        return JSON.parse(result);
    } catch (e) {
        console.error("Descramble Error:", e.message);
        return null;
    }
}

const decoded = descramble(encoded, key);
console.log(JSON.stringify(decoded, null, 2));
