#!/bin/bash

# --- 0. לנקות אינסטנסים קיימים ---
echo "Stopping any running frontend or backend..."
pkill -f "uvicorn" 2>/dev/null
pkill -f "next dev" 2>/dev/null
for port in 3000 3001 3002 3003 3004; do
    lsof -ti:$port | xargs kill -9 2>/dev/null
done
echo "Ports cleared."

# --- 1. להריץ database + backend ב-Docker ---
echo "Starting backend and database in Docker..."
cd "/Users/erezarnon/Documents/future app/future-app"
docker compose up -d db backend

# --- 2. להריץ frontend על Mac ---
echo "Starting frontend on localhost:3000..."
cd frontend
npm install --quiet
nohup npm run dev -- --port 3000 > /tmp/future-frontend.log 2>&1 &

# --- 3. המתן כמה שניות ובדוק מצב ---
sleep 5
echo "Checking frontend status..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
echo "Done. Open http://localhost:3000 in your browser."
