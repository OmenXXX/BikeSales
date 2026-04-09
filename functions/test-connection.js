require('dotenv').config();
const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

async function testConnection() {
    const fmHost = process.env.FILEMAKER_HOST;
    const fmUser = process.env.FILEMAKER_USER;
    const fmPassword = process.env.FILEMAKER_PASSWORD;
    const dbName = process.env.FILEMAKER_DATABASE || "BikeSalesErp";

    console.log(`Testing connection to: ${fmHost}`);
    console.log(`Database: ${dbName}`);
    console.log(`User: ${fmUser}`);

    if (!fmHost || !fmUser || !fmPassword) {
        console.error("Missing configuration in .env");
        return;
    }

    const authUrl = `https://${fmHost}/fmi/data/vLatest/databases/${dbName}/sessions`;
    const authHeader = Buffer.from(`${fmUser}:${fmPassword}`).toString("base64");

    try {
        console.log("Attempting authentication...");
        const response = await axios.post(
            authUrl,
            {},
            {
                httpsAgent,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${authHeader}`,
                },
            }
        );

        const token = response.data.response.token;
        console.log("✅ Authentication Successful!");
        console.log("Token received:", token.substring(0, 10) + "...");

        // Logout
        console.log("Logging out...");
        await axios.delete(`https://${fmHost}/fmi/data/vLatest/databases/${dbName}/sessions/${token}`, { httpsAgent });
        console.log("✅ Logout Successful!");

    } catch (error) {
        console.error("❌ Connection Failed:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testConnection();
