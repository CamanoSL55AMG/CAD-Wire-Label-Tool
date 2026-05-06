import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider } from '@mui/material';

interface FilePreviewProps {
  previewData: Array<any>;
  totalRows?: number;
}

const FilePreview: React.FC<FilePreviewProps> = ({ previewData, totalRows }) => {
  if (!previewData || previewData.length === 0) {
    return null;
  }

  const headers = Object.keys(previewData[0]);

  return (
    <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f8f8f8' }} elevation={1}>
      <Typography variant="subtitle1" gutterBottom>
        File Preview ({previewData.length} of {totalRows || previewData.length} rows)
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {headers.map((header) => (
                <TableCell key={header} sx={{ fontWeight: 'bold', backgroundColor: '#e3e3e3' }}>{header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {previewData.map((row, idx) => (
              <TableRow key={idx}>
                {headers.map((header) => (
                  <TableCell key={header}>{row[header]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default FilePreview;
