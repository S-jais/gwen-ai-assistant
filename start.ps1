# GWEN - One-Click Launcher for Windows
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  GWEN -- Local-First Multi-Agent AI System" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Cyan

$WorkspaceRoot = $PSScriptRoot

# 1. Ensure Ollama service is running
$ollamaProc = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue
if (-not $ollamaProc) {
    $ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    if (Test-Path $ollamaExe) {
        Write-Host "[1/3] Starting Ollama Engine in background..." -ForegroundColor DarkCyan
        Start-Process $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 2
    }
}

# 2. Start Backend in separate window
Write-Host "[2/3] Starting FastAPI Backend (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"

# 3. Start Frontend in separate window
Write-Host "[3/3] Starting Next.js Frontend (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "GWEN is launching!" -ForegroundColor Cyan
Write-Host "Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "Backend API: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "API Docs:    http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host ""
