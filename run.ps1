# Run the SpendNest Flask server with the Python environment that contains Flask
$pythonExe = "$env:LOCALAPPDATA\Microsoft\WindowsApps\python.exe"

if (-not (Test-Path $pythonExe)) {
    $pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SpendNest Revenue Intelligence Inbox" -ForegroundColor Cyan
Write-Host "  Starting Flask + Supabase Server..." -ForegroundColor Cyan
Write-Host "  Using Python: $pythonExe" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Open your browser at: http://localhost:5000" -ForegroundColor Green
Write-Host " Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

& $pythonExe backend/app.py
