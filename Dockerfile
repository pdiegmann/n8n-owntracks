FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install dependencies (backend only)
RUN npm install --workspace=@n8n-owntracks/backend --omit=dev

# Copy backend source
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/tsconfig.json ./packages/backend/

# Build backend
RUN npm run build --workspace=@n8n-owntracks/backend

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set working directory to backend
WORKDIR /app/packages/backend

# Start server
CMD ["node", "dist/index.js"]
