import React, { useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Alert, 
  Paper, 
  Stack,
  IconButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import { FileType } from '../models/conversionContext.model';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
  selectedFile: File | null;
  error: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileChange, 
  onSubmit, 
  selectedFile, 
  error 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection from input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileChange(files[0]);
    }
  };

  // Handle file selection via drag and drop
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      onFileChange(files[0]);
    }
  };

  // Prevent default drag behaviors
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Handle click on the upload area to select a file
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Get a file icon based on file type
  const getFileIcon = (file: File) => {
    const fileType = file.type;
    if (fileType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return <PictureAsPdfIcon sx={{ fontSize: 48, color: '#f44336' }} />;
    } else if (fileType === 'text/csv' || fileType.includes('spreadsheet') || file.name.toLowerCase().endsWith('.csv')) {
      return <TableChartIcon sx={{ fontSize: 48, color: '#4caf50' }} />;
    } else {
      return <CloudUploadIcon sx={{ fontSize: 48, color: '#2196f3' }} />;
    }
  };

  // Check if file type is supported
  const getFileTypeText = (file: File): string => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (fileExt === 'csv' || file.type === 'text/csv') {
      return 'CSV File';
    } else if (fileExt === 'pdf' || file.type === 'application/pdf') {
      return 'PDF File';
    } else {
      return 'Unknown File Type';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Error message if any */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* File upload area */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          border: '2px dashed #ccc',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: '#f9f9f9',
          minHeight: 200,
          '&:hover': {
            borderColor: '#2196f3',
            backgroundColor: '#f0f8ff'
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleUploadClick}
      >
        <input
          type="file"
          accept=".csv,.pdf"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        {selectedFile ? (
          // Display file information if a file is selected
          <Box sx={{ textAlign: 'center' }}>
            {getFileIcon(selectedFile)}
            <Typography variant="h6" component="div" sx={{ mt: 2 }}>
              {selectedFile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getFileTypeText(selectedFile)} • {(selectedFile.size / 1024).toFixed(2)} KB
            </Typography>
            <IconButton 
              color="error" 
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                onFileChange(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ) : (
          // Display upload instructions if no file is selected
          <Box sx={{ textAlign: 'center' }}>
            <CloudUploadIcon sx={{ fontSize: 64, color: '#757575', mb: 2 }} />
            <Typography variant="h6" component="div">
              Drag and drop your CAD wire data file here
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Supported formats: CSV, PDF
            </Typography>
            <Button
              variant="contained"
              component="span"
              startIcon={<CloudUploadIcon />}
              sx={{ mt: 2 }}
            >
              Select File
            </Button>
          </Box>
        )}
      </Paper>

      {/* Submit button */}
      <Stack direction="row" justifyContent="center">
        <Button 
          variant="contained" 
          onClick={onSubmit} 
          disabled={!selectedFile}
          size="large"
          sx={{ minWidth: 200 }}
        >
          Convert File
        </Button>
      </Stack>
    </Box>
  );
};

export default FileUpload;
