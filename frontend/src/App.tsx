import React from 'react';
import { 
  Box, 
  Container, 
  CssBaseline, 
  Typography, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel,
  ThemeProvider, 
  createTheme
} from '@mui/material';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import DownloadResult from './components/DownloadResult';
import { ConversionProvider, useConversion } from './contexts/ConversionContext';
import { ConversionStage } from './models/conversionContext.model';
import './App.css';

// Define the steps for the conversion process
const steps = ['Upload CAD File', 'Processing', 'Download Excel'];

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

// Main App component - now just serves as a provider wrapper
function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ConversionProvider>
        <ConversionApp />
      </ConversionProvider>
    </ThemeProvider>
  );
}

// Inner component that uses the conversion context
function ConversionApp(): React.ReactElement {
  const { state, setFile, startConversion, reset } = useConversion();
  
  // Map conversion stage to stepper index
  const getActiveStep = (): number => {
    switch (state.stage) {
      case ConversionStage.IDLE:
        return 0;
      case ConversionStage.UPLOADING:
      case ConversionStage.PROCESSING:
        return 1;
      case ConversionStage.COMPLETED:
        return 2;
      case ConversionStage.ERROR:
        return 0; // Go back to upload step on error
      default:
        return 0;
    }
  };

  // Render the current step content
  const getStepContent = (step: number): React.ReactElement | string => {
    switch (step) {
      case 0:
        return <FileUpload 
                 onFileChange={setFile} 
                 onSubmit={startConversion} 
                 selectedFile={state.file} 
                 error={state.error} 
               />;
      case 1:
        return <ProcessingStatus />;
      case 2:
        return <DownloadResult 
                 downloadUrl={state.result?.downloadUrl || ''} 
                 onReset={reset} 
               />;
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ mb: 4 }}>
      <Paper sx={{ my: { xs: 3, md: 6 }, p: { xs: 2, md: 3 } }} elevation={3}>
        <Typography component="h1" variant="h4" align="center" gutterBottom>
          CAD Wire Data Converter
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
          Convert CAD wire data from CSV or PDF to Excel format for Brady M611 label printer
        </Typography>
        
        <Stepper activeStep={getActiveStep()} sx={{ pt: 3, pb: 5 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 2 }}>
          {getStepContent(getActiveStep())}
        </Box>
      </Paper>
    </Container>
  );
}

export default App;
