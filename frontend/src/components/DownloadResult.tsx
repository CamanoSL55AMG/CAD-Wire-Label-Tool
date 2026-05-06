import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import TableChartIcon from '@mui/icons-material/TableChart';

interface DownloadResultProps {
  downloadUrl: string;
  csvDownloadUrl?: string;
  previewData?: Array<any>;
  totalRows?: number;
  onReset: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps): React.ReactElement {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`download-tabpanel-${index}`}
      aria-labelledby={`download-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const DownloadResult: React.FC<DownloadResultProps> = ({ 
  downloadUrl, 
  csvDownloadUrl, 
  previewData = [], 
  totalRows = 0, 
  onReset 
}): React.ReactElement => {
  const [tabValue, setTabValue] = useState<number>(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', textAlign: 'center', mb: 4 }}>
      <CheckCircleIcon sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
      
      <Typography variant="h5" gutterBottom>
        Conversion Complete!
      </Typography>
      
      <Typography variant="body1" paragraph>
        Your CAD wire data has been successfully converted to a format compatible with the Brady M611 label printer.
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab icon={<DownloadIcon />} label="Download" />
          <Tab icon={<TableChartIcon />} label="Data Preview" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 4,
            backgroundColor: '#f5f5f5',
            borderRadius: 2,
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          <Typography variant="subtitle2" gutterBottom color="text.secondary">
            Your files are ready for download:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
            <Link 
              href={downloadUrl}
              download
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none'
              }}
            >
              <Button
                variant="contained"
                color="primary"
                startIcon={<DownloadIcon />}
                sx={{ width: 250 }}
              >
                Download Excel File (.xlsx)
              </Button>
            </Link>
            
            {csvDownloadUrl && (
              <Link 
                href={csvDownloadUrl}
                download
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none'
                }}
              >
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<FileOpenIcon />}
                  sx={{ width: 250 }}
                >
                  Download CSV File (.csv)
                </Button>
              </Link>
            )}
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Excel file can be directly imported into the Brady M611 label printer software.
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary">
              CSV file can be opened with any spreadsheet application or text editor.
            </Typography>
          </Box>
        </Paper>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 4,
            backgroundColor: '#f5f5f5',
            borderRadius: 2,
            maxWidth: 800,
            mx: 'auto'
          }}
        >
          <Typography variant="subtitle2" gutterBottom color="text.secondary">
            Data Preview: {previewData.length > 0 ? `Showing ${previewData.length} of ${totalRows} rows` : 'No data available'}
          </Typography>
          
          {previewData && previewData.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400, mt: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(previewData[0]).map((key) => (
                      <TableCell key={key}>{key}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value: any, colIndex) => (
                        <TableCell key={colIndex}>{value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No preview data available.
            </Typography>
          )}
        </Paper>
      </TabPanel>
      
      <Stack direction="row" justifyContent="center">
        <Button
          variant="outlined"
          startIcon={<ReplayIcon />}
          onClick={onReset}
        >
          Convert Another File
        </Button>
      </Stack>
    </Box>
  );
};

export default DownloadResult;
