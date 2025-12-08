/**
 * Enhanced File Processor
 * Handles multiple file formats including CSV and Excel files (XLS/XLSX)
 */
const path = require('path');
const fs = require('fs');
// Try loading dependencies, with graceful fallback for missing modules
let ExcelJS, parse, stringify;
try {
  ExcelJS = require('exceljs');
} catch (error) {
  console.error('ExcelJS module not found. Excel support will be disabled.');
}

try {
  parse = require('csv-parse/sync').parse;
  stringify = require('csv-stringify/sync').stringify;
} catch (error) {
  console.error('CSV parse/stringify modules not found. Using simple string processing instead.');
  // Simple CSV parsing fallback
  parse = (csvContent) => {
    return csvContent.split('\n')
      .filter(line => line.trim())
      .map(line => line.split(',').map(cell => cell.trim()));
  };
  // Simple CSV stringify fallback
  stringify = (records) => {
    return records.map(row => row.join(',')).join('\n');
  };
}

/**
 * Process an uploaded file with enhanced format support
 */
async function processFile(fileInfo, outputDir) {
  try {
    console.log('Enhanced processor: Processing file', fileInfo.originalname);

    // Extract file extension
    const fileExt = path.extname(fileInfo.originalname).toLowerCase();
    console.log(`File extension detected: ${fileExt}`);

    let records;

    // Handle different file formats
    if (fileExt === '.csv') {
      // CSV processing logic
      const fileContent = fs.readFileSync(fileInfo.path, 'utf8');
      records = await processCSV(fileContent);
    } else if (['.xls', '.xlsx'].includes(fileExt)) {
      // Excel processing logic
      if (!ExcelJS) {
        throw new Error('Excel support is not available. Please install the ExcelJS module.');
      }
      records = await processExcel(fileInfo.path);
    } else {
      throw new Error(`Unsupported file format: ${fileExt}. Please upload CSV or Excel files.`);
    }

    if (!records || records.length === 0) {
      throw new Error('No valid data found in the file.');
    }

    console.log(`Processed ${records.length} records from the file.`);

    // Normalize the records to standard format
    const normalizedRecords = normalizeRecords(records);

    // Generate wire labels and format data
    const result = formatData(normalizedRecords);

    // Generate output files
    return await generateOutputFiles(result, outputDir, fileInfo.originalname);

  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

/**
 * Process CSV file content
 */
async function processCSV(fileContent) {
  try {
    // Check if the file has headers
    const firstLine = fileContent.split('\n')[0];
    const isHeaderless = !firstLine.toLowerCase().includes('permanent');

    // Check for SnoCoTV format
    const hasUnknwnValues = fileContent.includes('{UNKNWN}');
    const isSnoCoTV = (fileContent.includes('STV,') || fileContent.includes('SC2,')) &&
      hasUnknwnValues &&
      fileContent.includes('CONN-TYPE');

    console.log(`CSV file characteristics: isHeaderless=${isHeaderless}, isSnoCoTV=${isSnoCoTV}`);

    let records;
    if (isHeaderless) {
      // Parse without headers, assign column names
      records = parse(fileContent, {
        columns: header => header.map((_, i) => `COL${i + 1}`),
        skip_empty_lines: true,
        trim: true
      });
      console.log('Parsed headerless CSV file with assigned column names');
    } else {
      // Parse with headers
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      console.log('Parsed CSV file with headers');
    }

    return records;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error(`Failed to parse CSV file: ${error.message}`);
  }
}

/**
 * Process Excel file (XLS/XLSX)
 */
async function processExcel(filePath) {
  try {
    console.log(`Processing Excel file: ${filePath}`);
    const workbook = new ExcelJS.Workbook();

    // Load the workbook from file
    await workbook.xlsx.readFile(filePath);

    // Use the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel file contains no worksheets');
    }

    console.log(`Using worksheet: ${worksheet.name}`);

    // Extract headers and determine if we need to assign column names
    const headers = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(cell.value);
    });

    const isHeaderless = !headers.some(header =>
      header && header.toString().toLowerCase().includes('permanent')
    );

    console.log(`Excel file has ${isHeaderless ? 'no' : 'valid'} headers`);

    // Convert Excel data to records
    const records = [];

    // If headerless, use COL1, COL2, etc. as keys
    // Otherwise use the actual headers
    const columnKeys = isHeaderless
      ? headers.map((_, i) => `COL${i + 1}`)
      : headers.map(h => h ? h.toString() : '');

    // Start from row 2 if it has headers, otherwise from row 1
    const startRow = isHeaderless ? 1 : 2;

    // Process each row in the worksheet
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= startRow) {
        const record = {};
        row.eachCell((cell, colNumber) => {
          const key = columnKeys[colNumber - 1] || `COL${colNumber}`;
          record[key] = cell.value ? cell.value.toString() : '';
        });
        records.push(record);
      }
    });

    console.log(`Extracted ${records.length} records from Excel file`);
    return records;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Normalize records to standard format
 */
function normalizeRecords(records) {
  try {
    console.log('Normalizing records to standard format...');

    // Check for various formats
    // Check if this is SnoCoTV format
    const isSnoCoFormat = records.length > 0 &&
      (records[0].COL1 === 'STV' || records[0].COL1 === 'SC2' ||
        (records[0].COL7 && records[0].COL7.includes('CONN-TYPE')));

    // Check if this is R2b_AotW format
    const isR2bFormat = detectR2bFormat(records);

    // Normalize based on detected format
    if (isR2bFormat) {
      console.log('Detected R2b_AotW format, applying special normalization');
      return normalizeR2bRecords(records);
    } else if (isSnoCoFormat) {
      console.log('Detected SnoCoTV format, applying special normalization');
      return normalizeSnoCoRecords(records);
    } else {
      return normalizeStandardRecords(records);
    }
  } catch (error) {
    console.error('Error normalizing records:', error);
    throw error;
  }
}

/**
 * Normalize SnoCoTV format records
 */
function normalizeSnoCoRecords(records) {
  // First, normalize all the records to handle special cases
  const normalizedRecords = records.map(record => {
    // Make a copy of the record to avoid modifying the original
    const newRecord = { ...record };

    // Special handling for {UNKNWN} values - convert to empty strings
    for (const key in newRecord) {
      if (newRecord[key] === '{UNKNWN}') {
        newRecord[key] = '';
      }
    }

    // Handling placeholders like CONN-TYPE or specific connector types
    // Normalize connector types to consistent format
    if (newRecord.COL7 === 'CONN-TYPE') newRecord.COL7 = '';
    if (newRecord.COL11 === 'CONN-TYPE') newRecord.COL11 = '';

    // Improve XLR connection display
    if (newRecord.COL7 && newRecord.COL7.includes('XLR')) {
      newRecord.COL7 = newRecord.COL7.replace('XLR3-M', 'XLR Male').replace('XLR3-F', 'XLR Female');
    }
    if (newRecord.COL11 && newRecord.COL11.includes('XLR')) {
      newRecord.COL11 = newRecord.COL11.replace('XLR3-M', 'XLR Male').replace('XLR3-F', 'XLR Female');
    }

    // Improve connector type display for common types
    if (newRecord.COL7 === 'BNC-M') newRecord.COL7 = 'BNC Male';
    if (newRecord.COL11 === 'BNC-M') newRecord.COL11 = 'BNC Male';
    if (newRecord.COL7 === 'BNC.M') newRecord.COL7 = 'BNC Male';
    if (newRecord.COL11 === 'BNC.M') newRecord.COL11 = 'BNC Male';

    return newRecord;
  });

  // Group records by their permanent ID (COL1-COL2-COL3)
  // Create a sensible permanent ID with proper formatting
  const groupedByPermanent = {};

  normalizedRecords.forEach(record => {
    const col1 = record.COL1 || '';
    const col2 = record.COL2 || '';
    const col3 = record.COL3 || '';

    // Skip if any essential part is missing
    if (!col1 || !col2 || !col3) {
      console.log('Skipping record with incomplete permanent ID', { col1, col2, col3 });
      return;
    }

    // Create a permanent ID
    const permanentId = `${col1}-${col2}-${col3}`;

    // If this permanent ID doesn't exist in our grouping yet, create it
    if (!groupedByPermanent[permanentId]) {
      groupedByPermanent[permanentId] = {
        PERMANENT: permanentId,
        FROM_LOC: record.COL4 || '',
        FROM_DEV: record.COL5 || '',
        FROM_PORT: record.COL6 || '',
        FROM_CONN: record.COL7 || '',
        TO_LOC: record.COL8 || '',
        TO_DEV: record.COL9 || '',
        TO_PORT: record.COL10 || '',
        TO_CONN: record.COL11 || '',
        LABEL: `L-${col2}-${col3}`
      };
    }
  });

  // Convert the grouped objects back to an array
  return Object.values(groupedByPermanent);
}

/**
 * Normalize standard format records
 */
function normalizeStandardRecords(records) {
  // Identify the record format (with headers or headerless)
  const firstRecord = records[0];
  const hasStandardHeaders = firstRecord &&
    (firstRecord.PERMANENT || firstRecord.FROM_LOC || firstRecord.TO_LOC);

  if (hasStandardHeaders) {
    // Records already have standard headers, just make sure all required fields exist
    return records.map(record => {
      // Make sure all required fields exist, defaulting to empty string if missing
      const normalized = {
        PERMANENT: record.PERMANENT || '',
        FROM_LOC: record.FROM_LOC || '',
        FROM_DEV: record.FROM_DEV || '',
        FROM_PORT: record.FROM_PORT || '',
        FROM_CONN: record.FROM_CONN || '',
        TO_LOC: record.TO_LOC || '',
        TO_DEV: record.TO_DEV || '',
        TO_PORT: record.TO_PORT || '',
        TO_CONN: record.TO_CONN || '',
        LABEL: record.LABEL || ''
      };

      // Auto-generate label if missing
      if (!normalized.LABEL && normalized.PERMANENT) {
        const parts = normalized.PERMANENT.split('-');
        if (parts.length >= 2) {
          normalized.LABEL = `L-${parts[parts.length - 2]}-${parts[parts.length - 1]}`;
        } else {
          normalized.LABEL = `L-${normalized.PERMANENT}`;
        }
      }

      return normalized;
    });
  } else {
    // Headerless records with COL format, try to map to standard fields
    return records.map(record => {
      // Analyze record to guess the best mapping
      const colCount = Object.keys(record).length;

      // Default mapping (based on 10-column format):
      // COL1 = PERMANENT, COL2 = FROM_LOC, COL3 = FROM_DEV, COL4 = FROM_PORT, COL5 = FROM_CONN,
      // COL6 = TO_LOC, COL7 = TO_DEV, COL8 = TO_PORT, COL9 = TO_CONN, COL10 = LABEL
      const normalized = {
        PERMANENT: record.COL1 || '',
        FROM_LOC: record.COL2 || '',
        FROM_DEV: record.COL3 || '',
        FROM_PORT: record.COL4 || '',
        FROM_CONN: record.COL5 || '',
        TO_LOC: record.COL6 || '',
        TO_DEV: record.COL7 || '',
        TO_PORT: record.COL8 || '',
        TO_CONN: record.COL9 || '',
        LABEL: record.COL10 || ''
      };

      // Auto-generate label if missing
      if (!normalized.LABEL && normalized.PERMANENT) {
        const parts = normalized.PERMANENT.split('-');
        if (parts.length >= 2) {
          normalized.LABEL = `L-${parts[parts.length - 2]}-${parts[parts.length - 1]}`;
        } else {
          normalized.LABEL = `L-${normalized.PERMANENT}`;
        }
      }

      return normalized;
    });
  }
}

/**
 * Format data for output
 */
function formatData(normalizedRecords) {
  try {
    console.log('Formatting data for output...');

    // Create wire labels with formatted information
    const wireLabels = normalizedRecords.map(record => {
      const fromInfo = `${record.FROM_DEV} ${record.FROM_PORT}`;
      const toInfo = `${record.TO_DEV} ${record.TO_PORT}`;
      const label = record.LABEL;

      return {
        LABEL: label,
        FROM: fromInfo.trim(),
        TO: toInfo.trim(),
        FORMATTED_LABEL: `${label}\n${fromInfo.trim()} → ${toInfo.trim()}`
      };
    });

    return {
      wireData: normalizedRecords,
      wireLabels: wireLabels
    };
  } catch (error) {
    console.error('Error formatting data:', error);
    throw error;
  }
}

/**
 * Generate output files
 */
async function generateOutputFiles(result, outputDir, originalFilename) {
  try {
    console.log('Generating output files...');

    // Post-process results for special formats like City of Bothell
    const processedResult = postProcessResults(result, originalFilename);

    // Create base filename from the original
    const baseFilename = path.basename(originalFilename, path.extname(originalFilename));
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];

    // Create Excel file
    const excelFilename = `${baseFilename}_converted_${timestamp}.xlsx`;
    const excelPath = path.join(outputDir, excelFilename);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();

    // Add Wire Data sheet
    const wireDataSheet = workbook.addWorksheet('Wire Data');

    // Add headers
    wireDataSheet.columns = [
      { header: 'PERMANENT', key: 'PERMANENT' },
      { header: 'FROM_LOC', key: 'FROM_LOC' },
      { header: 'FROM_DEV', key: 'FROM_DEV' },
      { header: 'FROM_PORT', key: 'FROM_PORT' },
      { header: 'FROM_CONN', key: 'FROM_CONN' },
      { header: 'TO_LOC', key: 'TO_LOC' },
      { header: 'TO_DEV', key: 'TO_DEV' },
      { header: 'TO_PORT', key: 'TO_PORT' },
      { header: 'TO_CONN', key: 'TO_CONN' },
      { header: 'LABEL', key: 'LABEL' }
    ];

    // Add data
    processedResult.wireData.forEach(record => {
      wireDataSheet.addRow(record);
    });

    // Check if we need to split labels into multiple tabs
    if (processedResult.wireLabels.length > 50) {
      console.log(`Total labels (${processedResult.wireLabels.length}) > 50. Splitting into tabs by type.`);

      // Group labels by type
      const labelsByType = {};

      processedResult.wireLabels.forEach(label => {
        let type = 'Standard';

        // Try to extract type from LABEL (e.g., L-AN-101 -> AN)
        if (label.LABEL) {
          const parts = label.LABEL.replace(/^{UNKNWN}-?/, '').split('-');
          // Handle various formats
          if (parts.length >= 3) {
            // e.g. L-AN-101 or COB-AN-101 -> AN is usually the second part
            // But sometimes the prefix is just L, so L-AN-101 -> AN
            // If it's COB-AN-101, it's AN
            type = parts[1];
          } else if (parts.length === 2 && parts[0] === 'L') {
            // Simple L-101 format, strictly speaking no "type", put in Standard
            type = 'Standard';
          } else if (parts.length === 2) {
            // e.g. PREFIX-101 -> PREFIX is type
            type = parts[0];
          }
        }

        // Clean up type name for valid sheet name
        type = type.replace(/[*?:\/[\]\\]/g, ''); // Remove invalid Excel sheet chars
        if (!type) type = 'Standard';

        if (!labelsByType[type]) {
          labelsByType[type] = [];
        }
        labelsByType[type].push(label);
      });

      // Create a sheet for each type
      Object.keys(labelsByType).sort().forEach(type => {
        // Excel sheet names max 31 chars
        const sheetName = `Labels ${type}`.substring(0, 31);
        const typeSheet = workbook.addWorksheet(sheetName);

        // Add headers
        typeSheet.columns = [
          { header: 'LABEL', key: 'LABEL' },
          { header: 'FROM', key: 'FROM' },
          { header: 'TO', key: 'TO' },
          { header: 'FORMATTED_LABEL', key: 'FORMATTED_LABEL' }
        ];

        // Add data
        labelsByType[type].forEach(label => {
          typeSheet.addRow(label);
        });

        // Format cells
        typeSheet.getColumn('FORMATTED_LABEL').width = 40;
        typeSheet.getColumn('FROM').width = 20;
        typeSheet.getColumn('TO').width = 20;
      });

    } else {
      // Standard behavior: Single sheet for all labels
      const wireLabelsSheet = workbook.addWorksheet('Wire Labels');

      // Add headers
      wireLabelsSheet.columns = [
        { header: 'LABEL', key: 'LABEL' },
        { header: 'FROM', key: 'FROM' },
        { header: 'TO', key: 'TO' },
        { header: 'FORMATTED_LABEL', key: 'FORMATTED_LABEL' }
      ];

      // Add data
      processedResult.wireLabels.forEach(label => {
        wireLabelsSheet.addRow(label);
      });

      // Format cells
      wireLabelsSheet.getColumn('FORMATTED_LABEL').width = 40;
      wireLabelsSheet.getColumn('FROM').width = 20;
      wireLabelsSheet.getColumn('TO').width = 20;
    }

    // Save the workbook
    await workbook.xlsx.writeFile(excelPath);

    // Create CSV files
    const wireDataCsvFilename = `${baseFilename}_wire_data_${timestamp}.csv`;
    const wireDataCsvPath = path.join(outputDir, wireDataCsvFilename);

    const wireDataCsv = stringify(processedResult.wireData, { header: true });
    fs.writeFileSync(wireDataCsvPath, wireDataCsv);

    const wireLabelsFilename = `${baseFilename}_wire_labels_${timestamp}.csv`;
    const wireLabelsCsvPath = path.join(outputDir, wireLabelsFilename);

    const wireLabelsCsv = stringify(processedResult.wireLabels, { header: true });
    fs.writeFileSync(wireLabelsCsvPath, wireLabelsCsv);

    // Return paths to generated files and preview data
    return {
      excelFilePath: `/download/${excelFilename}`,
      csvFilePath: `/download/${wireDataCsvFilename}`,
      wireLabelsCSVPath: `/download/${wireLabelsFilename}`,
      totalRows: processedResult.wireData.length,
      previewData: processedResult.wireData.slice(0, 10) // Include first 10 records for preview
    };
  } catch (error) {
    console.error('Error generating output files:', error);
    throw error;
  }
}

/**
 * Detect if records are in the R2b_AotW format
 */
function detectR2bFormat(records) {
  if (!records || records.length === 0) return false;

  // Check if any record has headers that match R2b format
  const hasR2bHeaders = records.some(record => {
    // Look for the specific columns that indicate R2b format
    return Object.keys(record).some(key =>
      key.includes('TEMP') || key.includes('PERMANENT'));
  });

  // Additional check: Look for FROM LOC, FROM DEV pattern specific to R2b
  const hasR2bStructure = records.some(record => {
    const keys = Object.keys(record);
    return keys.some(key => key.includes('FROM LOC') || key.includes('FROM_LOC')) &&
      keys.some(key => key.includes('TO LOC') || key.includes('TO_LOC'));
  });

  return hasR2bHeaders && hasR2bStructure;
}

/**
 * Normalize R2b_AotW format records
 */
function normalizeR2bRecords(records) {
  console.log('Processing R2b_AotW format records...');

  // Process the data
  const wireData = [];

  records.forEach((record, index) => {
    // Helper function to clean data and find fields regardless of exact key names
    const findField = (pattern) => {
      const key = Object.keys(record).find(k =>
        k.toUpperCase().includes(pattern.toUpperCase()));
      return key ? (record[key] || '').trim() : '';
    };

    const cleanField = (value) => {
      if (!value || value === '{UNKNWN}') return '';
      return value.trim();
    };

    // Extract fields using flexible matching
    const tempId = cleanField(findField('TEMP'));
    const permanentField = cleanField(findField('PERMANENT'));
    const fromLoc = cleanField(findField('FROM LOC'));
    const fromDev = cleanField(findField('FROM DEV'));
    const fromPort = cleanField(findField('FROM PORT'));
    const fromConn = cleanField(findField('FROM CONN'));
    const toLoc = cleanField(findField('TO LOC'));
    const toDev = cleanField(findField('TO DEV'));
    const toPort = cleanField(findField('TO PORT'));
    const toConn = cleanField(findField('TO CONN'));

    // Construct the permanent ID from the permanent field
    let permanent = '';

    if (permanentField) {
      const parts = permanentField.split('-');
      if (parts.length >= 3) {
        // Use the full permanent ID as provided
        permanent = permanentField;
      } else if (parts.length === 2) {
        // If only two parts, use them as the last two components
        permanent = parts.join('-');
      } else {
        // Fallback for single value
        permanent = `N-AN-${permanentField}`;
      }
    } else if (tempId) {
      // Use temp ID if permanent is not available
      permanent = `N-AN-${tempId}`;
    } else {
      // Create a sequential ID if nothing else is available
      permanent = `N-AN-${String(index + 1).padStart(3, '0')}`;
    }

    // Generate label from permanent ID
    const label = `L-${permanent.split('-').slice(-2).join('-')}`;

    // Only include rows with device information
    if (fromDev || toDev) {
      wireData.push({
        PERMANENT: permanent,
        FROM_LOC: fromLoc,
        FROM_DEV: fromDev,
        FROM_PORT: fromPort,
        FROM_CONN: fromConn,
        TO_LOC: toLoc,
        TO_DEV: toDev,
        TO_PORT: toPort,
        TO_CONN: toConn,
        LABEL: label
      });
    }
  });

  return wireData;
}

/**
 * Post-process results for special formats like City of Bothell
 */
function postProcessResults(result, filename) {
  // Check if this is a City of Bothell file
  const isBothellFile = filename &&
    (filename.toLowerCase().includes('bothell') ||
      filename.toLowerCase().includes('cob') ||
      filename.toLowerCase().includes('cit'));

  if (isBothellFile) {
    console.log('Detected City of Bothell file, applying special post-processing...');

    // Process wire data
    const processedWireData = result.wireData.map(record => ({
      ...record,
      // Replace all MSI- prefixes with COB-
      PERMANENT: record.PERMANENT.replace(/MSI-/g, 'COB-'),
      LABEL: record.LABEL.replace(/MSI-/g, 'COB-'),
      // Remove all {UNKNWN} values
      FROM_LOC: record.FROM_LOC?.replace(/{UNKNWN}/g, '') || '',
      FROM_DEV: record.FROM_DEV?.replace(/{UNKNWN}/g, '') || '',
      FROM_PORT: record.FROM_PORT?.replace(/{UNKNWN}/g, '') || '',
      FROM_CONN: record.FROM_CONN?.replace(/{UNKNWN}/g, '') || '',
      TO_LOC: record.TO_LOC?.replace(/{UNKNWN}/g, '') || '',
      TO_DEV: record.TO_DEV?.replace(/{UNKNWN}/g, '') || '',
      TO_PORT: record.TO_PORT?.replace(/{UNKNWN}/g, '') || '',
      TO_CONN: record.TO_CONN?.replace(/{UNKNWN}/g, '') || ''
    }));

    // Process wire labels
    const processedWireLabels = result.wireLabels.map(label => ({
      ...label,
      LABEL: label.LABEL.replace(/MSI-/g, 'COB-'),
      FROM: label.FROM.replace(/{UNKNWN}/g, ''),
      TO: label.TO.replace(/{UNKNWN}/g, ''),
      FORMATTED_LABEL: label.FORMATTED_LABEL.replace(/MSI-/g, 'COB-').replace(/{UNKNWN}/g, '')
    }));

    return {
      wireData: processedWireData,
      wireLabels: processedWireLabels
    };
  }

  return result;
}

module.exports = { processFile };
