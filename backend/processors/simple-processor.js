/**
 * Simple File Processor
 * A minimalist approach to ensure all rows are processed
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

/**
 * Process an uploaded file - Ultra simplified version
 */
async function processFile(fileInfo, outputDir) {
  try {
    console.log('Simple processor: Processing file', fileInfo.originalname);
    
    // Read and parse CSV directly
    const fileContent = fs.readFileSync(fileInfo.path, 'utf8');
    
    // Check if this is a CAD format file without headers (like SnoCoTV)
    const hasUnknwnValues = fileContent.includes('{UNKNWN}');
    const firstLine = fileContent.split('\n')[0];
    const isHeaderless = !firstLine.toLowerCase().includes('permanent');
    
    // More specific SnoCoTV detection logic
    // SnoCoTV files typically have STV or SC2 as the first column values, and no headers
    // They also use {UNKNWN} placeholders and have CONN-TYPE values
    const isSnoCoTV = (fileContent.includes('STV,') || fileContent.includes('SC2,')) && 
                     hasUnknwnValues && 
                     fileContent.includes('CONN-TYPE');
                     
    // Log file characteristics for debugging
    console.log(`File details:\n- hasUnknwnValues: ${hasUnknwnValues}\n- isHeaderless: ${isHeaderless}\n- isSnoCoTV: ${isSnoCoTV}\n- First line: ${firstLine}`);
    
    // Improved format detection
    const isSnoCoFormat = isSnoCoTV;
    
    console.log(`File characteristics: hasUnknwnValues=${hasUnknwnValues}, isHeaderless=${isHeaderless}, isSnoCoFormat=${isSnoCoFormat}`);
    
    let records;
    if (isHeaderless) {
      // Parse without headers, assign column names
      records = parse(fileContent, {
        columns: header => header.map((_, i) => `COL${i+1}`),
        skip_empty_lines: true,
        trim: true
      });
      console.log('Parsed headerless file with assigned column names');
      
      // For SnoCoTV format, we need special preprocessing
      if (isSnoCoFormat) {
        console.log('Detected SnoCoTV format, applying special processing');
        
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
          
          // Format col3 with leading zeros if it's a number
          let formattedCol3 = col3;
          if (!isNaN(parseInt(col3))) {
            formattedCol3 = col3.padStart(3, '0');
          }
          
          const permanentId = `${col1}-${col2}-${formattedCol3}`.trim();
          
          if (!groupedByPermanent[permanentId]) {
            groupedByPermanent[permanentId] = [];
          }
          groupedByPermanent[permanentId].push(record);
        });
        
        // Process each permanent ID group to merge information from multiple rows
        // This handles cases where a connection is described across multiple rows
        const mergedRecords = [];
        
        Object.entries(groupedByPermanent).forEach(([permanentId, recordGroup]) => {
          const mergedRecord = { COL1: '', COL2: '', COL3: '' };
          
          // Set the permanent ID parts
          const parts = permanentId.split('-');
          if (parts.length === 3) {
            mergedRecord.COL1 = parts[0];
            mergedRecord.COL2 = parts[1];
            mergedRecord.COL3 = parts[2];
          }
          
          // Sort the record group to prioritize records that have more information
          // This ensures we use the most complete record for each side (FROM/TO)
          const sortedRecordGroup = [...recordGroup].sort((a, b) => {
            // Count non-empty values in each record for FROM and TO sections
            const aFromScore = [a.COL4, a.COL5, a.COL6, a.COL7].filter(Boolean).length;
            const aToScore = [a.COL8, a.COL9, a.COL10, a.COL11].filter(Boolean).length;
            const bFromScore = [b.COL4, b.COL5, b.COL6, b.COL7].filter(Boolean).length;
            const bToScore = [b.COL8, b.COL9, b.COL10, b.COL11].filter(Boolean).length;
            
            // Prioritize records with more information
            return (bFromScore + bToScore) - (aFromScore + aToScore);
          });
          
          // Process FROM side data first (most complete record first)
          for (const record of sortedRecordGroup) {
            // If this record has any FROM data, use it
            if (record.COL4 || record.COL5 || record.COL6 || record.COL7) {
              mergedRecord.COL4 = record.COL4 || mergedRecord.COL4 || '';  // FROM_LOC
              mergedRecord.COL5 = record.COL5 || mergedRecord.COL5 || '';  // FROM_DEV
              mergedRecord.COL6 = record.COL6 || mergedRecord.COL6 || '';  // FROM_PORT
              mergedRecord.COL7 = record.COL7 || mergedRecord.COL7 || '';  // FROM_CONN
              
              // If we now have complete FROM data, stop looking
              if (mergedRecord.COL4 && mergedRecord.COL5) {
                break;
              }
            }
          }
          
          // Now process TO side data (most complete record first)
          for (const record of sortedRecordGroup) {
            // If this record has any TO data, use it
            if (record.COL8 || record.COL9 || record.COL10 || record.COL11) {
              mergedRecord.COL8 = record.COL8 || mergedRecord.COL8 || '';  // TO_LOC
              mergedRecord.COL9 = record.COL9 || mergedRecord.COL9 || '';  // TO_DEV
              mergedRecord.COL10 = record.COL10 || mergedRecord.COL10 || '';  // TO_PORT
              mergedRecord.COL11 = record.COL11 || mergedRecord.COL11 || '';  // TO_CONN
              
              // If we now have complete TO data, stop looking
              if (mergedRecord.COL8 && mergedRecord.COL9) {
                break;
              }
            }
          }
          
          // Special case handling: if a connector has text like "FROM" or "TO", 
          // make sure it's on the correct side
          if (mergedRecord.COL6 && mergedRecord.COL6.toUpperCase().includes('FROM')) {
            // This is actually a TO port that mentions the origin
            if (!mergedRecord.COL10) mergedRecord.COL10 = mergedRecord.COL6;
            mergedRecord.COL6 = '';
          }
          
          if (mergedRecord.COL10 && mergedRecord.COL10.toUpperCase().includes('TO')) {
            // This is actually a FROM port that mentions the destination
            if (!mergedRecord.COL6) mergedRecord.COL6 = mergedRecord.COL10;
            mergedRecord.COL10 = '';
          }
          
          mergedRecords.push(mergedRecord);
        });
        
        console.log(`Merged ${records.length} records into ${mergedRecords.length} unique connections`);
        records = mergedRecords;
      }
    } else {
      // Standard parse with headers
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      console.log('Parsed file with headers');
    }
    
    console.log(`Parsed ${records.length} records from CSV`);
    
    let wireData = [];
    
    // Normalize values helper function - replace {UNKNWN} with empty strings
    const normalizeValue = (val) => {
      if (!val) return '';
      if (val === '{UNKNWN}') return '';
      return val;
    };
    
    // Handle specialized SnoCoTV format separately from other formats
    if (isSnoCoFormat) {
      console.log('Processing with dedicated SnoCoTV handler');
      
      // For SnoCoTV format, we need to process records as columns without headers
      wireData = records.map(record => {
        // Extract and format the permanent ID
        const col1 = normalizeValue(record.COL1) || '';
        const col2 = normalizeValue(record.COL2) || '';
        const col3 = normalizeValue(record.COL3) || '';
        
        // Handle missing parts of permanent ID
        if (!col1 || !col2 || !col3) {
          console.log('Skipping record with incomplete permanent ID', { col1, col2, col3 });
          // Create a partial record with what we have
          return {
            permanent: '',
            fromLoc: normalizeValue(record.COL4) || '',
            fromDev: normalizeValue(record.COL5) || '',
            fromPort: normalizeValue(record.COL6) || '',
            fromConn: normalizeValue(record.COL7) || '',
            toLoc: normalizeValue(record.COL8) || '',
            toDev: normalizeValue(record.COL9) || '',
            toPort: normalizeValue(record.COL10) || '',
            toConn: normalizeValue(record.COL11) || '',
            label: ''
          };
        }
        
        // Format col3 with leading zeros if it's a number
        let formattedCol3 = col3;
        if (!isNaN(parseInt(col3))) {
          formattedCol3 = col3.padStart(3, '0');
        }
        
        const permanent = `${col1}-${col2}-${formattedCol3}`.trim();
        
        // Fix connector display formats
        let fromConn = normalizeValue(record.COL7);
        let toConn = normalizeValue(record.COL11);
        
        // Replace CONN-TYPE placeholder
        if (fromConn === 'CONN-TYPE') fromConn = '';
        if (toConn === 'CONN-TYPE') toConn = '';
        
        // Improve XLR connection display
        if (fromConn && fromConn.includes('XLR')) {
          fromConn = fromConn.replace('XLR3-M', 'XLR Male').replace('XLR3-F', 'XLR Female');
        }
        if (toConn && toConn.includes('XLR')) {
          toConn = toConn.replace('XLR3-M', 'XLR Male').replace('XLR3-F', 'XLR Female');
        }
        
        // Improve BNC connector display
        if (fromConn === 'BNC-M' || fromConn === 'BNC.M') fromConn = 'BNC Male';
        if (toConn === 'BNC-M' || toConn === 'BNC.M') toConn = 'BNC Male';
        
        // Fix port descriptions with FROM/TO directional hints
        let fromPort = normalizeValue(record.COL6);
        let toPort = normalizeValue(record.COL10);
        
        if (fromPort && fromPort.toUpperCase().includes('TO ')) {
          // This is likely a destination reference
          if (!toPort) toPort = fromPort;
          fromPort = '';
        }
        
        if (toPort && toPort.toUpperCase().includes('FROM ')) {
          // This is likely a source reference
          if (!fromPort) fromPort = toPort;
          toPort = '';
        }
        
        // Make sure permanent ID doesn't have L- prefix (that should only be in the label)
        // Remove any L- prefix if it exists
        const cleanPermanent = permanent.startsWith('L-') ? permanent.substring(2) : permanent;
        
        const wireRecord = {
          permanent: cleanPermanent, // Use the clean permanent ID without L- prefix
          fromLoc: normalizeValue(record.COL4),
          fromDev: normalizeValue(record.COL5),
          fromPort,
          fromConn,
          toLoc: normalizeValue(record.COL8),
          toDev: normalizeValue(record.COL9),
          toPort,
          toConn,
          label: `L-${cleanPermanent}` // Add L- only to the label
        };
        
        return wireRecord;
      }).filter(record => record.permanent);
      
      console.log(`Created ${wireData.length} wire data records for SnoCoTV format`);
    } else {
      // Standard format processing for non-SnoCoTV files
      wireData = records.map(record => {
        let permanent = '';
        let fromLoc = '';
        let fromDev = '';
        let fromPort = '';
        let fromConn = '';
        let toLoc = '';
        let toDev = '';
        let toPort = '';
        let toConn = '';
        
        // Check if we're dealing with standard format or need to parse a special format
        if (record.PERMANENT) {
          // Standard format with PERMANENT column
          permanent = record.PERMANENT;
          
          // Check if this is a permanent ID that should be formatted with leading zeros
          // Example: NAM-AL-1 should become NAM-AL-001
          if (permanent) {
            const parts = permanent.split('-');
            if (parts.length === 3 && !isNaN(parseInt(parts[2]))) {
              // Format the third part with leading zeros
              parts[2] = parts[2].padStart(3, '0');
              permanent = parts.join('-');
            }
          }
          
          // Standard column mapping
          fromLoc = normalizeValue(record.FROM_LOC);
          fromDev = normalizeValue(record.FROM_DEV);
          fromPort = normalizeValue(record.FROM_PORT);
          fromConn = normalizeValue(record.FROM_CONN);
          toLoc = normalizeValue(record.TO_LOC);
          toDev = normalizeValue(record.TO_DEV);
          toPort = normalizeValue(record.TO_PORT);
          toConn = normalizeValue(record.TO_CONN);
        } else if (record.COL1 && record.COL2 && record.COL3) {
          // This is the tabular format with 11 columns (non-SnoCoTV CAD export)
          // Combine COL1-COL3 with hyphens to form the permanent ID
          const col1 = normalizeValue(record.COL1);
          const col2 = normalizeValue(record.COL2);
          const col3 = normalizeValue(record.COL3);
          
          // Format col3 with leading zeros if it's a number
          let formattedCol3 = col3;
          if (!isNaN(parseInt(col3))) {
            formattedCol3 = col3.padStart(3, '0');
          }
          
          permanent = `${col1}-${col2}-${formattedCol3}`.trim();
          
          // Regular column mapping (not SnoCoTV specific)
          fromLoc = normalizeValue(record.COL4);
          fromDev = normalizeValue(record.COL5);
          fromPort = normalizeValue(record.COL6);
          fromConn = normalizeValue(record.COL7);
          toLoc = normalizeValue(record.COL8);
          toDev = normalizeValue(record.COL9);
          toPort = normalizeValue(record.COL10);
          toConn = normalizeValue(record.COL11);
        }
        
        // Generate label using permanent ID if not provided in the record
        const label = normalizeValue(record.LABEL) || `L-${permanent}`;
        
        return {
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
      });
    }
    
    // Generate output filenames using 3 letters from original filename and current date
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
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create Excel file
    const workbook = new ExcelJS.Workbook();
    
    // Create Wire Data sheet
    const dataSheet = workbook.addWorksheet('Wire Data');
    dataSheet.addRow([
      'PERMANENT', 'FROM_LOC', 'FROM_DEV', 'FROM_PORT', 'FROM_CONN',
      'TO_LOC', 'TO_DEV', 'TO_PORT', 'TO_CONN', 'LABEL'
    ]);
    
    // Add all wire data rows
    for (const wire of wireData) {
      dataSheet.addRow([
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
    
    // Create Labels sheet specifically formatted for Brady M611 labeler and Brady Xpress App
    const labelsSheet = workbook.addWorksheet('Wire Labels');
    
    // Set specific column widths for Brady M611 compatibility
    // Standard Brady M611 label width is approximately 24mm (or about 3/4 inch)
    labelsSheet.getColumn('A').width = 15;  // Left side
    labelsSheet.getColumn('B').width = 20;  // Middle
    labelsSheet.getColumn('C').width = 15;  // Right side
    
    // For Brady M611, we need to ensure proper label dimensions with enough margin
    labelsSheet.properties.defaultRowHeight = 20; // Set appropriate row height
    
    // Generate each wire label in Brady compatible format
    for (const wire of wireData) {
      // Add spacing before each label (Brady labels need spacing between labels for printing)
      labelsSheet.addRow(['', '', '']);
      
      // Create the Brady arrow banner format for the label ID
      const bannerRowIndex = labelsSheet.rowCount + 1;
      const bannerRow = labelsSheet.addRow(['', wire.label, '']);
      bannerRow.height = 25; // Increase height for banner row
      
      // Style the label ID in a black banner with white text - Brady M611 style
      const labelCell = labelsSheet.getCell(`B${bannerRowIndex}`);
      labelCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF000000' } // Black background for Brady arrow style
      };
      
      // Add border to create arrow-like appearance (Brady style)
      labelCell.border = {
        top: { style: 'thick', color: { argb: 'FF000000' } },
        bottom: { style: 'thick', color: { argb: 'FF000000' } },
      };
      
      // FROM Device row - left side
      const fromDevRowIndex = bannerRowIndex + 1;
      const deviceRow = labelsSheet.addRow([wire.fromDev, '', wire.toDev]);
      deviceRow.height = 20;
      
      // Format FROM device info - monospace font for Brady compatibility
      const fromDevCell = labelsSheet.getCell(`A${fromDevRowIndex}`);
      fromDevCell.font = { bold: true, size: 10, name: 'Courier New' };
      fromDevCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Format TO device info - monospace font for Brady compatibility
      const toDevCell = labelsSheet.getCell(`C${fromDevRowIndex}`);
      toDevCell.font = { bold: true, size: 10, name: 'Courier New' };
      toDevCell.alignment = { horizontal: 'right', vertical: 'middle' };
      
      // FROM Port row - left side
      const fromPortRowIndex = fromDevRowIndex + 1;
      const portRow = labelsSheet.addRow([wire.fromPort, '', wire.toPort]);
      portRow.height = 20;
      
      // Format FROM port info
      const fromPortCell = labelsSheet.getCell(`A${fromPortRowIndex}`);
      fromPortCell.font = { size: 10, name: 'Courier New' };
      fromPortCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Format TO port info
      const toPortCell = labelsSheet.getCell(`C${fromPortRowIndex}`);
      toPortCell.font = { size: 10, name: 'Courier New' };
      toPortCell.alignment = { horizontal: 'right', vertical: 'middle' };
      
      // Add spacing after each label for Brady printer separation
      labelsSheet.addRow(['', '', '']);
      labelsSheet.addRow(['', '', '']);
    }
    
    // Add a second worksheet with just the data in Brady import format
    // This provides a simple data table that can be imported directly into Brady software
    const bradyDataSheet = workbook.addWorksheet('Brady Import Data');
    
    // Add headers for Brady import
    bradyDataSheet.addRow(['LABEL_ID', 'LEFT_DEVICE', 'LEFT_PORT', 'RIGHT_DEVICE', 'RIGHT_PORT']);
    bradyDataSheet.getRow(1).font = { bold: true };
    
    // Add data for Brady import
    wireData.forEach(wire => {
      // For Brady Import Data, use the raw permanent ID without L- prefix
      // The permanent ID should not have L- prefix, but the label will have it
      bradyDataSheet.addRow([wire.permanent, wire.fromDev, wire.fromPort, wire.toDev, wire.toPort]);
    });
    
    // Format the Brady import data columns
    bradyDataSheet.columns.forEach(column => {
      column.width = 15;
      column.alignment = { horizontal: 'left' };
    });
    
    // Add a note about Brady import
    bradyDataSheet.addRow([]);
    bradyDataSheet.addRow(['NOTE: This sheet can be imported directly into Brady Express App or M611 software.']);
    const noteCell = bradyDataSheet.getCell(`A${bradyDataSheet.rowCount}`);
    noteCell.font = { italic: true, color: { argb: 'FF666666' } };
    
    // Save Excel file
    await workbook.xlsx.writeFile(excelFilePath);
    
    // Create CSV output
    const csvData = [
      ['PERMANENT', 'FROM_LOC', 'FROM_DEV', 'FROM_PORT', 'FROM_CONN',
       'TO_LOC', 'TO_DEV', 'TO_PORT', 'TO_CONN', 'LABEL']
    ];
    
    for (const wire of wireData) {
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
    
    // Write CSV file
    const csvContent = stringify(csvData);
    fs.writeFileSync(csvFilePath, csvContent, 'utf8');
    
    // Return results
    return {
      excelFilePath: `/download/${path.basename(excelFilePath)}`,
      csvFilePath: `/download/${path.basename(csvFilePath)}`,
      googleSheetUrl: null,
      previewData: wireData.map(wire => ({
        PERMANENT: wire.permanent,
        FROM_LOC: wire.fromLoc,
        FROM_DEV: wire.fromDev,
        FROM_PORT: wire.fromPort,
        FROM_CONN: wire.fromConn,
        TO_LOC: wire.toLoc,
        TO_DEV: wire.toDev,
        TO_PORT: wire.TO_PORT,
        TO_CONN: wire.toConn,
        LABEL: wire.label
      })),
      totalRows: wireData.length
    };
    
  } catch (error) {
    console.error('Simple processor error:', error);
    throw error;
  }
}

module.exports = { processFile };
