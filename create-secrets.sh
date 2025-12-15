#!/bin/bash

# Script to create Google Secret Manager secrets from configuration files
# Usage: ./create-secrets.sh

PROJECT_ID="slap-ai-481400"
PREFIX="ai_study"

echo "🔐 Creating secrets in Google Secret Manager with prefix: ${PREFIX}"

# Check if required files exist
if [ ! -f "packages/api/.env" ]; then
    echo "❌ packages/api/.env file not found"
    exit 1
fi

# Extract values from .env file
DATABASE_URL=$(grep "^DATABASE_URL=" packages/api/.env | cut -d'=' -f2- | tr -d '"')
GCP_BUCKET_NAME="slap-ai-public-storage"
JWT_SECRET=$(grep "^JWT_SECRET=" packages/api/.env | cut -d'=' -f2- | tr -d '"')

# Try to get GOOGLE_API_KEY from environment (fallback to GEMINI_API_KEY if not in .env)
GOOGLE_API_KEY=$(grep "^GOOGLE_API_KEY=" packages/api/.env | cut -d'=' -f2- | tr -d '"')
if [ -z "$GOOGLE_API_KEY" ]; then
    GOOGLE_API_KEY="$GEMINI_API_KEY"
fi

# Validate extracted values
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in .env file"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET not found in .env file"
    exit 1
fi

if [ -z "$GOOGLE_API_KEY" ]; then
    echo "❌ GOOGLE_API_KEY not found in .env file"
    exit 1
fi

# Create DATABASE_URL secret
echo "Creating ${PREFIX}_DATABASE_URL..."
echo -n "$DATABASE_URL" | gcloud secrets create ${PREFIX}_DATABASE_URL \
    --data-file=- \
    --project=$PROJECT_ID

# Create GCP_BUCKET_NAME secret
echo "Creating ${PREFIX}_GCP_BUCKET_NAME..."
echo -n "$GCP_BUCKET_NAME" | gcloud secrets create ${PREFIX}_GCP_BUCKET_NAME \
    --data-file=- \
    --project=$PROJECT_ID

# Create JWT_SECRET secret
echo "Creating ${PREFIX}_JWT_SECRET..."
echo -n "$JWT_SECRET" | gcloud secrets create ${PREFIX}_JWT_SECRET \
    --data-file=- \
    --project=$PROJECT_ID

# Create GOOGLE_API_KEY secret
echo "Creating ${PREFIX}_GOOGLE_API_KEY..."
echo -n "$GOOGLE_API_KEY" | gcloud secrets create ${PREFIX}_GOOGLE_API_KEY \
    --data-file=- \
    --project=$PROJECT_ID

echo "✅ All secrets created successfully!"
echo ""
echo "📋 Created secrets:"
echo "  - ${PREFIX}_DATABASE_URL"
echo "  - ${PREFIX}_GCP_BUCKET_NAME"
echo "  - ${PREFIX}_JWT_SECRET"
echo "  - ${PREFIX}_GOOGLE_API_KEY"
echo ""
echo "🔧 Update your deployment to use:"
echo "  --set-secrets=DATABASE_URL=${PREFIX}_DATABASE_URL:latest"
echo "  --set-secrets=GCP_BUCKET_NAME=${PREFIX}_GCP_BUCKET_NAME:latest"
echo "  --set-secrets=JWT_SECRET=${PREFIX}_JWT_SECRET:latest"
echo "  --set-secrets=GOOGLE_API_KEY=${PREFIX}_GOOGLE_API_KEY:latest"
