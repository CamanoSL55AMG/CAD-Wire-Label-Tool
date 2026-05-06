import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const SAMPLE_FILE_URL = '/test-data/R2b_AotW_NET-AV103_WireList.csv';

const FileFormatHelp: React.FC = () => (
  <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f5f5f5' }} elevation={1}>
    <Typography variant="h6" gutterBottom>
      File Format Help
    </Typography>
    <Typography variant="body1" paragraph>
      Your input file should be a <b>CSV</b> or <b>Excel (XLS/XLSX)</b> file with the following columns:
    </Typography>
    <Box component="ul" sx={{ pl: 3 }}>
      <li>PERMANENT</li>
      <li>FROM_LOC</li>
      <li>FROM_DEV</li>
      <li>FROM_PORT</li>
      <li>FROM_CONN</li>
      <li>TO_LOC</li>
      <li>TO_DEV</li>
      <li>TO_PORT</li>
      <li>TO_CONN</li>
      <li>LABEL</li>
    </Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      For R2b_AotW files, ensure the multi-row header and device/port columns match the CAD team template. City of Bothell files are auto-detected and fixed.
    </Typography>
    <Button
      variant="outlined"
      startIcon={<DownloadIcon />}
      href={SAMPLE_FILE_URL}
      download
      sx={{ mt: 2 }}
    >
      Download Sample File
    </Button>
  </Paper>
);

export default FileFormatHelp;
