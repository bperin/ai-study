#!/bin/bash

# Script to create Google Secret Manager secrets from environment variables
# Usage: ./create-secrets.sh

PROJECT_ID="pro-pulsar-274402"
PREFIX="ai_study"

echo "🔐 Creating secrets in Google Secret Manager with prefix: ${PREFIX}"

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable not set"
    exit 1
fi

if [ -z "$GCP_SA_KEY" ]; then
    echo "❌ GCP_SA_KEY environment variable not set"
    exit 1
fi

if [ -z "$GCP_BUCKET_NAME" ]; then
    echo "❌ GCP_BUCKET_NAME environment variable not set"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET environment variable not set"
    exit 1
fi

if [ -z "$GOOGLE_API_KEY" ]; then
    echo "❌ GOOGLE_API_KEY environment variable not set"
    exit 1
fi

# Create DATABASE_URL secret
echo "Creating ${PREFIX}_DATABASE_URL..."
echo "$DATABASE_URL" | gcloud secrets create ${PREFIX}_DATABASE_URL \
    --data-file=- \
    --project=$PROJECT_ID

# Create GCP_SA_KEY secret
echo "Creating ${PREFIX}_GCP_SA_KEY..."
echo "$GCP_SA_KEY" | gcloud secrets create ${PREFIX}_GCP_SA_KEY \
    --data-file=- \
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
