#!/bin/sh

# ScholarForge Health Check Script

# Check backend health
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "Backend is healthy"
    exit 0
else
    echo "Backend is unhealthy"
    exit 1
fi
