#!/bin/bash

echo "🚀 Deploying AI Study API to Cloud Run with explicit configuration"

# Deploy with explicit port and container configuration
gcloud run deploy ai-study-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 300 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10

echo "✅ Deployment complete!"
