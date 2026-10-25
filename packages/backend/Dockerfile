# Backend Dockerfile for Valve IDE
FROM node:22-alpine

WORKDIR /app

# Install dependencies for building and runtime
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ../shared/

# Install all dependencies (including shared)
RUN npm install --workspaces --include-workspace-root

# Copy source code
COPY . .

# Make startup script executable
RUN chmod +x packages/backend/start.sh

# Expose port
EXPOSE 3001

# Start server
CMD ["sh", "packages/backend/start.sh"]