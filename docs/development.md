# GWEN Developer Guide

## Local Setup & Development

### 1. Virtual Environment & Dependencies
```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\pip.exe install -r backend\requirements.txt
```

### 2. Frontend Dependencies
```powershell
cd frontend
npm install
```

### 3. Running Dev Servers
**Backend:**
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

**Frontend:**
```powershell
cd frontend
npm run dev
```

### 4. Running Test Suite
```powershell
.\.venv\Scripts\pytest.exe -v
```
