const { scramble, descramble } = require('../utils/scrambler');
const logger = require("firebase-functions/logger");

const scrambleMiddleware = (req, res, next) => {
    // 1. Inbound: Decrypt Payload if present
    // 1. Inbound: Decrypt Payload if present
    if (req.body && req.body.payload && req.user && req.user.uid) {
        logger.info(`NETWORK_TAB_VIEW (Incoming Scrambled): ${req.body.payload.substring(0, 50)}... [Length: ${req.body.payload.length}]`);

        const decrypted = descramble(req.body.payload, req.user.uid);

        if (decrypted) {
            req.body = decrypted;
            logger.info("PROXY_DECODED_VIEW (Incoming Decrypted):", JSON.stringify(req.body, null, 2));
        } else {
            logger.warn("Failed to descramble incoming payload");
            return res.status(400).json({ success: false, error: "Invalid scrambled payload" });
        }
    } else {
        if (req.method === 'POST' || req.method === 'PATCH') {
            logger.info("Middleware: No payload found or user not authenticated", {
                hasBody: !!req.body,
                hasPayload: !!(req.body && req.body.payload),
                hasUser: !!req.user,
                uid: req.user ? req.user.uid : 'N/A'
            });
        }
    }

    // 2. Outbound: Intercept Response to Encrypt
    const originalJson = res.json;
    res.json = function (body) {
        // Only scramble if it's a success response and user is authenticated
        // and we haven't already scrambled it (check for _transport flag)
        if (req.user && req.user.uid && body && !body._transport && !body.error) {

            logger.debug("PROXY_DECODED_VIEW (Outgoing):", JSON.stringify(body, null, 2));

            const scrambledData = scramble(body, req.user.uid);

            logger.debug(`NETWORK_TAB_VIEW (Outgoing): ${scrambledData.substring(0, 50)}...`);

            // Send standard structure but with scrambled payload
            // using originalJson.call to avoid infinite recursion
            return originalJson.call(this, {
                payload: scrambledData,
                _transport: 'XOR_GLOBAL'
            });
        }

        return originalJson.call(this, body);
    };

    next();
};

module.exports = scrambleMiddleware;
