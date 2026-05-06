import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProcessingStatus: React.FC = (): React.ReactElement => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 4
      }}
    >
      <CircularProgress size={60} thickness={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>
        Processing Your File
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
        Please wait while we convert your CAD wire data...
      </Typography>
    </Box>
  );
};

export default ProcessingStatus;
