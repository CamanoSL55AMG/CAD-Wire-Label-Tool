/**
 * CSV Data Model
 * 
 * This model represents the raw CSV data format and provides methods to transform
 * it into the standardized WireData format following Model Context Protocol principles.
 */

const { createWireData, normalizeWireData } = require('./wireData.model');

/**
 * Transform raw CSV data into standardized wire data format
 * @param {Array} csvRows - Array of objects representing CSV rows
 * @returns {Array} - Array of wire data objects
 */
function transformCsvToWireData(csvRows) {
  if (!Array.isArray(csvRows)) {
    throw new Error('CSV data must be an array of rows');
  }
  
  console.log('CSV Rows:', JSON.stringify(csvRows.slice(0, 2), null, 2));
  
  return csvRows.map(row => {
    // Create a base wire data object
    const wireData = createWireData();
    
    // Direct mapping if the column names match exactly
    Object.keys(wireData).forEach(field => {
      if (row[field] !== undefined && row[field] !== null) {
        wireData[field] = String(row[field]).trim();
      }
    });
    
    // If direct mapping didn't work, try flexible field mapping
    if (Object.values(wireData).every(val => val === '')) {
      // Map CSV fields to wire data fields using flexible field mapping
      // This handles various possible CSV column naming conventions
      const fieldMappings = {
        wireNumber: ['WireNumber', 'wire_number', 'wire', 'number', 'wireno', 'wire_no', 'id'],
        fromLocation: ['FromLocation', 'from_location', 'fromloc', 'from_loc', 'source_location'],
        fromDevice: ['FromDevice', 'from_device', 'fromdev', 'from_dev', 'source_device'],
        from: ['From', 'source', 'origin', 'source_label'],
        fromPort: ['FromPort', 'from_port', 'sourceport', 'source_port'],
        fromConn: ['FromConn', 'from_conn', 'fromconnection', 'from_connection', 'source_connection'],
        toLocation: ['ToLocation', 'to_location', 'toloc', 'to_loc', 'dest_location'],
        toDevice: ['ToDevice', 'to_device', 'todev', 'to_dev', 'dest_device'],
        to: ['To', 'destination', 'target', 'dest_label'],
        toPort: ['ToPort', 'to_port', 'destport', 'dest_port'],
        toConn: ['ToConn', 'to_conn', 'toconnection', 'to_connection', 'dest_connection']
      };
      
      // For each standard field, try to find a matching field in the CSV row
      Object.entries(fieldMappings).forEach(([standardField, possibleFields]) => {
        // Find the first matching field that exists in the row
        const matchedField = possibleFields.find(field => 
          row[field] !== undefined && row[field] !== null
        );
        
        // If a match is found, assign its value to the standard field
        if (matchedField) {
          wireData[standardField] = String(row[matchedField]).trim();
        }
      });
    }
    
    console.log('Transformed Wire Data:', wireData);
    
    return wireData;
  });
}

/**
 * Validate raw CSV data structure
 * @param {Array} csvData - The raw CSV data to validate
 * @returns {Object} - Object containing isValid boolean and any errors
 */
function validateCsvData(csvData) {
  const errors = [];
  
  // Check if data is an array
  if (!Array.isArray(csvData)) {
    return { isValid: false, errors: ['CSV data must be an array of rows'] };
  }
  
  // Check if array is empty
  if (csvData.length === 0) {
    return { isValid: false, errors: ['CSV data cannot be empty'] };
  }
  
  // Check that each row is an object
  for (let i = 0; i < csvData.length; i++) {
    if (typeof csvData[i] !== 'object' || csvData[i] === null) {
      errors.push(`Row ${i} is not a valid object`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a context for CSV data transformation
 * This follows the Context aspect of Model Context Protocol
 * @returns {Object} - The CSV transformation context
 */
function createCsvContext() {
  return {
    // The source model
    sourceModel: 'CSV',
    
    // The target model
    targetModel: 'WireData',
    
    // Validate the input data
    validateInput: validateCsvData,
    
    // Transform data from source to target model
    transform: transformCsvToWireData,
    
    // Post-process the transformed data
    postProcess: (wireDataArray) => {
      // Apply any additional processing rules or validations
      return wireDataArray.map(wireData => normalizeWireData(wireData));
    }
  };
}

module.exports = {
  validateCsvData,
  transformCsvToWireData,
  createCsvContext
};
