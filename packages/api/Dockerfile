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

# Build the application
RUN npm run build --workspace=packages/api

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package*.json ./packages/api/
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules

# Expose the API port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod", "--workspace=packages/api"]