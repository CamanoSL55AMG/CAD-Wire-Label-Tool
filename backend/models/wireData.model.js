/**
 * Wire Data Model
 * 
 * This model represents the standardized wire data format used across the application
 * following Model Context Protocol principles.
 */

/**
 * @typedef {Object} WireData
 * @property {string} wireNumber - The identifier for the wire
 * @property {string} fromLocation - The source location
 * @property {string} fromDevice - The source device
 * @property {string} from - General source information
 * @property {string} fromPort - The source port
 * @property {string} fromConn - The source connection
 * @property {string} toLocation - The destination location
 * @property {string} toDevice - The destination device
 * @property {string} to - General destination information
 * @property {string} toPort - The destination port
 * @property {string} toConn - The destination connection
 */

/**
 * Create a new wire data object with default values
 * @returns {WireData} - A new wire data object with empty strings for all properties
 */
function createWireData() {
  return {
    wireNumber: '',
    fromLocation: '',
    fromDevice: '',
    from: '',
    fromPort: '',
    fromConn: '',
    toLocation: '',
    toDevice: '',
    to: '',
    toPort: '',
    toConn: ''
  };
}

/**
 * Validate a wire data object against the expected schema
 * @param {any} data - The data to validate
 * @returns {Object} - Object containing isValid boolean and any errors
 */
function validateWireData(data) {
  const errors = [];
  
  // Check if data is an object
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Data must be an object'] };
  }
  
  // Define required fields (if any are strictly required)
  const requiredFields = ['wireNumber'];
  
  // Check for required fields
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Ensure all fields are strings (even if empty)
  const allFields = [
    'wireNumber', 'fromLocation', 'fromDevice', 'from', 'fromPort', 'fromConn',
    'toLocation', 'toDevice', 'to', 'toPort', 'toConn'
  ];
  
  for (const field of allFields) {
    if (data[field] !== undefined && typeof data[field] !== 'string') {
      errors.push(`Field ${field} must be a string`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Normalize data to ensure it matches the wire data schema
 * @param {Object} data - Data to normalize
 * @returns {WireData} - Normalized wire data
 */
function normalizeWireData(data) {
  const normalizedData = createWireData();
  
  // Copy valid fields from the input data
  const validFields = [
    'wireNumber', 'fromLocation', 'fromDevice', 'from', 'fromPort', 'fromConn',
    'toLocation', 'toDevice', 'to', 'toPort', 'toConn'
  ];
  
  for (const field of validFields) {
    if (data[field] !== undefined) {
      normalizedData[field] = String(data[field]).trim();
    }
  }
  
  return normalizedData;
}

module.exports = {
  createWireData,
  validateWireData,
  normalizeWireData
};
