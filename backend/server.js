const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
// Use the enhanced processor that supports multiple file formats
const { processFile } = require('./processors/enhanced-processor');

// Import routes
const debugRoutes = require('./routes/debug');

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create downloads directory for generated files
const downloadsDir = process.env.DOWNLOADS_DIR || path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Create outputs directory for generated files
const outputsDir = path.join(__dirname, '../outputs');
if (!fs.existsSync(outputsDir)) {
  fs.mkdirSync(outputsDir, { recursive: true });
  console.log(`Created outputs directory: ${outputsDir}`);
}

// Middleware - Enhanced CORS support
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow frontend access from both localhost and IP
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Additional OPTIONS handling for preflight requests
app.options('*', cors());
app.use(express.json());

// Serve static files from the downloads directory
app.use('/download', express.static(path.join(__dirname, 'downloads')));

// Electron-specific endpoints
app.get('/api/electron/file', (req, res) => {
  const filePath = req.query.path;
  
  if (!filePath) {
    return res.status(400).json({ error: 'No file path provided' });
  }
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Read the file
    const fileContent = fs.readFileSync(filePath);
    
    // Get file extension to determine content type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream'; // Default content type
    
    if (ext === '.csv') {
      contentType = 'text/csv';
    } else if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.xlsx' || ext === '.xls') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    
    // Set content type and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`); 
    return res.send(fileContent);
  } catch (error) {
    console.error('Error reading file:', error);
    return res.status(500).json({ error: 'Error reading file' });
  }
});

// Endpoint to save a file from a URL to the local filesystem (for Electron)
app.get('/api/electron/save-file', async (req, res) => {
  const { url, path: saveFilePath } = req.query;
  
  if (!url || !saveFilePath) {
    return res.status(400).json({ error: 'URL and save path are required' });
  }
  
  try {
    // If URL is a local file path (starts with /download/), read from local filesystem
    if (url.startsWith('/download/')) {
      const localFilePath = path.join(__dirname, url);
      if (!fs.existsSync(localFilePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Copy the file to the save path
      fs.copyFileSync(localFilePath, saveFilePath);
      return res.json({ success: true, message: 'File saved successfully' });
    } else {
      // For external URLs, download the file and save it
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to download file: ${response.statusText}` });
      }
      
      const fileBuffer = await response.buffer();
      fs.writeFileSync(saveFilePath, fileBuffer);
      return res.json({ success: true, message: 'File saved successfully' });
    }
  } catch (error) {
    console.error('Error saving file:', error);
    return res.status(500).json({ error: 'Error saving file: ' + error.message });
  }
});

// Set up file upload storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter function to allow CSV, Excel, and PDF files
const fileFilter = (req, file, cb) => {
  const filetypes = /csv|pdf|excel|spreadsheetml|xls|xlsx/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype || extname) {
    return cb(null, true);
  }
  cb(new Error('Only CSV, Excel (XLS/XLSX), and PDF files are allowed!'));
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// API endpoint for file upload and processing
app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    console.log('Received file:', req.file);
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'File upload failed or file path missing.' });
    }

    // Process the file with our enhanced processor
    const result = await processFile(req.file, downloadsDir);
    
    // Return the response with download URLs and preview data
    res.status(200).json({
      message: 'File processed successfully',
      downloadUrl: `http://localhost:${PORT}${result.excelFilePath}`,
      csvDownloadUrl: `http://localhost:${PORT}${result.csvFilePath}`,
      wireLabelsCSVUrl: result.wireLabelsCSVPath ? `http://localhost:${PORT}${result.wireLabelsCSVPath}` : null,
      previewData: result.previewData || [],
      totalRows: result.totalRows || 0
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: error.message || 'Error processing file' });
  }
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Debug routes
app.use('/api/debug', debugRoutes);

// Add a route to list all available downloads
app.get('/api/downloads', (req, res) => {
  try {
    const files = fs.readdirSync(downloadsDir);
    const downloadUrls = files.map(file => ({
      filename: file,
      url: `http://localhost:${PORT}/download/${file}`
    }));
    res.status(200).json({ files: downloadUrls });
  } catch (error) {
    console.error('Error listing downloads:', error);
    res.status(500).json({ error: error.message || 'Error listing downloads' });
  }
});

// Add an endpoint to get a preview of a specific file
app.get('/api/preview/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(downloadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Determine if it's Excel or CSV
    const extension = path.extname(filename).toLowerCase();
    let data = [];
    let totalRows = 0;
    
    if (extension === '.xlsx') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = xlsx.utils.sheet_to_json(worksheet);
      totalRows = data.length;
      data = data.slice(0, 100); // Return up to 100 rows
    } else if (extension === '.csv') {
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',');
      
      // Parse CSV content
      for (let i = 1; i < Math.min(lines.length, 101); i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      }
      totalRows = lines.length - 1;
    }
    
    res.status(200).json({
      data,
      totalRows
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: error.message || 'Error generating preview' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Cleanup function for temporary files (called when the server is stopped)
process.on('SIGINT', () => {
  console.log('Cleaning up temporary files...');
  // Clean up logic here (e.g., delete old files in uploads directory)
  process.exit();
});
