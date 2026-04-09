const axios = require("axios");
const https = require('https');
const logger = require("firebase-functions/logger");

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

class FileMakerSessionService {
    constructor() {
        this.token = null;
        this.loginPromise = null;
    }

    async getValidToken() {
        if (this.token) {
            return this.token;
        }

        if (this.loginPromise) {
            return this.loginPromise;
        }

        this.loginPromise = this.login();

        try {
            this.token = await this.loginPromise;
            return this.token;
        } catch (error) {
            throw error;
        } finally {
            this.loginPromise = null;
        }
    }

    async login() {
        const fmHost = process.env.FILEMAKER_HOST;
        const fmUser = process.env.FILEMAKER_USER;
        const fmPassword = process.env.FILEMAKER_PASSWORD;
        const dbName = process.env.FILEMAKER_DATABASE || "BikeSalesErp";

        if (!fmHost || !fmUser || !fmPassword) {
            logger.error("Missing FileMaker configuration");
            throw new Error("Server configuration error");
        }

        const authUrl = `https://${fmHost}/fmi/data/vLatest/databases/${dbName}/sessions`;
        const authHeader = Buffer.from(`${fmUser}:${fmPassword}`).toString("base64");

        logger.info("Authenticating with FileMaker...");

        try {
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
            logger.info("FileMaker login successful");
            return token;
        } catch (error) {
            logger.error("FileMaker login failed", error.message);
            throw error;
        }
    }

    async logout() {
        if (!this.token) return;

        const fmHost = process.env.FILEMAKER_HOST;
        const dbName = process.env.FILEMAKER_DATABASE || "BikeSalesErp";
        const tokenToClear = this.token;

        this.token = null; // Clear immediately from memory

        try {
            await axios.delete(
                `https://${fmHost}/fmi/data/vLatest/databases/${dbName}/sessions/${tokenToClear}`,
                { httpsAgent }
            );
            logger.info("FileMaker logout successful");
        } catch (error) {
            logger.warn("FileMaker logout failed or session already expired", error.message);
        }
    }

    // Called when a 401 is encountered
    clearToken() {
        this.token = null;
    }
}

// Export as Singleton
module.exports = new FileMakerSessionService();
