# CAD Wire Converter - IMPORTANT STARTUP INSTRUCTIONS

## ⚠️ WARNING: DO NOT USE OTHER BATCH FILES ⚠️

Many of the `.bat` files in this project are from older versions and **should not be used** to start the application.

## ✅ CORRECT WAY TO START THE APPLICATION:

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

## 📋 Project Organization:

- Main components:
  - `/backend` - Backend API server (port 5000)
  - `/frontend` - React frontend application (port 3000)
  - `/outputs` - Generated output files

- Legacy components (DO NOT USE):
  - `/dist` directory - Contains older packaged versions
  - All `.bat` files in the root directory - Various startup scripts for older versions

## 📄 For more details, see CURRENT_SETUP.md

Last updated: May 7, 2025
