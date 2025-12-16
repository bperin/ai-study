#!/bin/bash

# Script to create Google Secret Manager secrets from configuration files
# Usage: ./create-secrets.sh

PROJECT_ID="pro-pulsar-274402"
PREFIX="ai_study"

echo "🔐 Creating secrets in Google Secret Manager with prefix: ${PREFIX}"

# Determine service account key path (prefer google-services.json)
KEY_FILE="google-services.json"
LEGACY_KEY_FILE="google_services.json"

# Check if required files exist
if [ ! -f "packages/api/.env" ]; then
    echo "❌ packages/api/.env file not found"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    if [ -f "$LEGACY_KEY_FILE" ]; then
        echo "⚠️  google-services.json not found, using legacy google_services.json"
        KEY_FILE="$LEGACY_KEY_FILE"
    elsee
        echo "❌ google-services.json file not found"
        exit 1
    fi
fi

# Extract values from .env file
DATABASE_URL=$(grep "^DATABASE_URL=" packages/api/.env | cut -d'=' -f2- | tr -d '"')
GCP_BUCKET_NAME=$(grep "^GCP_BUCKET_NAME=" packages/api/.env | cut -d'=' -f2- | tr -d '"')
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

if [ -z "$GCP_BUCKET_NAME" ]; then
    echo "❌ GCP_BUCKET_NAME not found in .env file"
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
echo "$DATABASE_URL" | gcloud secrets create ${PREFIX}_DATABASE_URL \
    --data-file=- \
    --project=$PROJECT_ID

# Create GCP_SA_KEY secret from key file
echo "Creating ${PREFIX}_GCP_SA_KEY from ${KEY_FILE}..."
gcloud secrets create ${PREFIX}_GCP_SA_KEY \
    --data-file="$KEY_FILE" \
    --project=$PROJECT_ID

# Create GCP_BUCKET_NAME secret
echo "Creating ${PREFIX}_GCP_BUCKET_NAME..."
echo "$GCP_BUCKET_NAME" | gcloud secrets create ${PREFIX}_GCP_BUCKET_NAME \
    --data-file=- \
    --project=$PROJECT_ID

# Create JWT_SECRET secret
echo "Creating ${PREFIX}_JWT_SECRET..."
echo "$JWT_SECRET" | gcloud secrets create ${PREFIX}_JWT_SECRET \
    --data-file=- \
    --project=$PROJECT_ID

# Create GOOGLE_API_KEY secret
echo "Creating ${PREFIX}_GOOGLE_API_KEY..."
echo "$GOOGLE_API_KEY" | gcloud secrets create ${PREFIX}_GOOGLE_API_KEY \
    --data-file=- \
    --project=$PROJECT_ID

echo "✅ All secrets created successfully!"
echo ""
echo "📋 Created secrets:"
echo "  - ${PREFIX}_DATABASE_URL"
echo "  - ${PREFIX}_GCP_SA_KEY"
echo "  - ${PREFIX}_GCP_BUCKET_NAME"
echo "  - ${PREFIX}_JWT_SECRET"
echo "  - ${PREFIX}_GOOGLE_API_KEY"
echo ""
echo "🔧 Update your deployment to use:"
echo "  --set-secrets=DATABASE_URL=${PREFIX}_DATABASE_URL:latest"
echo "  --set-secrets=GCP_SA_KEY=${PREFIX}_GCP_SA_KEY:latest"
echo "  --set-secrets=GCP_BUCKET_NAME=${PREFIX}_GCP_BUCKET_NAME:latest"
echo "  --set-secrets=JWT_SECRET=${PREFIX}_JWT_SECRET:latest"
echo "  --set-secrets=GOOGLE_API_KEY=${PREFIX}_GOOGLE_API_KEY:latest"
