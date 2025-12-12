#!/bin/bash

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "Please login to Vercel first:"
    vercel login
fi

# Deploy
echo "Deploying to Vercel..."
vercel deploy