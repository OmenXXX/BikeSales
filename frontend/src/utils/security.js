/**
 * Security Utility for Role-Based Access Control (RBAC)
 * 
 * Manages permission checks based on the user's AccessLevelJSON field.
 * 
 * Structure of AccessLevelJSON:
 * {
 *   "TargetRole": {
 *     "Action": true/false/1/0
 *   }
 * }
 * 
 * Example:
 * {
 *   "Sales": { "Edit": true, "Delete": false },
 *   "Administrator": { "Read": true }
 * }
 */

/**
 * Check if the user has permission to perform an action on a target role.
 * @param {Object} user - The logged-in user object (must contain fieldData.AccessLevelJSON)
 * @param {string} targetRole - The role of the record being accessed (e.g., 'Sales', 'Administrator')
 * @param {string} action - The action to perform (e.g., 'Edit', 'Delete', 'Read')
 * @returns {boolean} - True if permission is granted
 */
export const checkPermission = (user, targetRole, action) => {
    if (!user || !user.fieldData) {
        console.warn('Security Check Failed: Invalid user object');
        return false;
    }

    // 1. Administrator Bypass:
    // If the user is an Administrator, they get full access regardless of AccessLevelJSON.
    const role = user.Role || user.fieldData?.Role;
    if (role === 'Administrator') {
        return true;
    }

    // 2. Access Level Logic (for all other roles)
    // Check both minimalist (top-level) and legacy (fieldData) paths
    const accessLevelField = user.AccessLevelJSON || user.fieldData?.AccessLevelJSON || user.fieldData?.["EMP::AccessLevelJSON"];

    if (!accessLevelField) {
        console.warn('Security Check Failed: Missing AccessLevelJSON or EMP::AccessLevelJSON');
        return false;
    }

    try {
        const permissions = JSON.parse(accessLevelField);

        // Check for wildcard/admin access if implemented, otherwise strict role check
        // For now, strict: permissions[TargetRole][Action]

        const rolePermissions = permissions[targetRole];
        if (!rolePermissions) return false;

        const permissionValue = rolePermissions[action];

        // Handle boolean or numeric (1/0) truthy values
        return !!permissionValue;

    } catch (error) {
        console.error('Security Check Error: Failed to parse AccessLevelJSON', error);
        return false;
    }
};

/**
 * Get the mock user for development/testing
 * @returns {Object} - A mock user object with AccessLevelJSON
 */
export const getMockUser = () => {
    return {
        fieldData: {
            Name_First: "John",
            Name_Last: "Manager",
            Role: "Administrator",
            AccessLevelJSON: JSON.stringify({
                "Sales": { "Edit": true, "Delete": false },
                "Staff Operations": { "Edit": true, "Delete": true },
                "Administrator": { "Edit": false, "Delete": false } // Can't edit other admins
            })
        }
    };
};
