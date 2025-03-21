const fs = require('fs');
const path = require('path');
const ContextManager = require('../models/contextManager');

/**
 * Process the uploaded file (CSV or PDF) and convert it to Excel format
 * @param {string} filePath - Path to the uploaded file
 * @param {string} fileType - File extension (.csv or .pdf)
 * @returns {Promise<Object>} - Result object with excelFilePath, csvFilePath, previewData, totalRows
 */
async function processFile(filePath, fileType) {
  try {
    // Validate file type
    if (fileType !== '.csv' && fileType !== '.pdf') {
      throw new Error('Unsupported file type. Please upload a CSV or PDF file.');
    }
    
    // Create the downloads directory if it doesn't exist
    const downloadsDir = path.join(__dirname, '..', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // Initialize the MCP Context Manager
    const contextManager = new ContextManager();
    
    // Process the file using the Context Manager
    const result = await contextManager.processFile(filePath, fileType, downloadsDir);
    
    return result;
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

module.exports = {
  processFile
};
