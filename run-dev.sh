#!/usr/bin/env bash
echo "========================================================"
echo "Starting LearnWell Platform (Backend + Frontend)"
echo "PS-06 ShikshaSetu Early Intervention Solution"
echo "========================================================"

python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --reload &
BACKEND_PID=$!

cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend running at:  http://127.0.0.1:8000"
echo "Frontend running at: http://localhost:5173"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
