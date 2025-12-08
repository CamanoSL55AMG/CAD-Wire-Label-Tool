/**
 * Conversion Context Model
 * 
 * This model implements the Context part of the Model Context Protocol (MCP)
 * for the frontend, managing the conversion process state.
 */

import { WireData } from './wireData.model';

/**
 * Enum for conversion stages
 */
export enum ConversionStage {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * File types supported by the conversion process
 */
export enum FileType {
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
  UNKNOWN = 'unknown'
}

/**
 * Interface for conversion result
 */
export interface ConversionResult {
  downloadUrl: string;
  csvDownloadUrl?: string;
  previewData?: Array<any>;
  totalRows?: number;
  message: string;
}

/**
 * Interface for conversion context state
 */
export interface ConversionContextState {
  stage: ConversionStage;
  file: File | null;
  fileType: FileType;
  error: string | null;
  result: ConversionResult | null;
  wireData: WireData[] | null;
}

/**
 * Create initial conversion context state
 */
export function createInitialConversionState(): ConversionContextState {
  return {
    stage: ConversionStage.IDLE,
    file: null,
    fileType: FileType.UNKNOWN,
    error: null,
    result: null,
    wireData: null
  };
}

/**
 * Determine file type from a File object
 * @param file - File object to analyze
 * @returns The detected file type
 */
export function determineFileType(file: File): FileType {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv' || file.type === 'text/csv') {
    return FileType.CSV;
  } else if (extension === 'pdf' || file.type === 'application/pdf') {
    return FileType.PDF;
  } else if (['xlsx', 'xls', 'xlsm'].includes(extension || '') ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel')) {
    return FileType.EXCEL;
  }

  return FileType.UNKNOWN;
}

/**
 * Validate file for conversion
 * @param file - File to validate
 * @returns Validation result with any error messages
 */
export function validateFileForConversion(file: File | null): { isValid: boolean; error: string | null } {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  const fileType = determineFileType(file);

  if (fileType === FileType.UNKNOWN) {
    return {
      isValid: false,
      error: 'Unsupported file type. Please upload a CSV, Excel, or PDF file.'
    };
  }

  if (file.size > 10 * 1024 * 1024) {  // 10MB limit
    return {
      isValid: false,
      error: 'File size exceeds the maximum limit of 10MB.'
    };
  }

  return { isValid: true, error: null };
}
