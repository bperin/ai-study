#!/bin/bash

echo "🚀 Quick Deploy AI Study"
echo "======================="

# Trigger GitHub Actions deployment
echo "📡 Triggering deployment..."
gh workflow run deploy.yml

# Get the run ID
echo "⏳ Getting run status..."
sleep 2
RUN_ID=$(gh run list --workflow="deploy.yml" --limit=1 --json databaseId --jq '.[0].databaseId')

echo "🔍 Watching deployment (Run ID: $RUN_ID)..."
gh run watch $RUN_ID

echo "✅ Deployment complete!"
