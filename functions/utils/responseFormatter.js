/**
 * Standardizes API responses
 * @param {boolean} success - Whether the operation was successful
 * @param {any} data - The payload data
 * @param {object} pagination - Pagination details (optional)
 * @param {string} error - Error message (optional)
 * @param {string} filemakerCode - FileMaker specific error code (optional)
 */
const formatResponse = (success, data = null, pagination = null, error = null, filemakerCode = null) => {
    return {
        success,
        data,
        pagination: pagination ? {
            totalFound: pagination.totalFound || null,
            returnedCount: pagination.returnedCount || 0,
            limit: pagination.limit || null,
            offset: pagination.offset || 0
        } : null,
        error,
        filemakerCode
    };
};

module.exports = { formatResponse };
