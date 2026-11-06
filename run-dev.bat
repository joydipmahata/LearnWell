@echo off
echo ========================================================
echo Starting LearnWell Platform (Backend + Frontend)
echo PS-06 "ShikshaSetu" Early Intervention Solution
echo ========================================================

start "LearnWell Backend" cmd /k "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --reload"
start "LearnWell Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Backend running at:  http://127.0.0.1:8000
echo Frontend running at: http://localhost:5173
echo.
pause
