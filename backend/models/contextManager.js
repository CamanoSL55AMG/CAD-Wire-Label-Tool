/**
 * Model Context Protocol (MCP) Context Manager
 * 
 * This module provides a unified interface for model transformations,
 * implementing the core principles of the Model Context Protocol.
 */

const { createCsvContext } = require('./csvData.model');
const { createPdfContext } = require('./pdfData.model');
const { createExcelContext } = require('./excelData.model');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const pdfParse = require('pdf-parse');

/**
 * Context Manager for orchestrating model transformations
 */
class ContextManager {
  /**
   * Create a new context manager
   */
  constructor() {
    this.contexts = {
      csv: createCsvContext(),
      pdf: createPdfContext(),
      excel: createExcelContext()
    };
  }

  /**
   * Process a file using the appropriate context based on file type
   * @param {string} filePath - Path to the source file
   * @param {string} fileType - Type of file ('.csv' or '.pdf')
   * @param {string} outputDir - Directory to save the output file
   * @returns {Promise<Object>} - Result object with file paths and preview data
   */
  async processFile(filePath, fileType, outputDir) {
    try {
      // 1. Read and parse the source file
      const sourceData = await this.parseSourceFile(filePath, fileType);
      
      // 2. Determine the appropriate source context
      const sourceContext = fileType === '.csv' ? this.contexts.csv : this.contexts.pdf;
      
      // 3. Validate the source data
      const validation = sourceContext.validateInput(sourceData);
      if (!validation.isValid) {
        throw new Error(`Invalid source data: ${validation.errors.join(', ')}`);
      }
      
      // 4. Transform the source data to wire data
      const wireData = sourceContext.transform(sourceData);
      
      // 5. Apply post-processing to the wire data
      const processedWireData = sourceContext.postProcess(wireData);
      
      // 6. Transform the wire data to Excel format
      const excelContext = this.contexts.excel;
      const result = excelContext.transform(processedWireData, outputDir);
      
      // Return the result object with paths and preview data
      return result;
    } catch (error) {
      console.error('Error in context manager:', error);
      throw error;
    }
  }
  
  /**
   * Parse a source file based on its type
   * @param {string} filePath - Path to the source file
   * @param {string} fileType - Type of file ('.csv' or '.pdf')
   * @returns {Promise<any>} - Parsed file data
   */
  async parseSourceFile(filePath, fileType) {
    if (fileType === '.csv') {
      return this.parseCsvFile(filePath);
    } else if (fileType === '.pdf') {
      return this.parsePdfFile(filePath);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }
  
  /**
   * Parse a CSV file
   * @param {string} filePath - Path to the CSV file
   * @returns {Promise<Array>} - Array of objects representing CSV rows
   */
  parseCsvFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }
  
  /**
   * Parse a PDF file
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<string>} - Extracted text from the PDF
   */
  async parsePdfFile(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw error;
    }
  }
}

module.exports = ContextManager;
