/**
 * Wire Data Model
 * 
 * This model represents the standardized wire data format used across the application
 * following Model Context Protocol principles.
 */

/**
 * Interface for wire data
 */
export interface WireData {
  wireNumber: string;
  fromLocation: string;
  fromDevice: string;
  from: string;
  fromPort: string;
  fromConn: string;
  toLocation: string;
  toDevice: string;
  to: string;
  toPort: string;
  toConn: string;
}

/**
 * Create a new wire data object with default values
 * @returns {WireData} - A new wire data object with empty strings for all properties
 */
export function createWireData(): WireData {
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
export function validateWireData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if data is an object
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Data must be an object'] };
  }
  
  // Define required fields (if any are strictly required)
  const requiredFields: (keyof WireData)[] = ['wireNumber'];
  
  // Check for required fields
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Ensure all fields are strings (even if empty)
  const allFields: (keyof WireData)[] = [
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
export function normalizeWireData(data: any): WireData {
  const normalizedData = createWireData();
  
  // Copy valid fields from the input data
  const validFields: (keyof WireData)[] = [
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
