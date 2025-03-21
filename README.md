# CAD Wire Data Converter

A web application for converting CAD wire data (from CSV or PDF) into Excel files compatible with the Brady M611 label printer.

## Features

- Upload CAD wire data in CSV or PDF format
- Process and transform the data into the required structure
- Generate Excel files with the correct format for Brady M611 label printer
- Export data as CSV for compatibility with other systems
- Preview converted data before downloading
- Download the generated Excel and CSV files

## Project Structure

- `/backend` - Node.js/Express server
- `/frontend` - React/TypeScript frontend application

## Setup Instructions

### Backend

1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Start the server: `npm start`

### Frontend

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Technologies Used

- **Backend**: Node.js, Express, Multer (file uploads), XLSX (Excel generation), pdf-parse (PDF processing)
- **Frontend**: React, TypeScript, Axios (API requests), Material-UI (UI components)

## Wire Data Format

The application processes CAD wire data and converts it to the following Brady M611 format:

| Label | Wire Number | From | To | Wire Type | Wire Gauge | Notes |
|-------|-------------|------|----|-----------|-----------|----- |
| Wire  | W001        | Panel A PLC-1 X1 A1 + | Panel B Terminal TB-1 1 + |  |  |  |

This format is optimized for printing wire labels with the Brady M611 printer.
