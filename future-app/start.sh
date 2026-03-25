#!/bin/bash
set -e

echo ""
echo "  ██████╗ ██╗   ██╗████████╗██╗   ██╗██████╗ ███████╗"
echo "  ██╔════╝██║   ██║╚══██╔══╝██║   ██║██╔══██╗██╔════╝"
echo "  █████╗  ██║   ██║   ██║   ██║   ██║██████╔╝█████╗  "
echo "  ██╔══╝  ██║   ██║   ██║   ██║   ██║██╔══██╗██╔══╝  "
echo "  ██║     ╚██████╔╝   ██║   ╚██████╔╝██║  ██║███████╗"
echo "  ╚═╝      ╚═════╝    ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝"
echo ""
echo "  Financial Planning Platform"
echo ""

# Check for .env
if [ ! -f "backend/.env" ]; then
  echo "Creating backend/.env from example..."
  cp backend/.env.example backend/.env
  echo ""
  echo "  ⚠  Add your ANTHROPIC_API_KEY to backend/.env for AI features"
  echo "     (optional — rule-based analysis works without it)"
  echo ""
fi

# Export env vars for docker-compose
if [ -f "backend/.env" ]; then
  export $(grep -v '^#' backend/.env | xargs) 2>/dev/null || true
fi

echo "Starting services with Docker Compose..."
docker compose up -d --build

echo ""
echo "Waiting for services to start..."
sleep 5

echo "Seeding demo data..."
curl -s -X POST http://localhost:8000/seed > /dev/null 2>&1 || echo "  (seed will run on first visit)"

echo ""
echo "  ✓ Backend API:  http://localhost:8000"
echo "  ✓ Frontend:     http://localhost:3000"
echo "  ✓ API Docs:     http://localhost:8000/docs"
echo ""
echo "  → Open http://localhost:3000 to launch FUTURE"
echo ""
