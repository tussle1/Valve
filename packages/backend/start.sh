#!/bin/sh
# Production startup script for Valve Backend
# Runs with tsx to bypass TypeScript compilation issues

set -e

echo "Starting Valve Backend..."

# Generate secrets if not provided
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET=$(openssl rand -hex 32)
  echo "Generated JWT_SECRET"
fi

if [ -z "$ENCRYPTION_KEY" ]; then
  export ENCRYPTION_KEY=$(openssl rand -hex 32)
  echo "Generated ENCRYPTION_KEY"
fi

# Ensure data directory exists
mkdir -p /app/data

# Start the server with tsx
exec npx tsx src/index.ts