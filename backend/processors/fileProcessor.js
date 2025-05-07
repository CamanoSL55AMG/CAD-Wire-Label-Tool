/**
 * File Processor Module
 * 
 * This module handles the processing of uploaded files,
 * including validation, conversion, and storage.
 * This is a simplified direct implementation to bypass the complex processing pipeline.
 */

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const readline = require('readline');

/**
 * Process an uploaded file - Direct implementation without using the complex processing pipeline
 * @param {Object} fileInfo - Information about the uploaded file
 * @param {string} outputDir - Directory to save the output files
 * @returns {Promise<Object>} - Result object with file paths and preview data
 */
async function processUploadedFile(fileInfo, outputDir) {
  console.log('====== STARTING NEW FILE PROCESSING ======');
  try {
    console.log('Processing uploaded file:', {
      fieldname: fileInfo.fieldname,
      originalname: fileInfo.originalname,
      mimetype: fileInfo.mimetype,
      path: fileInfo.path
    });
    
    // Validate the file
    if (!fileInfo || !fileInfo.path) {
      throw new Error('Invalid file upload');
    }
    
    // Check if file exists
    if (!fs.existsSync(fileInfo.path)) {
      throw new Error('File does not exist or is not accessible');
    }
    
    // Verify file extension
    const fileExtension = path.extname(fileInfo.originalname).toLowerCase();
    if (fileExtension !== '.csv') {
      throw new Error(`Only CSV files are supported. Got: ${fileExtension}`);
    }
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Read and parse the CSV file directly using line-by-line approach
    console.log('Reading CSV file:', fileInfo.path);

    // Read file content
    const fileContent = fs.readFileSync(fileInfo.path, 'utf8');
    console.log(`File content length: ${fileContent.length} bytes`);

    if (fileContent.trim().length === 0) {
      throw new Error('CSV file is empty');
    }

    // Count lines for debugging
    const lineCount = fileContent.split(/\r?\n/).length;
    console.log(`CSV file has ${lineCount} lines`);

    // Parse the CSV with column headers
    console.log('Parsing CSV data...');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      skip_records_with_error: true
    });

    console.log(`Parsed ${records.length} records from CSV`);
    
    if (records.length === 0) {
      throw new Error('No valid data records found in CSV file');
    }

    // Log the first record and total count
    if (records.length > 0) {
      console.log('First record:', JSON.stringify(records[0]));
      console.log(`Total records: ${records.length}`);
    }

    // Extract header fields
    const headers = Object.keys(records[0]);
    console.log('CSV headers:', headers);

    // Convert each record to wire data format
    console.log('Converting records to wire data format...');
    const wireData = [];

    // Process each record
    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        console.log(`Processing record ${i+1}/${records.length}`);
        
        // Determine if this is AutoCAD format
        const isAutoCADFormat = headers.some(h => !isNaN(parseInt(h)));
        
        let permanent, fromLoc, fromDev, fromPort, fromConn, toLoc, toDev, toPort, toConn, label;
      
        // Check if we're dealing with the new simplified format (Header, Device 1, Device 2, Port 1, Port 2)
        const isSimplifiedFormat = headers.length === 5 && 
          headers.includes('Header') && 
          headers.includes('Device 1') && 
          headers.includes('Device 2') && 
          headers.includes('Port 1') && 
          headers.includes('Port 2');
          
        // Check if we're dealing with the tabular format (11 columns, with COL1-COL11 headers)
        const isTabularFormat = headers.length === 11 && 
          (headers.includes('COL1') || headers[0] === 'COL1');

        if (isAutoCADFormat) {
          // AutoCAD specific format (uses numeric headers like 0, 1, 2...)
          permanent = `${record['1'] || ''}-${record['2'] || ''}-${record['3'] ? record['3'].toString().padStart(3, '0') : ''}`;
          fromLoc = record['4'] || '';
          fromDev = record['5'] || '';
          fromPort = record['6'] || '';
          fromConn = record['7'] || '';
          toLoc = record['8'] || '';
          toDev = record['9'] || '';
          toPort = record['10'] || '';
          toConn = record['11'] || '';
        } else if (isTabularFormat) {
          // Handle tabular format with 11 columns
          // Combine columns 1-3 with hyphens to form the permanent ID
          const col1 = record['COL1'] || '';
          const col2 = record['COL2'] || '';
          const col3 = record['COL3'] || '';
          
          // Format col3 with leading zeros if it's a number
          // This handles CAD exports where the number is padded with zeros (e.g., "001" instead of "1")
          let formattedCol3 = col3;
          if (!isNaN(parseInt(col3))) {
            formattedCol3 = col3.padStart(3, '0');
          }
          
          permanent = `${col1}-${col2}-${formattedCol3}`.trim();
          
          // Col4 is ignored as specified
          // Set other fields according to the mapping
          fromLoc = '';                 // Not specified in this format
          fromDev = record['COL5'] || ''; // Device 1
          fromPort = record['COL6'] || ''; // Port 1
          fromConn = record['COL7'] || ''; // Connector 1
          toLoc = record['COL8'] || '';   // Destination location
          toDev = record['COL9'] || '';   // Device 2
          toPort = record['COL10'] || ''; // Port 2
          toConn = record['COL11'] || ''; // Connector 2
        } else if (isSimplifiedFormat) {
          // Handle new simplified format (Header, Device 1, Device 2, Port 1, Port 2)
          permanent = record['Header'] || `WIRE-${i + 1}`;
          fromDev = record['Device 1'] || '';
          fromPort = record['Port 1'] || '';
          toDev = record['Device 2'] || '';
          toPort = record['Port 2'] || '';
          
          // Set default values for location and connection fields
          fromLoc = 'RACK'; // Default value
          toLoc = 'RACK';   // Default value
          fromConn = '';    // Empty by default
          toConn = '';      // Empty by default
        } else {
          // Try to auto-detect standard column names
          const findField = (possibleNames) => {
            return headers.find(header => {
              return possibleNames.some(name => 
                header.toLowerCase() === name.toLowerCase()
              );
            });
          };
          
          const permanentField = findField(['PERMANENT', 'ID', 'Wire', 'WIRE_ID', 'WireNumber']);
          const fromLocField = findField(['FROM_LOC', 'FromLocation', 'fromLoc']);
          const fromDevField = findField(['FROM_DEV', 'FromDevice', 'fromDev']);
          const fromPortField = findField(['FROM_PORT', 'FromPort', 'from_port']);
          const fromConnField = findField(['FROM_CONN', 'FromConn', 'fromConn']);
          const toLocField = findField(['TO_LOC', 'ToLocation', 'toLoc']);
          const toDevField = findField(['TO_DEV', 'ToDevice', 'toDev']);
          const toPortField = findField(['TO_PORT', 'ToPort', 'to_port']);
          const toConnField = findField(['TO_CONN', 'ToConn', 'toConn']);
          const labelField = findField(['LABEL', 'Label']);
          
          permanent = permanentField ? record[permanentField] : `WIRE-${index + 1}`;
          fromLoc = fromLocField ? record[fromLocField] : '';
          fromDev = fromDevField ? record[fromDevField] : '';
          fromPort = fromPortField ? record[fromPortField] : '';
          fromConn = fromConnField ? record[fromConnField] : '';
          toLoc = toLocField ? record[toLocField] : '';
          toDev = toDevField ? record[toDevField] : '';
          toPort = toPortField ? record[toPortField] : '';
          toConn = toConnField ? record[toConnField] : '';
          label = labelField ? record[labelField] : '';
        }
      
        // Generate label if not present
        if (!label) {
          label = `L-${permanent}`;
        }
        
        const wireItem = {
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
        };
        
        console.log(`Created wire data item ${index + 1}`);
        wireData.push(wireItem);
      } catch (recordError) {
        console.error(`Error processing record ${index + 1}:`, recordError);
        // Continue processing other records
      }
    }
    
    console.log(`Processed wire data count: ${wireData.length}`);
    console.log('Wire data array:', JSON.stringify(wireData, null, 2));

    // Create output files with 3 letters from original filename and current date
    // Format: [First 3 letters]_YYYY-MM-DD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Extract the first 3 letters from the original filename
    const originalFilename = path.basename(fileInfo.originalname, path.extname(fileInfo.originalname));
    // Get first 3 letters, defaulting to 'CAD' if filename is too short
    const prefix = originalFilename.length >= 3 ? 
      originalFilename.substring(0, 3).toUpperCase() : 
      'CAD';
    
    const baseFilename = `${prefix}_${dateStr}`;
    const excelFilePath = path.join(outputDir, `${baseFilename}.xlsx`);
    const csvFilePath = path.join(outputDir, `${baseFilename}.csv`);

    // Create Excel workbook with two sheets
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CAD Wire Converter';
    workbook.created = new Date();

    // 1. Create Wire Data sheet
    console.log('Creating Wire Data sheet with', wireData.length, 'rows');
    const mainSheet = workbook.addWorksheet('Wire Data');
    
    // Add header row
    mainSheet.addRow([
      'PERMANENT', 'FROM_LOC', 'FROM_DEV', 'FROM_PORT', 'FROM_CONN', 
      'TO_LOC', 'TO_DEV', 'TO_PORT', 'TO_CONN', 'LABEL'
    ]);
    mainSheet.getRow(1).font = { bold: true };
    
    // Add data rows one by one with explicit row counting
    for (let i = 0; i < wireData.length; i++) {
      const wire = wireData[i];
      console.log(`Adding Wire Data row ${i+1}/${wireData.length}: ${wire.permanent}`);
      
      mainSheet.addRow([
        wire.permanent,
        wire.fromLoc,
        wire.fromDev,
        wire.fromPort,
        wire.fromConn,
        wire.toLoc,
        wire.toDev,
        wire.toPort,
        wire.toConn,
        wire.label
      ]);
    }
    
    // 2. Create Wire Labels sheet
    console.log('Creating Wire Labels sheet with', wireData.length, 'rows');
    const labelsSheet = workbook.addWorksheet('Wire Labels');
    
    // Add header row
    labelsSheet.addRow(['LABEL ID', 'FROM DEVICE/PORT', 'TO DEVICE/PORT']);
    labelsSheet.getRow(1).font = { bold: true };
    
    // Add label rows one by one with explicit row counting
    for (let i = 0; i < wireData.length; i++) {
      const wire = wireData[i];
      const leftSide = `${wire.fromDev}\n${wire.fromPort}`;
      const rightSide = `${wire.toDev}\n${wire.toPort}`;
      
      console.log(`Adding Wire Label row ${i+1}/${wireData.length}: ${wire.label}`);
      labelsSheet.addRow([wire.label, leftSide, rightSide]);
    }
    
    // Save Excel workbook to file
    console.log('Saving Excel file to:', excelFilePath);
    await workbook.xlsx.writeFile(excelFilePath);
    console.log('Excel file saved successfully');
    
    // Create CSV output file
    console.log('Creating CSV file with', wireData.length, 'rows');
    const csvData = [
      ['PERMANENT', 'FROM_LOC', 'FROM_DEV', 'FROM_PORT', 'FROM_CONN', 
       'TO_LOC', 'TO_DEV', 'TO_PORT', 'TO_CONN', 'LABEL']
    ];
    
    // Add data rows
    for (let i = 0; i < wireData.length; i++) {
      const wire = wireData[i];
      csvData.push([
        wire.permanent,
        wire.fromLoc,
        wire.fromDev,
        wire.fromPort,
        wire.fromConn,
        wire.toLoc,
        wire.toDev,
        wire.toPort,
        wire.toConn,
        wire.label
      ]);
    }
    
    // Write CSV to file
    const csvContent = stringify(csvData);
    fs.writeFileSync(csvFilePath, csvContent, 'utf8');
    console.log('CSV file saved successfully');
    
    // Create preview data for the frontend (up to 10 rows)
    const previewData = wireData.slice(0, 10).map(wire => ({
      PERMANENT: wire.permanent,
      FROM_LOC: wire.fromLoc,
      FROM_DEV: wire.fromDev,
      FROM_PORT: wire.fromPort,
      FROM_CONN: wire.fromConn,
      TO_LOC: wire.toLoc,
      TO_DEV: wire.toDev,
      TO_PORT: wire.toPort,
      TO_CONN: wire.toConn,
      LABEL: wire.label
    }));
    
    // Return results to caller
    const result = {
      excelFilePath: `/download/${path.basename(excelFilePath)}`,
      csvFilePath: `/download/${path.basename(csvFilePath)}`,
      googleSheetUrl: null, // No Google Sheets integration
      previewData: previewData,
      totalRows: wireData.length
    };
    
    console.log(`Processing complete: ${wireData.length} rows processed`);
    return result;
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

module.exports = {
  processUploadedFile
};

