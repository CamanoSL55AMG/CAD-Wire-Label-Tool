const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { stringify } = require('csv-stringify/sync');

/**
 * Label Processor class for converting wire data to Brady M611 label format
 */
class LabelProcessor {
  /**
   * Process wire data into Brady M611 label format
   * @param {Array} data - Array of wire data records
   * @returns {Object} Processed data with label text and formatting
   */
  processData(data) {
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid data format provided to label processor');
    }

    const processedData = {
      totalRecords: data.length,
      data: data.map(record => this.formatRecord(record))
    };

    return processedData;
  }

  /**
   * Format a single record with label text
   * @param {Object} record - Individual wire data record
   * @returns {Object} Record with label text formatting
   */
  formatRecord(record) {
    // If record is already formatted, return as is
    if (record.LABEL_TEXT) {
      return record;
    }

    // Ensure all required fields have fallback values
    const safeRecord = {
      PERMANENT: record.PERMANENT || '',
      FROM_LOC: record.FROM_LOC || '',
      FROM_DEV: record.FROM_DEV || '',
      FROM_PORT: record.FROM_PORT || '',
      FROM_CONN: record.FROM_CONN || '',
      TO_LOC: record.TO_LOC || '',
      TO_DEV: record.TO_DEV || '',
      TO_PORT: record.TO_PORT || '',
      TO_CONN: record.TO_CONN || '',
      LABEL: record.LABEL || record.PERMANENT || `L-${Date.now()}`
    };

    // Create label text formatting
    return {
      ...safeRecord,
      LABEL_TEXT: {
        id: safeRecord.LABEL,
        from: `${safeRecord.FROM_DEV} ${safeRecord.FROM_PORT}`,
        to: `${safeRecord.TO_DEV} ${safeRecord.TO_PORT}`,
        bradyColumns: {
          Label_ID: safeRecord.LABEL || '',
          Device_ID_From: safeRecord.FROM_DEV || '',
          Port_ID_From: safeRecord.FROM_PORT || '',
          Device_ID_To: safeRecord.TO_DEV || '',
          Port_ID_To: safeRecord.TO_PORT || ''
        }
      }
    };
  }

  /**
   * Generate CSV output file
   * @param {Object} data - Processed data
   * @param {string} fileName - Output file name
   * @returns {string} Path to the generated file
   */
  async generateCSV(data, fileName) {
    try {
      // Ensure data is in the correct format
      if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
        throw new Error('Invalid data format provided to CSV generator');
      }

      // Ensure output directory exists
      const outputDir = path.join(__dirname, '../../outputs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Generate CSV string
      const csvContent = stringify(data.data.map(record => {
        // Filter out complex objects like LABEL_TEXT
        const csvRecord = {};
        for (const key in record) {
          if (typeof record[key] !== 'object' || record[key] === null) {
            csvRecord[key] = record[key];
          }
        }
        return csvRecord;
      }), { header: true });
      
      // Write to file
      const outputPath = path.join(outputDir, `${fileName}.csv`);
      fs.writeFileSync(outputPath, csvContent);
      
      return outputPath;
    } catch (error) {
      console.error('Error generating CSV output:', error);
      throw error;
    }
  }

  /**
   * Generate Excel output file
   * @param {Object} data - Processed data
   * @param {string} fileName - Output file name
   * @returns {string} Path to the generated file
   */
  async generateExcel(data, fileName) {
    try {
      // Ensure data is in the correct format
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.error('Invalid data format provided to Excel generator:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
        throw new Error('Invalid data format provided to Excel generator');
      }
      
      if (data.data.length === 0) {
        throw new Error('No data records to process');
      }

      // Ensure output directory exists
      const outputDir = path.join(__dirname, '../../outputs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Create new workbook
      const workbook = new ExcelJS.Workbook();
      
      // Add data worksheet
      const dataSheet = workbook.addWorksheet('Label Data');
      
      // Get headers (excluding complex objects like LABEL_TEXT)
      const headers = Object.keys(data.data[0]).filter(key => key !== 'LABEL_TEXT');
      
      // Add headers
      dataSheet.addRow(headers);
      
      // Add data rows
      data.data.forEach(record => {
        dataSheet.addRow(headers.map(header => {
          // Handle complex types - convert to string representation
          if (typeof record[header] === 'object' && record[header] !== null) {
            return JSON.stringify(record[header]);
          }
          return record[header] || '';
        }));
      });
      
      // Format data sheet
      headers.forEach((header, index) => {
        dataSheet.getColumn(index + 1).width = Math.max(header.length, 15);
      });
      
      // Add labels worksheet
      const labelsSheet = workbook.addWorksheet('Labels');
      
      // Add label display
      labelsSheet.addRow(['Label ID', 'From', 'To']);
      
      data.data.forEach(record => {
        // Make sure LABEL_TEXT exists before trying to access properties
        const labelText = record.LABEL_TEXT || {};
        labelsSheet.addRow([
          labelText.id || record.LABEL || '',
          labelText.from || `${record.FROM_DEV || ''} ${record.FROM_PORT || ''}`,
          labelText.to || `${record.TO_DEV || ''} ${record.TO_PORT || ''}`
        ]);
      });
      
      // Format label sheet
      labelsSheet.getColumn(1).width = 15;
      labelsSheet.getColumn(2).width = 25;
      labelsSheet.getColumn(3).width = 25;

      // Add Brady M611 formatted worksheet
      const bradySheet = workbook.addWorksheet('Brady M611 Labels');
      
      // Add Brady M611 format headers with the 5 required columns
      bradySheet.addRow(['Label_ID', 'Device_ID_From', 'Port_ID', 'Device_ID_To', 'Port_ID']);
      
      // Add Brady M611 formatted rows with the 5 columns
      data.data.forEach(record => {
        // Create Brady columns even if they don't exist in the record
        const labelText = record.LABEL_TEXT || {};
        const bradyColumns = labelText.bradyColumns || {
          Label_ID: record.LABEL || '',
          Device_ID_From: record.FROM_DEV || '',
          Port_ID_From: record.FROM_PORT || '',
          Device_ID_To: record.TO_DEV || '',
          Port_ID_To: record.TO_PORT || ''
        };
        
        bradySheet.addRow([
          bradyColumns.Label_ID,
          bradyColumns.Device_ID_From,
          bradyColumns.Port_ID_From,
          bradyColumns.Device_ID_To,
          bradyColumns.Port_ID_To
        ]);
      });
      
      // Format Brady M611 sheet
      bradySheet.getColumn(1).width = 15; // Label_ID
      bradySheet.getColumn(2).width = 15; // Device_ID_From
      bradySheet.getColumn(3).width = 10; // Port_ID
      bradySheet.getColumn(4).width = 15; // Device_ID_To
      bradySheet.getColumn(5).width = 10; // Port_ID
      
      // Style the Brady sheet for easy printing
      bradySheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // Header row styling
          row.eachCell(cell => {
            cell.font = { bold: true };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD3D3D3' }
            };
          });
        }
      });
      
      // Write to file
      const outputPath = path.join(outputDir, `${fileName}.xlsx`);
      await workbook.xlsx.writeFile(outputPath);
      
      return outputPath;
    } catch (error) {
      console.error('Error generating Excel output:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }
}

module.exports = new LabelProcessor();
