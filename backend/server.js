const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { processFile } = require('./processors/fileProcessor');

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create downloads directory for generated Excel files
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend to access backend
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Serve static files from the downloads directory
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Set up file upload storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter function to allow only CSV and PDF files
const fileFilter = (req, file, cb) => {
  const filetypes = /csv|pdf/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only CSV and PDF files are allowed!'));
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// API endpoint for file upload and processing
app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();
    
    // Process the file
    const result = await processFile(filePath, fileType);
    
    // Get the filenames from the paths
    const excelFileName = path.basename(result.excelFilePath);
    const csvFileName = path.basename(result.csvFilePath);
    
    // Return the download URLs with the full server address for development
    res.status(200).json({
      message: 'File processed successfully',
      downloadUrl: `http://localhost:${PORT}/downloads/${excelFileName}`,
      csvDownloadUrl: `http://localhost:${PORT}/downloads/${csvFileName}`,
      previewData: result.previewData,
      totalRows: result.totalRows
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

// Add a route to list all available downloads
app.get('/api/downloads', (req, res) => {
  try {
    const files = fs.readdirSync(downloadsDir);
    const downloadUrls = files.map(file => ({
      filename: file,
      url: `http://localhost:${PORT}/downloads/${file}`
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
