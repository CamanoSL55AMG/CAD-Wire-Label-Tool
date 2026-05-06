# CAD Wire Converter (OLD - DO NOT USE)

> ⚠️ **WARNING:** This project is deprecated and replaced by `cad-label-converter`. **DO NOT USE** this project for new work. Use `cad-label-converter` instead. This project is retained temporarily for reference only.
 (OLD - DO NOT USE)

> ⚠️ **WARNING:** This project is deprecated and replaced by `cad-label-converter`. **DO NOT USE** this project for new work. Use `cad-label-converter` instead. This project is retained temporarily for reference only.

A web application for converting CAD wire data (from CSV, Excel, or PDF) into standardized formats compatible with the Brady M611 label printer.

## Features

- Upload CAD wire data in CSV, Excel (XLS/XLSX), or PDF format
- Support for multiple data formats including:
  - Standard CAD wire data
  - R2b_AotW format from the CAD team
  - SnoCoTV format
  - City of Bothell files (with automatic COB prefix handling)
- Process and transform the data into the required structure
- Generate Excel files with the correct format for Brady M611 label printer
- Export data as CSV for compatibility with other systems
- Preview converted data before downloading
- Download the generated Excel and CSV files

## Project Structure

- `/backend` - Node.js/Express server with multi-format processing
- `/frontend` - React/TypeScript frontend application
- `/app.js` - Integrated application launcher
- `/dist` - Distribution and packaged versions

## Setup Instructions

### Quick Setup (All Components)

Run the setup script to install all dependencies and create required directories:
```
setup-project.bat
```

### Development Environment

Start both backend and frontend development servers:
```
npm run start:dev
```

Or run the development servers in separate terminals:

### Backend

1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Start the server: `npm start`

### Frontend

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Web Application

The web application is accessible at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Technologies Used

- **Backend**: Node.js, Express, Multer (file uploads), ExcelJS (Excel generation/reading)
- **Frontend**: React, TypeScript, Axios (API requests), Material-UI (UI components)
- **File Processing**: CSV-parse/stringify, ExcelJS for robust Excel file handling

## Supported Data Formats

### Standard Wire Data Format
Output format has these columns:
- PERMANENT: Unique identifier for the wire
- FROM_LOC/TO_LOC: Location information
- FROM_DEV/TO_DEV: Device information
- FROM_PORT/TO_PORT: Port information
- FROM_CONN/TO_CONN: Connection type information
- LABEL: Identifier for wire labels

### R2b_AotW Format
Supports the CAD team's standard format with multi-row headers and specific column structure. The system can automatically detect this format and process the PERMANENT ID components (e.g., N, AN, 401 → N-AN-401).

### City of Bothell Files
Automatically detects City of Bothell files by searching for "bothell" or "cit" in the filename and applies special processing:
- Replaces all "MSI-" prefixes with "COB-" in both PERMANENT IDs and LABEL fields
- Removes all {UNKNWN} values from all fields
