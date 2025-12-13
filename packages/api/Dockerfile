# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY packages/api/package*.json ./packages/api/
COPY packages/web/package*.json ./packages/web/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=packages/api/prisma/schema.prisma

# Build the application with memory limit
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build --workspace=packages/api

# Stage 2: Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Cloud Run containers must listen on the port defined by the PORT environment variable
ENV PORT 8080
EXPOSE $PORT

# Copy only necessary files from the builder stage
COPY --from=builder /app/packages/api/package*.json ./
COPY --from=builder /app/packages/api/node_modules ./node_modules
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/prisma ./prisma

# Start the application directly with node
CMD [ "node", "dist/main.js" ]