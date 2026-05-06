/**
 * Enhanced File Processor
 * Handles multiple file formats including CSV and Excel files (XLS/XLSX)
 */
const path = require('path');
const fs = require('fs');

// Try loading dependencies
let ExcelJS, parse, stringify, xlsx;

try { ExcelJS = require('exceljs'); } catch (e) { }
try { xlsx = require('xlsx'); } catch (e) { }
try {
  parse = require('csv-parse/sync').parse;
  stringify = require('csv-stringify/sync').stringify;
} catch (e) {
  parse = (c) => c.split('\n').filter(l => l.trim()).map(l => l.split(',').map(c => c.trim()));
  stringify = (r) => r.map(x => x.join(',')).join('\n');
}

async function processFile(fileInfo, outputDir) {
  try {
    console.log('Processing file:', fileInfo.originalname);
    const fileExt = path.extname(fileInfo.originalname).toLowerCase();

    let records;
    if (fileExt === '.csv') {
      records = await processCSV(fs.readFileSync(fileInfo.path, 'utf8'));
    } else if (['.xls', '.xlsx'].includes(fileExt)) {
      if (!xlsx) throw new Error('xlsx module missing');
      records = await processExcel(fileInfo.path);
    } else {
      throw new Error('Unsupported format');
    }

    if (!records || records.length === 0) throw new Error('No data found');

    const result = formatOutputData(records);
    return await generateOutputFiles(result, outputDir, fileInfo.originalname);

  } catch (error) {
    console.error('Processing error:', error);
    throw error;
  }
}

async function processCSV(content) {
  return parse(content, { columns: false, skip_empty_lines: true });
}

async function processExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rows || rows.length === 0) throw new Error('Empty sheet');

  // 1. Find Header Row
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const rowStr = rows[i].join(' ').toUpperCase();
    if (rowStr.includes('PERMANENT') && rowStr.includes('LABEL NUM')) {
      headerRowIndex = i;
      break;
    }
  }

  // Fallback
  if (headerRowIndex === -1) {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const rowStr = rows[i].join(' ').toUpperCase();
      if (rowStr.includes('PERMANENT') && rowStr.includes('FROM DEV')) {
        headerRowIndex = i;
        break;
      }
    }
  }

  console.log(`Headers detected at row index: ${headerRowIndex}`);

  const extractedRecords = [];
  const startRow = headerRowIndex === -1 ? 0 : headerRowIndex + 1;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every(c => !c)) continue;

    let record = {};

    if (headerRowIndex !== -1) {
      // Map based on User Description
      record.WIRE_TYPE = row[2] ? row[2].toString().trim() : '';
      record.FROM_DEV = row[5] ? row[5].toString().trim() : '';
      record.FROM_PORT = row[6] ? row[6].toString().trim() : '';
      record.TO_DEV = row[9] ? row[9].toString().trim() : '';
      record.TO_PORT = row[10] ? row[10].toString().trim() : '';
      record.LABEL = row[12] ? row[12].toString().trim() : '';

      if (!record.LABEL && row[1]) {
        record.LABEL = `${row[1]}-${row[2]}-${row[3]}`;
      }
    } else {
      // Headerless logic
      record.WIRE_TYPE = row[1] || '';
      record.FROM_DEV = row[4] || '';
      record.FROM_PORT = row[5] || '';
      record.TO_DEV = row[8] || '';
      record.TO_PORT = row[9] || '';
      const p1 = row[0] || '';
      const p2 = row[1] || '';
      const p3 = row[2] || '';
      if (p1 && p2 && p3) {
        record.LABEL = `${p1}-${p2}-${p3}`;
      }
    }

    if (record.LABEL || record.FROM_DEV || record.TO_DEV) {
      extractedRecords.push(record);
    }
  }

  return extractedRecords;
}

const ABBREVIATIONS = {
  // Common Devices
  'RACK PLATE': 'RP',
  'GRID MON': 'GM',
  'LOBBY': 'LBY',
  'PAGING': 'PG',
  'DRESSING ROOM': 'DR',
  'THEATER': 'THTR',
  'MONITOR': 'MON',
  'PROJECTOR': 'PROJ',
  'WIRELESS': 'WLS',
  'COMMUNICATION': 'COM',
  'ANNOUNCE': 'ANN',
  'COMPUTER': 'PC',
  'LAPTOP': 'LT',
  'INTERFACE': 'INT',
  'CONVERTER': 'CNV',
  'DISTRIBUTION': 'DIST',
  'SWITCH': 'SW',
  'ROUTER': 'RTR',
  'SERVER': 'SVR',
  'PLAYER': 'PLYR',
  'RECORDER': 'REC',

  // Audio
  'MICROPHONE': 'MIC',
  'SPEAKER': 'SPK',
  'SUBWOOFER': 'SUB',
  'AMPLIFIER': 'AMP',
  'EQUALIZER': 'EQ',
  'MIXER': 'MIX',
  'AUDIO': 'AUD',

  // Video
  'VIDEO': 'VID',
  'CAMERA': 'CAM',
  'DISPLAY': 'DSP',
  'SCREEN': 'SCR',
  'TOUCH PANEL': 'TP',

  // Infrastructure
  'CEILING': 'CLG',
  'FLOOR': 'FLR',
  'WALL': 'WL',
  'PLATE': 'PLT',
  'PANEL': 'PNL',
  'BOX': 'BX',
  'MOUNT': 'MNT',
  'CABLE': 'CBL',
  'CONNECTOR': 'CONN',
  'JACK': 'JK',

  // Signal/Ports
  'INPUT': 'IN',
  'OUTPUT': 'OUT',
  'LINE': 'LN',
  'SIGNAL': 'SIG',
  'DIGITAL': 'DIG',
  'ANALOG': 'ANA',
  'PROCESSOR': 'PROC',
  'CONTROLLER': 'CTL',
  'EMBEDDER': 'EMB',
  'RECEIVER': 'RX',
  'TRANSMITTER': 'TX',
  'TRANSCEIVER': 'XCVR',
  'SYSTEM': 'SYS',
  'NETWORK': 'NET',

  // Direction/Position
  'LEFT': 'L',
  'RIGHT': 'R',
  'CENTER': 'C',
  'FRONT': 'F',
  'REAR': 'RR',
  'MIDDLE': 'MID',
  'TOP': 'T',
  'BOTTOM': 'B'
};

function abbreviate(text) {
  if (!text) return '';
  let upper = text.toUpperCase();
  Object.keys(ABBREVIATIONS).forEach(key => {
    // Escape special characters for regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    upper = upper.replace(regex, ABBREVIATIONS[key]);
  });
  return upper;
}

function formatOutputData(records) {
  const wireLabels = records.map(r => {
    const fromInfo = `${r.FROM_DEV} ${r.FROM_PORT}`.trim();
    const toInfo = `${r.TO_DEV} ${r.TO_PORT}`.trim();
    const label = r.LABEL;

    // Create short versions
    const shortFromDev = abbreviate(r.FROM_DEV);
    const shortFromPort = abbreviate(r.FROM_PORT);
    const shortToDev = abbreviate(r.TO_DEV);
    const shortToPort = abbreviate(r.TO_PORT);

    // Combine for formatted label
    const combinedFrom = `${shortFromDev} ${shortFromPort}`.trim();
    const combinedTo = `${shortToDev} ${shortToPort}`.trim();

    return {
      LABEL: label,
      WIRE_TYPE: r.WIRE_TYPE,
      FROM_DEV: shortFromDev,
      FROM_PORT: shortFromPort,
      TO_DEV: shortToDev,
      TO_PORT: shortToPort,
      FORMATTED_LABEL: `${label}   ${combinedFrom} → ${combinedTo}`
    };
  });

  return { wireLabels };
}

async function generateOutputFiles(result, outputDir, originalFilename) {
  const baseFilename = path.basename(originalFilename, path.extname(originalFilename));
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const excelFilename = `${baseFilename}_processed_${timestamp}.xlsx`;
  const excelPath = path.join(outputDir, excelFilename);

  const workbook = new ExcelJS.Workbook();

  // Define Standard Columns for ALL Sheets
  const standardColumns = [
    { header: 'LABEL', key: 'LABEL', width: 25 },
    { header: 'FROM_DEV', key: 'FROM_DEV', width: 25 },
    { header: 'FROM_PORT', key: 'FROM_PORT', width: 15 },
    { header: 'TO_DEV', key: 'TO_DEV', width: 25 },
    { header: 'TO_PORT', key: 'TO_PORT', width: 15 },
    { header: 'FORMATTED_LABEL', key: 'FORMATTED_LABEL', width: 60, style: { alignment: { wrapText: false } } }
  ];

  // 1. Master List Sheet
  const masterSheet = workbook.addWorksheet('Master List');
  masterSheet.columns = standardColumns;
  result.wireLabels.forEach(r => masterSheet.addRow(r));

  // 2. Split Tabs
  if (result.wireLabels.length > 0) {
    console.log(`Splitting tabs by Type`);
    const byType = {};

    result.wireLabels.forEach(l => {
      let type = l.WIRE_TYPE;
      if (!type) {
        const parts = l.LABEL ? l.LABEL.split(/[- ]/) : [];
        if (parts.length >= 2) type = parts[1];
        else type = 'Standard';
      }
      type = type.replace(/[^a-zA-Z0-9]/g, '');
      if (!type) type = 'Standard';

      if (!byType[type]) byType[type] = [];
      byType[type].push(l);
    });

    Object.keys(byType).sort().forEach(type => {
      const sheetName = `Labels ${type}`.substring(0, 31);
      const sheet = workbook.addWorksheet(sheetName);
      sheet.columns = standardColumns; // SAME COLUMNS
      byType[type].forEach(row => sheet.addRow(row));
    });
  }

  await workbook.xlsx.writeFile(excelPath);

  // CSV
  const csvPath = path.join(outputDir, `${baseFilename}_labels_${timestamp}.csv`);
  fs.writeFileSync(csvPath, stringify(result.wireLabels, { header: true }));

  return {
    excelFilePath: `/download/${excelFilename}`,
    csvFilePath: `/download/${path.basename(csvPath)}`,
    totalRows: result.wireLabels.length,
    previewData: result.wireLabels.slice(0, 10)
  };
}

module.exports = { processFile };
