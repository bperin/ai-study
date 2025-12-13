#!/bin/bash

echo "🚀 Deploying AI Study App to Vercel"
echo "===================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📦 Step 1: Deploy Backend API"
echo "------------------------------"
cd packages/api
vercel --prod
API_URL=$(vercel ls | grep ai-study-api | head -1 | awk '{print $2}')
echo "✅ API deployed to: $API_URL"
echo ""

echo "🌐 Step 2: Deploy Frontend"
echo "------------------------------"
cd ../web
vercel --prod
WEB_URL=$(vercel ls | grep ai-study-web | head -1 | awk '{print $2}')
echo "✅ Frontend deployed to: $WEB_URL"
echo ""

echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "API URL: $API_URL"
echo "Web URL: $WEB_URL"
echo ""
echo "⚠️  Next Steps:"
echo "1. Set environment variables in Vercel dashboard (including FRONTEND_URL)"
echo "2. Update NEXT_PUBLIC_API_URL in frontend env vars"
echo "4. Redeploy both services"
echo ""
echo "See docs/VERCEL_DEPLOYMENT.md for detailed instructions"
