#!/bin/bash

# LifeOS Railway Deployment Script

echo "🚀 Starting LifeOS deployment to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Logging into Railway..."
railway login

# Link to existing project or create new one
echo "🔗 Linking to Railway project..."
railway link

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set CORS_ORIGIN="*"
railway variables set PORT=4000

# Deploy the application
echo "🚀 Deploying to Railway..."
railway up

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
railway run pnpm --filter @lifeos/database db:push

# Seed the database
echo "🌱 Seeding database with initial data..."
railway run pnpm --filter @lifeos/database db:seed

echo "✅ Deployment complete!"
echo "🌐 Your LifeOS API is now live on Railway!"

# Get the deployment URL
railway status