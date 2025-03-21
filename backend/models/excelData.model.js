/**
 * Excel Data Model
 * 
 * This model represents the Excel output format and provides methods to transform
 * the standardized WireData format into Excel format following Model Context Protocol principles.
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Excel workbook representation
 * @typedef {Object} ExcelWorkbook
 * @property {Object} workbook - XLSX workbook object
 * @property {Array} sheets - Array of sheet names
 * @property {string} filePath - Path to save the Excel file
 */

/**
 * Create a new Excel workbook structure for Brady printer format
 * @param {string} outputDir - Directory to save the Excel file
 * @param {string} filename - Desired filename (without extension)
 * @returns {ExcelWorkbook} - Excel workbook object
 */
function createExcelWorkbook(outputDir, filename = null) {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Generate a unique filename if not provided
  const timestamp = Date.now();
  const excelFilename = filename || `wire_data_${timestamp}.xlsx`;
  const excelFilePath = path.join(outputDir, excelFilename);
  
  return {
    workbook,
    sheets: [],
    filePath: excelFilePath
  };
}

/**
 * Transform wire data array to Excel workbook format for Brady printer
 * @param {Array} wireDataArray - Array of wire data objects
 * @param {string} outputDir - Directory to save the Excel file
 * @param {string} filename - Desired filename (without extension)
 * @returns {Object} - Result object with file paths and preview data
 */
function transformWireDataToExcel(wireDataArray, outputDir, filename = null) {
  console.log('Wire Data Array for Excel:', JSON.stringify(wireDataArray.slice(0, 2), null, 2));
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create a new Excel workbook
  const excelWorkbook = createExcelWorkbook(outputDir, filename);
  
  // Create a formatted array with Brady M611 printer format
  const formattedData = [
    // Header row with printer label format indicators
    ['Label', 'Wire Number', 'From', 'To', 'Wire Type', 'Wire Gauge', 'Notes'],
  ];
  
  // Add wire data rows
  wireDataArray.forEach(wire => {
    const fromLabel = `${wire.fromLocation || ''} ${wire.fromDevice || ''} ${wire.from || ''}${wire.fromPort ? ' ' + wire.fromPort : ''}${wire.fromConn ? ' ' + wire.fromConn : ''}`;
    const toLabel = `${wire.toLocation || ''} ${wire.toDevice || ''} ${wire.to || ''}${wire.toPort ? ' ' + wire.toPort : ''}${wire.toConn ? ' ' + wire.toConn : ''}`;
    
    formattedData.push([
      'Wire', // Label type
      wire.wireNumber || '', // Wire Number
      fromLabel.trim(), // From label
      toLabel.trim(), // To label
      '', // Wire Type (empty by default)
      '', // Wire Gauge (empty by default)
      '', // Notes (empty by default)
    ]);
  });
  
  console.log('Formatted Data:', JSON.stringify(formattedData.slice(0, 3), null, 2));
  
  // Create worksheet from the formatted data
  const worksheet = XLSX.utils.aoa_to_sheet(formattedData);
  
  // Set column widths
  const colWidths = [10, 15, 30, 30, 15, 15, 20];
  worksheet['!cols'] = colWidths.map(width => ({ width }));
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(excelWorkbook.workbook, worksheet, "Brady Labels");
  excelWorkbook.sheets.push("Brady Labels");
  
  // Write the workbook to a file
  XLSX.writeFile(excelWorkbook.workbook, excelWorkbook.filePath);
  
  // Also generate a CSV with the same data for preview
  const csvFilePath = excelWorkbook.filePath.replace('.xlsx', '.csv');
  const csvData = formattedData.map(row => row.join(',')).join('\n');
  fs.writeFileSync(csvFilePath, csvData);
  
  // Return the result object with file paths and preview data
  return {
    excelFilePath: excelWorkbook.filePath,
    csvFilePath,
    previewData: formattedData.slice(0, 11), // Include header + first 10 rows
    totalRows: formattedData.length - 1 // Exclude header from count
  };
}

/**
 * Validate the Excel workbook structure
 * @param {ExcelWorkbook} excelWorkbook - Excel workbook to validate
 * @returns {Object} - Object containing isValid boolean and any errors
 */
function validateExcelWorkbook(excelWorkbook) {
  const errors = [];
  
  // Check if workbook exists
  if (!excelWorkbook || !excelWorkbook.workbook) {
    return { isValid: false, errors: ['Excel workbook does not exist'] };
  }
  
  // Check if at least one sheet exists
  if (!excelWorkbook.sheets || excelWorkbook.sheets.length === 0) {
    errors.push('Excel workbook must have at least one sheet');
  }
  
  // Check if file path is specified
  if (!excelWorkbook.filePath) {
    errors.push('Excel workbook must have a file path');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a context for Excel data transformation
 * This follows the Context aspect of Model Context Protocol
 * @returns {Object} - The Excel transformation context
 */
function createExcelContext() {
  return {
    // The source model
    sourceModel: 'WireData',
    
    // The target model
    targetModel: 'Excel',
    
    // Validate the input data
    validateInput: (wireDataArray) => {
      const errors = [];
      
      // Check if data is an array
      if (!Array.isArray(wireDataArray)) {
        return { isValid: false, errors: ['Wire data must be an array'] };
      }
      
      // Check if array is empty
      if (wireDataArray.length === 0) {
        return { isValid: false, errors: ['Wire data array cannot be empty'] };
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    },
    
    // Transform data from source to target model
    transform: transformWireDataToExcel,
    
    // Post-process the transformed data
    postProcess: (excelFilePath) => {
      // No additional processing needed for now
      return excelFilePath;
    }
  };
}

module.exports = {
  createExcelWorkbook,
  transformWireDataToExcel,
  validateExcelWorkbook,
  createExcelContext
};
