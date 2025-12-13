FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy web package files
COPY packages/web/package*.json ./packages/web/

# Install dependencies fresh
RUN npm install

# Copy source code
COPY . .

# Build the application
# Note: Next.js needs NEXT_PUBLIC_API_URL at build time if it's used in static pages
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build --workspace=packages/web

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/packages/web/.next ./packages/web/.next
COPY --from=builder /app/packages/web/package.json ./packages/web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create public directory first, then copy contents if any exist
RUN mkdir -p ./packages/web/public
COPY --from=builder /app/packages/web/public/ ./packages/web/public/

# Cloud Run will set PORT automatically - don't override it
# ENV PORT=3000
EXPOSE $PORT

# Start the application
CMD ["npm", "start", "--workspace=packages/web"]