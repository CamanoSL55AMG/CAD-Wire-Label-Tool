import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { 
  ConversionContextState, 
  ConversionStage, 
  FileType,
  ConversionResult,
  createInitialConversionState,
  determineFileType,
  validateFileForConversion
} from '../models/conversionContext.model';

// Define the API base URL for development vs production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Use relative paths in production
  : 'http://localhost:5000'; // Use absolute path with port in development

// Define the context actions
type ConversionAction = 
  | { type: 'SET_FILE'; payload: File | null }
  | { type: 'CLEAR_FILE' }
  | { type: 'START_UPLOAD' }
  | { type: 'START_PROCESSING' }
  | { type: 'COMPLETE_CONVERSION'; payload: ConversionResult }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };

// Define the context interface
interface ConversionContextType {
  state: ConversionContextState;
  setFile: (file: File | null) => void;
  clearFile: () => void;
  startConversion: () => Promise<void>;
  reset: () => void;
}

// Create the context
const ConversionContext = createContext<ConversionContextType | undefined>(undefined);

// Reducer function to manage state transitions
function conversionReducer(state: ConversionContextState, action: ConversionAction): ConversionContextState {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        file: action.payload,
        fileType: action.payload ? determineFileType(action.payload) : FileType.UNKNOWN,
        error: null
      };
    
    case 'CLEAR_FILE':
      return {
        ...state,
        file: null,
        fileType: FileType.UNKNOWN,
        error: null
      };
    
    case 'START_UPLOAD':
      return {
        ...state,
        stage: ConversionStage.UPLOADING,
        error: null,
        result: null
      };
    
    case 'START_PROCESSING':
      return {
        ...state,
        stage: ConversionStage.PROCESSING
      };
    
    case 'COMPLETE_CONVERSION':
      return {
        ...state,
        stage: ConversionStage.COMPLETED,
        result: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        stage: ConversionStage.ERROR,
        error: action.payload
      };
    
    case 'RESET':
      return createInitialConversionState();
    
    default:
      return state;
  }
}

// Provider component
export const ConversionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(conversionReducer, createInitialConversionState());
  
  // Set the file to convert
  const setFile: ConversionContextType['setFile'] = (file: File | null) => {
    dispatch({ type: 'SET_FILE', payload: file });
  };
  
  // Clear the selected file
  const clearFile: ConversionContextType['clearFile'] = () => {
    dispatch({ type: 'CLEAR_FILE' });
  };
  
  // Start the conversion process
  const startConversion: ConversionContextType['startConversion'] = async () => {
    if (!state.file) {
      dispatch({ type: 'SET_ERROR', payload: 'No file selected' });
      return;
    }
    
    // Validate the file
    const validation = validateFileForConversion(state.file);
    if (!validation.isValid) {
      dispatch({ type: 'SET_ERROR', payload: validation.error || 'Invalid file' });
      return;
    }
    
    try {
      // Update state to uploading
      dispatch({ type: 'START_UPLOAD' });
      
      // Create form data for the file upload
      const formData = new FormData();
      formData.append('file', state.file);
      
      // Start processing
      dispatch({ type: 'START_PROCESSING' });
      
      // Send the file to the backend API
      const response = await fetch(`${API_BASE_URL}/api/convert`, {
        method: 'POST',
        body: formData,
      });
      
      // Handle non-successful response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error processing file');
      }
      
      // Parse successful response
      const data = await response.json();
      
      // Complete the conversion
      dispatch({ 
        type: 'COMPLETE_CONVERSION', 
        payload: {
          downloadUrl: data.downloadUrl,
          message: data.message
        }
      });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };
  
  // Reset the conversion process
  const reset: ConversionContextType['reset'] = () => {
    dispatch({ type: 'RESET' });
  };
  
  // Context value
  const contextValue: ConversionContextType = {
    state,
    setFile,
    clearFile,
    startConversion,
    reset
  };
  
  return (
    <ConversionContext.Provider value={contextValue}>
      {children}
    </ConversionContext.Provider>
  );
};

// Custom hook to use the conversion context
export const useConversion = (): ConversionContextType => {
  const context = useContext(ConversionContext);
  if (context === undefined) {
    throw new Error('useConversion must be used within a ConversionProvider');
  }
  return context;
};
