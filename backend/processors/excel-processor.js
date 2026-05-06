/**
 * Excel Processor Module
 * 
 * Specialized processor for Excel files, with support for:
 * - R2b_AotW format with multi-row headers
 * - Standard Excel formats
 * - City of Bothell file detection and processing
 */
const path = require('path');
const ExcelJS = require('exceljs');
const fs = require('fs');
const { validateData, normalizeData } = require('./processor-utils');

/**
 * Process Excel file (.xlsx or .xls)
 * @param {Object} fileInfo - File information object
 * @param {string} outputDir - Directory to save output files
 * @returns {Promise<Object>} - Processed data results
 */
async function processExcelFile(fileInfo, outputDir) {
  console.log(`Processing Excel file: ${fileInfo.originalname}`);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(fileInfo.path);
  
  // Get first worksheet
  const worksheet = workbook.worksheets[0];
  console.log(`Excel file has ${workbook.worksheets.length} worksheets. Using first worksheet with ${worksheet.rowCount} rows`);
  
  // Detect file format
  const isR2bFormat = await detectR2bFormat(worksheet);
  const isBothellFile = fileInfo.originalname.toLowerCase().includes('bothell') || fileInfo.originalname.toLowerCase().includes('cob');

  let wireData = [];
  
  if (isR2bFormat) {
    console.log('Detected R2b format Excel file, using specialized processing');
    wireData = await processR2bFormat(worksheet, isBothellFile);
  } else {
    console.log('Processing as standard Excel file');
    wireData = await processStandardExcel(worksheet);
  }
  
  // Apply Bothell-specific post-processing if needed
  if (isBothellFile) {
    wireData = applyBothellProcessing(wireData);
    console.log('Applied City of Bothell specific processing');
  }
  
  // Ensure all records have valid data
  wireData = wireData.filter(record => validateData(record));
  
  console.log(`Successfully processed ${wireData.length} wire records from Excel file`);
  
  // Create output files
  const result = await createOutputFiles(wireData, outputDir, fileInfo.originalname);
  return result;
}

/**
 * Detect if Excel has R2b format
 * @param {Object} worksheet - ExcelJS worksheet
 * @returns {Promise<boolean>} - True if R2b format is detected
 */
async function detectR2bFormat(worksheet) {
  let isR2b = false;
  
  // R2b format typically has specific headers: TEMP, PERMANENT, FROM LOC, FROM DEV
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowText = row.values.join(',');
    if (rowText.includes('TEMP') && rowText.includes('PERMANENT') && 
        rowText.includes('FROM LOC') && rowText.includes('FROM DEV')) {
      isR2b = true;
      console.log(`R2b format detected in row ${rowNumber}`);
    }
  });
  
  return isR2b;
}

/**
 * Process R2b format Excel
 * @param {Object} worksheet - ExcelJS worksheet
 * @param {boolean} isBothell - Is this a Bothell file
 * @returns {Promise<Array>} - Processed wire data
 */
async function processR2bFormat(worksheet, isBothell) {
  const wireData = [];
  let headerRowIndex = -1;
  let headerCols = {};
  
  // First, find the header row
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowValues = row.values;
    const rowText = rowValues.join(',');
    
    if (rowText.includes('TEMP') && rowText.includes('PERMANENT') && 
        rowText.includes('FROM LOC') && rowText.includes('FROM DEV')) {
      headerRowIndex = rowNumber;
      
      // Map column indices to field names
      for (let i = 1; i < rowValues.length; i++) {
        const colValue = rowValues[i];
        if (colValue === 'TEMP') headerCols.temp = i;
        else if (colValue === 'PERMANENT') headerCols.permanent = i;
        else if (colValue === 'FROM LOC') headerCols.fromLoc = i;
        else if (colValue === 'FROM DEV') headerCols.fromDev = i;
        else if (colValue === 'FROM PORT') headerCols.fromPort = i;
        else if (colValue === 'FROM CONN') headerCols.fromConn = i;
        else if (colValue === 'TO LOC') headerCols.toLoc = i;
        else if (colValue === 'TO DEV') headerCols.toDev = i;
        else if (colValue === 'TO PORT') headerCols.toPort = i;
        else if (colValue === 'TO CONN') headerCols.toConn = i;
        else if (colValue === 'LABEL NUM') headerCols.label = i;
      }
    }
  });
  
  if (headerRowIndex === -1) {
    console.log('Could not find header row in R2b format');
    return wireData;
  }
  
  console.log('Header row found at index:', headerRowIndex);
  console.log('Column mapping:', headerCols);
  
  // Helper function to normalize values from excel cells
  const normalize = (value) => {
    if (!value) return '';
    if (value === '{UNKNWN}') return '';
    return String(value).trim();
  };
  
  // Process data rows (after header row)
  for (let rowNumber = headerRowIndex + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row.values || row.values.length <= 1) continue; // Skip empty rows
    
    // Extract PERMANENT ID components - R2b has a 3-part ID
    const projectCode = isBothell ? 'COB' : normalize(row.getCell(headerCols.permanent || 2).value);
    const part2 = normalize(row.getCell(headerCols.permanent + 1 || 3).value);
    const part3 = normalize(row.getCell(headerCols.permanent + 2 || 4).value);
    
    // Format the numeric part with leading zeros if it's a number
    let formattedPart3 = part3;
    if (!isNaN(parseInt(part3))) {
      formattedPart3 = part3.padStart(3, '0');
    }
    
    // Construct PERMANENT ID
    let permanent = '';
    if (projectCode && part2 && part3) {
      permanent = `${projectCode}-${part2}-${formattedPart3}`;
    }
    
    // Extract FROM/TO fields
    const fromLoc = normalize(row.getCell(headerCols.fromLoc || 5).value);
    const fromDev = normalize(row.getCell(headerCols.fromDev || 6).value);
    const fromPort = normalize(row.getCell(headerCols.fromPort || 7).value);
    const fromConn = normalize(row.getCell(headerCols.fromConn || 8).value);
    
    const toLoc = normalize(row.getCell(headerCols.toLoc || 9).value);
    const toDev = normalize(row.getCell(headerCols.toDev || 10).value);
    const toPort = normalize(row.getCell(headerCols.toPort || 11).value);
    const toConn = normalize(row.getCell(headerCols.toConn || 12).value);
    
    // Get LABEL or construct it from permanent ID
    const labelNum = normalize(row.getCell(headerCols.label || 13).value);
    const label = labelNum || permanent ? `L-${permanent}` : '';
    
    // Only include rows with valid device information
    if (fromDev && toDev) {
      wireData.push({
        permanent,
        fromLoc,
        fromDev,
        fromPort,
        fromConn,
        toLoc,
        toDev,
        toPort,
        toConn,
        label
      });
    }
  }
  
  return wireData;
}

/**
 * Process standard Excel format
 * @param {Object} worksheet - ExcelJS worksheet
 * @returns {Promise<Array>} - Processed wire data
 */
async function processStandardExcel(worksheet) {
  const wireData = [];
  let headers = [];
  
  // Extract headers from first row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });
  
  // Process data rows
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row.values || row.values.length <= 1) continue; // Skip empty rows
    
    const record = {
      permanent: '',
      fromLoc: '',
      fromDev: '',
      fromPort: '',
      fromConn: '',
      toLoc: '',
      toDev: '',
      toPort: '',
      toConn: '',
      label: ''
    };
    
    // Map Excel columns to wire data fields
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      
      const headerLower = String(header).toLowerCase();
      const value = cell.value || '';
      
      if (headerLower === 'permanent' || headerLower === 'permanent id') {
        record.permanent = value;
      } else if (headerLower === 'from_loc' || headerLower === 'from loc') {
        record.fromLoc = value;
      } else if (headerLower === 'from_dev' || headerLower === 'from dev') {
        record.fromDev = value;
      } else if (headerLower === 'from_port' || headerLower === 'from port') {
        record.fromPort = value;
      } else if (headerLower === 'from_conn' || headerLower === 'from conn') {
        record.fromConn = value;
      } else if (headerLower === 'to_loc' || headerLower === 'to loc') {
        record.toLoc = value;
      } else if (headerLower === 'to_dev' || headerLower === 'to dev') {
        record.toDev = value;
      } else if (headerLower === 'to_port' || headerLower === 'to port') {
        record.toPort = value;
      } else if (headerLower === 'to_conn' || headerLower === 'to conn') {
        record.toConn = value;
      } else if (headerLower === 'label' || headerLower === 'label num') {
        record.label = value;
      }
    });
    
    // Format permanent ID with leading zeros
    if (record.permanent) {
      const parts = record.permanent.split('-');
      if (parts.length === 3 && !isNaN(parseInt(parts[2]))) {
        parts[2] = parts[2].padStart(3, '0');
        record.permanent = parts.join('-');
      }
    }
    
    // Generate label if not present
    if (!record.label && record.permanent) {
      record.label = `L-${record.permanent}`;
    }
    
    // Add record if it has essential data
    if (record.permanent && record.fromDev && record.toDev) {
      wireData.push(record);
    }
  }
  
  return wireData;
}

/**
 * Apply City of Bothell specific processing
 * @param {Array} wireData - Wire data records
 * @returns {Array} - Processed wire data
 */
function applyBothellProcessing(wireData) {
  return wireData.map(record => {
    // Replace MSI- prefixes with COB- in permanent IDs and labels
    if (record.permanent && record.permanent.startsWith('MSI-')) {
      record.permanent = record.permanent.replace('MSI-', 'COB-');
    }
    
    if (record.label && record.label.includes('MSI-')) {
      record.label = record.label.replace('MSI-', 'COB-');
    }
    
    // Remove {UNKNWN} values
    Object.keys(record).forEach(key => {
      if (record[key] === '{UNKNWN}') {
        record[key] = '';
      }
    });
    
    return record;
  });
}

/**
 * Create output files from processed data
 * @param {Array} wireData - Processed wire data
 * @param {string} outputDir - Output directory
 * @param {string} originalFilename - Original file name
 * @returns {Promise<Object>} - Result object
 */
async function createOutputFiles(wireData, outputDir, originalFilename) {
  // Generate output file name from original file name
  const fileNameBase = path.basename(originalFilename, path.extname(originalFilename));
  const excelFileName = `${fileNameBase}-converted-${Date.now()}.xlsx`;
  const excelFilePath = path.join(outputDir, excelFileName);
  
  // Create Excel workbook with two sheets: Wire List and Labels
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: Wire List with all data
  const wireListSheet = workbook.addWorksheet('Wire List');
  wireListSheet.columns = [
    { header: 'PERMANENT', key: 'permanent' },
    { header: 'FROM_LOC', key: 'fromLoc' },
    { header: 'FROM_DEV', key: 'fromDev' },
    { header: 'FROM_PORT', key: 'fromPort' },
    { header: 'FROM_CONN', key: 'fromConn' },
    { header: 'TO_LOC', key: 'toLoc' },
    { header: 'TO_DEV', key: 'toDev' },
    { header: 'TO_PORT', key: 'toPort' },
    { header: 'TO_CONN', key: 'toConn' },
    { header: 'LABEL', key: 'label' }
  ];
  
  // Add data to Wire List sheet
  wireListSheet.addRows(wireData);
  
  // Sheet 2: Wire Labels for Brady printer
  const wireLabelsSheet = workbook.addWorksheet('Wire Labels');
  wireLabelsSheet.columns = [
    { header: 'LABEL', key: 'label' },
    { header: 'FROM_DEV', key: 'fromDev' },
    { header: 'FROM_PORT', key: 'fromPort' },
    { header: 'TO_DEV', key: 'toDev' },
    { header: 'TO_PORT', key: 'toPort' }
  ];
  
  // Add data to Wire Labels sheet
  wireLabelsSheet.addRows(wireData.map(wire => ({
    label: wire.label,
    fromDev: wire.fromDev,
    fromPort: wire.fromPort,
    toDev: wire.toDev,
    toPort: wire.toPort
  })));
  
  // Save the workbook
  await workbook.xlsx.writeFile(excelFilePath);
  
  // Create preview data (first few rows)
  const previewData = wireData.slice(0, 10);
  
  // Create a CSV version too
  const csvFileName = `${fileNameBase}-converted-${Date.now()}.csv`;
  const csvFilePath = path.join(outputDir, csvFileName);
  
  // Simple CSV export of the wire list
  const csvHeader = 'PERMANENT,FROM_LOC,FROM_DEV,FROM_PORT,FROM_CONN,TO_LOC,TO_DEV,TO_PORT,TO_CONN,LABEL\n';
  const csvContent = wireData.map(wire => 
    `${wire.permanent},${wire.fromLoc},${wire.fromDev},${wire.fromPort},${wire.fromConn},${wire.toLoc},${wire.toDev},${wire.toPort},${wire.toConn},${wire.label}`
  ).join('\n');
  
  fs.writeFileSync(csvFilePath, csvHeader + csvContent);
  
  // Return result
  return {
    success: true,
    filePath: excelFilePath,
    downloadUrl: `/downloads/${excelFileName}`,
    csvDownloadUrl: `/downloads/${csvFileName}`,
    previewData,
    totalRows: wireData.length,
    message: `Successfully processed ${wireData.length} wire records`
  };
}

module.exports = {
  processExcelFile
};
