/**
 * Processor Utilities
 * 
 * Common utilities for file processors
 */

/**
 * Validate wire data record
 * @param {Object} record - Wire data record to validate
 * @returns {boolean} - True if valid
 */
function validateData(record) {
  // Records must at minimum have device information on both ends
  if (!record.fromDev || !record.toDev) {
    return false;
  }
  
  // Must have either a permanent ID or label
  if (!record.permanent && !record.label) {
    return false;
  }
  
  return true;
}

/**
 * Normalize wire data record
 * @param {Object} record - Wire data record to normalize
 * @returns {Object} - Normalized record
 */
function normalizeData(record) {
  // Make a copy to avoid modifying the original
  const normalized = { ...record };
  
  // Ensure all fields are strings
  Object.keys(normalized).forEach(key => {
    normalized[key] = normalized[key] ? String(normalized[key]).trim() : '';
    
    // Remove any {UNKNWN} placeholders
    if (normalized[key] === '{UNKNWN}') {
      normalized[key] = '';
    }
  });
  
  // Format permanent ID with leading zeros in the third part
  if (normalized.permanent) {
    const parts = normalized.permanent.split('-');
    if (parts.length === 3 && !isNaN(parseInt(parts[2]))) {
      parts[2] = parts[2].padStart(3, '0');
      normalized.permanent = parts.join('-');
    }
  }
  
  // Generate label if not present but permanent ID exists
  if (!normalized.label && normalized.permanent) {
    normalized.label = `L-${normalized.permanent}`;
  }
  
  return normalized;
}

module.exports = {
  validateData,
  normalizeData
};
