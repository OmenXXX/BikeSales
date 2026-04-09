/**
 * Fields that are NOT modifiable via the API or Proxy.
 * These match exact field names in FileMaker.
 */
const EXCLUDED_FIELDS = [
    'PrimaryKey',
    'CreationTimestamp',
    'CreatedBy',
    'ModificationTimestamp',
    'ModifiedBy'
];

/**
 * Regex patterns for programmatic exclusion:
 * - Globals: Starts with zg, then a character, then underscore.
 * - Calculations: Ends with _c or _ct.
 */
const GLOBAL_FIELD_REGEX = /^zg[a-z]_/i;
const CALCULATION_FIELD_REGEX = /(_c|_ct)$/i;

module.exports = {
    EXCLUDED_FIELDS,
    GLOBAL_FIELD_REGEX,
    CALCULATION_FIELD_REGEX
};
