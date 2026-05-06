/**
 * PDF Data Model
 * 
 * This model represents the raw PDF data format and provides methods to transform
 * it into the standardized WireData format following Model Context Protocol principles.
 */

const { createWireData, normalizeWireData } = require('./wireData.model');

/**
 * Transform extracted PDF text data into standardized wire data format
 * @param {string} pdfText - Raw text extracted from PDF
 * @returns {Array} - Array of wire data objects
 */
function transformPdfToWireData(pdfText) {
  if (typeof pdfText !== 'string') {
    throw new Error('PDF data must be a string');
  }
  
  // Split the text into lines
  const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line);
  
  // Try to identify the header row
  let headerRow = -1;
  let headers = [];
  
  // Look for potential header rows by searching for key terms
  const headerKeywords = ['wire', 'number', 'from', 'to', 'location', 'device', 'port'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const keywordMatches = headerKeywords.filter(keyword => line.includes(keyword));
    
    // If this line contains multiple header keywords, it's likely a header row
    if (keywordMatches.length >= 3) {
      headerRow = i;
      
      // Try to extract headers using common delimiters
      const potentialDelimiters = [',', '\t', '  '];
      for (const delimiter of potentialDelimiters) {
        const split = lines[i].split(delimiter).map(h => h.trim()).filter(h => h);
        if (split.length > 3) {
          headers = split;
          break;
        }
      }
      
      // If no delimiter worked well, try splitting by spaces with smart handling
      if (headers.length <= 3) {
        headers = extractHeadersFromSpacedText(lines[i]);
      }
      
      break;
    }
  }
  
  // If no header row was identified or headers extraction failed, make a best guess
  if (headerRow === -1 || headers.length <= 3) {
    console.warn('Could not identify reliable header row in PDF, using heuristic approach');
    return extractWireDataWithoutHeaders(lines);
  }
  
  // Process data rows (everything after the header row)
  const dataRows = [];
  
  for (let i = headerRow + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Try to split the line using the same delimiters we tried for headers
    let rowValues = [];
    const potentialDelimiters = [',', '\t', '  '];
    
    for (const delimiter of potentialDelimiters) {
      const split = line.split(delimiter).map(v => v.trim()).filter(v => v);
      if (split.length >= headers.length) {
        rowValues = split.slice(0, headers.length); // Ensure we don't exceed header count
        break;
      }
    }
    
    // If no delimiter worked well, try splitting by spaces with smart handling
    if (rowValues.length < headers.length) {
      rowValues = extractValuesFromSpacedText(line, headers.length);
    }
    
    // Create an object mapping headers to values
    const rowObject = {};
    headers.forEach((header, index) => {
      rowObject[header] = index < rowValues.length ? rowValues[index] : '';
    });
    
    dataRows.push(rowObject);
  }
  
  // Convert raw data rows to wire data format
  return dataRows.map(row => {
    return mapPdfRowToWireData(row, headers);
  });
}

/**
 * Extract headers from space-separated text with intelligent handling
 * @param {string} headerLine - The line containing headers
 * @returns {Array<string>} - Extracted headers
 */
function extractHeadersFromSpacedText(headerLine) {
  // Handle headers with spaces by using common wire data terminology as guidance
  const commonHeaderTerms = [
    'wire number', 'wire no', 'wire id',
    'from location', 'from loc',
    'from device', 'from dev',
    'from', 'source',
    'from port',
    'from conn', 'from connection',
    'to location', 'to loc',
    'to device', 'to dev',
    'to', 'destination',
    'to port',
    'to conn', 'to connection'
  ];
  
  let headers = [];
  let remainingText = headerLine;
  
  // Look for common header terms in the text
  for (const term of commonHeaderTerms) {
    const termLower = term.toLowerCase();
    const remainingLower = remainingText.toLowerCase();
    
    if (remainingLower.includes(termLower)) {
      // Find the term in the original case
      const startIndex = remainingLower.indexOf(termLower);
      const endIndex = startIndex + termLower.length;
      
      // Extract the term with original casing
      const extractedTerm = remainingText.substring(startIndex, endIndex);
      headers.push(extractedTerm);
      
      // Remove the term from the remaining text
      remainingText = 
        remainingText.substring(0, startIndex) + 
        remainingText.substring(endIndex).trim();
    }
  }
  
  // If we didn't find many headers with common terms, fall back to simple space splitting
  if (headers.length < 3) {
    headers = headerLine.split(/\s+/).filter(h => h.trim());
  }
  
  return headers;
}

/**
 * Extract values from space-separated text
 * @param {string} line - The data line
 * @param {number} expectedCount - Expected number of values
 * @returns {Array<string>} - Extracted values
 */
function extractValuesFromSpacedText(line, expectedCount) {
  // Simple case: just split by whitespace
  const simpleSplit = line.split(/\s+/).filter(v => v.trim());
  
  // If the simple split gives us enough values, use it
  if (simpleSplit.length >= expectedCount) {
    return simpleSplit.slice(0, expectedCount);
  }
  
  // More complex case: try to distribute the text accordingly
  const totalLength = line.length;
  const lengthPerValue = Math.floor(totalLength / expectedCount);
  
  const values = [];
  for (let i = 0; i < expectedCount; i++) {
    const start = i * lengthPerValue;
    const end = (i === expectedCount - 1) ? totalLength : (i + 1) * lengthPerValue;
    values.push(line.substring(start, end).trim());
  }
  
  return values;
}

/**
 * Extract wire data from PDF text without reliable headers
 * @param {Array<string>} lines - Lines of text from the PDF
 * @returns {Array} - Array of wire data objects
 */
function extractWireDataWithoutHeaders(lines) {
  const wireDataArray = [];
  
  // Look for lines that might contain wire data
  for (const line of lines) {
    // Skip lines that are too short or don't look like data rows
    if (line.length < 10) continue;
    
    // Create a new wire data object
    const wireData = createWireData();
    
    // Try to identify wire number - often starts with a number or code pattern
    const wireNumberPatterns = [
      /\b[A-Z]?\d+\b/, // e.g., W123, 123
      /\b[A-Z]{1,3}-\d+\b/, // e.g., W-123, CB-456
      /\bWIRE\s*\d+\b/i // e.g., WIRE 123
    ];
    
    for (const pattern of wireNumberPatterns) {
      const match = line.match(pattern);
      if (match) {
        wireData.wireNumber = match[0];
        break;
      }
    }
    
    // If we found a wire number, try to extract other information
    if (wireData.wireNumber) {
      // Look for "from" and "to" patterns in the text
      const fromToPattern = /from\s+(.*?)\s+to\s+(.*?)(?:\s|$)/i;
      const match = line.match(fromToPattern);
      
      if (match) {
        wireData.from = match[1];
        wireData.to = match[2];
      } else {
        // Fallback: divide the remaining text into "from" and "to" sections
        const remainingText = line.replace(wireData.wireNumber, '').trim();
        const midpoint = Math.floor(remainingText.length / 2);
        
        wireData.from = remainingText.substring(0, midpoint).trim();
        wireData.to = remainingText.substring(midpoint).trim();
      }
      
      wireDataArray.push(wireData);
    }
  }
  
  return wireDataArray;
}

/**
 * Map a raw PDF data row to the wire data format
 * @param {Object} row - Raw PDF data row
 * @param {Array<string>} headers - Header names
 * @returns {Object} - Wire data object
 */
function mapPdfRowToWireData(row, headers) {
  // Create a base wire data object
  const wireData = createWireData();
  
  // Normalize headers to make matching easier
  const normalizedHeaderMap = {};
  headers.forEach(header => {
    normalizedHeaderMap[header.toLowerCase().replace(/[^a-z0-9]/g, '')] = header;
  });
  
  // Map the field based on header names
  const fieldMappings = {
    wireNumber: ['wirenumber', 'wireno', 'wire', 'number', 'id'],
    fromLocation: ['fromlocation', 'fromloc', 'sourcelocation'],
    fromDevice: ['fromdevice', 'fromdev', 'sourcedevice'],
    from: ['from', 'source', 'origin'],
    fromPort: ['fromport', 'sourceport'],
    fromConn: ['fromconn', 'fromconnection', 'sourceconnection'],
    toLocation: ['tolocation', 'toloc', 'destinationlocation'],
    toDevice: ['todevice', 'todev', 'destinationdevice'],
    to: ['to', 'destination', 'target'],
    toPort: ['toport', 'destinationport'],
    toConn: ['toconn', 'toconnection', 'destinationconnection']
  };
  
  // For each standard wire data field, look for a matching header
  Object.entries(fieldMappings).forEach(([wireField, possibleHeaderNames]) => {
    for (const possibleName of possibleHeaderNames) {
      const matchedHeader = normalizedHeaderMap[possibleName];
      if (matchedHeader && row[matchedHeader]) {
        wireData[wireField] = row[matchedHeader];
        break;
      }
    }
  });
  
  return wireData;
}

/**
 * Validate raw PDF text data
 * @param {string} pdfText - The raw PDF text to validate
 * @returns {Object} - Object containing isValid boolean and any errors
 */
function validatePdfData(pdfText) {
  const errors = [];
  
  // Check if data is a string
  if (typeof pdfText !== 'string') {
    return { isValid: false, errors: ['PDF data must be a string'] };
  }
  
  // Check if text is empty
  if (pdfText.trim() === '') {
    return { isValid: false, errors: ['PDF text cannot be empty'] };
  }
  
  // Check for minimum content
  const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length < 2) {
    errors.push('PDF text contains too few lines to be valid wire data');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a context for PDF data transformation
 * This follows the Context aspect of Model Context Protocol
 * @returns {Object} - The PDF transformation context
 */
function createPdfContext() {
  return {
    // The source model
    sourceModel: 'PDF',
    
    // The target model
    targetModel: 'WireData',
    
    // Validate the input data
    validateInput: validatePdfData,
    
    // Transform data from source to target model
    transform: transformPdfToWireData,
    
    // Post-process the transformed data
    postProcess: (wireDataArray) => {
      // Apply any additional processing rules or validations
      return wireDataArray
        .filter(wireData => wireData.wireNumber) // Filter out entries without wire numbers
        .map(wireData => normalizeWireData(wireData));
    }
  };
}

module.exports = {
  validatePdfData,
  transformPdfToWireData,
  createPdfContext
};
