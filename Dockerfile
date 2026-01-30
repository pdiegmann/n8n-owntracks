FROM oven/bun:1.3.8-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./
COPY packages/backend/package.json ./packages/backend/

# Install dependencies (including build-time tools)
RUN bun install

# Copy backend source
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/tsconfig.json ./packages/backend/

# Build backend
RUN bun run --filter @n8n-owntracks/backend build

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set working directory to backend
WORKDIR /app/packages/backend

# Start server
CMD ["bun", "dist/index.js"]
