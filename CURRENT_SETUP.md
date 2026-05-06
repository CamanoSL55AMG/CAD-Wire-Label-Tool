# CAD Wire Converter - Current Working Setup

## Project Structure
This document identifies the core project files that make up the current working version of the CAD Wire Converter.

### Active Components
- **Backend Server**: Located in `/backend` directory, runs on port 5000
- **Frontend Application**: Located in `/frontend` directory, runs on port 3000

### Starting the Application
To start the application, follow these steps:

1. Start the Backend:
```
cd backend
npm start
```

2. Start the Frontend (in a separate terminal):
```
cd frontend
npm start
```

3. Access the application at: http://localhost:3000

### Notes
- The `/dist` directory contains older packaged versions that are not part of the current development workflow
- Multiple batch files exist in the project for different purposes, but the manual npm start commands above are the most reliable
- Output files are saved to the `/outputs` directory

## Output Format Issue
There is a known issue with the output format that needs to be addressed in a future update.

Last updated: May 7, 2025
