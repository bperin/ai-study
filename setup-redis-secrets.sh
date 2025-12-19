#!/bin/bash

# Setup Upstash Redis secrets for AI Study
# Run this after creating your Upstash Redis database

set -e

PROJECT_ID="slap-ai-481400"
SERVICE_ACCOUNT="ai-study-uploader@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🔧 Setting up Redis secrets for AI Study..."
echo ""

# Prompt for Upstash credentials
read -p "Enter your Upstash Redis host (e.g., useast1-mutual-shark-12345.upstash.io): " REDIS_HOST
read -p "Enter your Upstash Redis port (usually 6379 or 6380): " REDIS_PORT
read -sp "Enter your Upstash Redis password: " REDIS_PASSWORD
echo ""

# Validate inputs
if [ -z "$REDIS_HOST" ] || [ -z "$REDIS_PORT" ] || [ -z "$REDIS_PASSWORD" ]; then
    echo "❌ Error: All fields are required"
    exit 1
fi

echo ""
echo "📝 Creating secrets in Secret Manager..."

# Create or update REDIS_HOST secret
if gcloud secrets describe ai_study_REDIS_HOST --project=$PROJECT_ID &>/dev/null; then
    echo "Updating existing ai_study_REDIS_HOST secret..."
    echo -n "$REDIS_HOST" | gcloud secrets versions add ai_study_REDIS_HOST --data-file=- --project=$PROJECT_ID
else
    echo "Creating ai_study_REDIS_HOST secret..."
    echo -n "$REDIS_HOST" | gcloud secrets create ai_study_REDIS_HOST --data-file=- --project=$PROJECT_ID
fi

# Create or update REDIS_PORT secret
if gcloud secrets describe ai_study_REDIS_PORT --project=$PROJECT_ID &>/dev/null; then
    echo "Updating existing ai_study_REDIS_PORT secret..."
    echo -n "$REDIS_PORT" | gcloud secrets versions add ai_study_REDIS_PORT --data-file=- --project=$PROJECT_ID
else
    echo "Creating ai_study_REDIS_PORT secret..."
    echo -n "$REDIS_PORT" | gcloud secrets create ai_study_REDIS_PORT --data-file=- --project=$PROJECT_ID
fi

# Create or update REDIS_PASSWORD secret
if gcloud secrets describe ai_study_REDIS_PASSWORD --project=$PROJECT_ID &>/dev/null; then
    echo "Updating existing ai_study_REDIS_PASSWORD secret..."
    echo -n "$REDIS_PASSWORD" | gcloud secrets versions add ai_study_REDIS_PASSWORD --data-file=- --project=$PROJECT_ID
else
    echo "Creating ai_study_REDIS_PASSWORD secret..."
    echo -n "$REDIS_PASSWORD" | gcloud secrets create ai_study_REDIS_PASSWORD --data-file=- --project=$PROJECT_ID
fi

echo ""
echo "🔐 Granting service account access to secrets..."

# Grant access to REDIS_HOST
gcloud secrets add-iam-policy-binding ai_study_REDIS_HOST \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

# Grant access to REDIS_PORT
gcloud secrets add-iam-policy-binding ai_study_REDIS_PORT \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

# Grant access to REDIS_PASSWORD
gcloud secrets add-iam-policy-binding ai_study_REDIS_PASSWORD \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

echo ""
echo "✅ Redis secrets configured successfully!"
echo ""
echo "📋 Summary:"
echo "  - REDIS_HOST: $REDIS_HOST"
echo "  - REDIS_PORT: $REDIS_PORT"
echo "  - REDIS_PASSWORD: ********"
echo ""
echo "🚀 Next steps:"
echo "  1. The deployment workflow is already updated"
echo "  2. Commit and push to trigger deployment:"
echo "     git add ."
echo "     git commit -m 'Add Redis support for background job processing'"
echo "     git push origin main"
echo ""
