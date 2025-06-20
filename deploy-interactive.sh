#!/bin/bash

echo "🚀 LifeOS Railway Deployment Helper"
echo "====================================="
echo ""

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged into Railway. Please run: railway login"
    exit 1
fi

echo "✅ Railway CLI ready"
echo "✅ Logged in as: $(railway whoami)"
echo ""

echo "📋 Step 1: Creating Railway project..."
echo "Please follow the prompts to create a new project."
echo "When asked for project name, use: lifeos"
echo ""
echo "Press Enter to continue..."
read

# Initialize Railway project (this will be interactive)
railway init

echo ""
echo "📋 Step 2: Setting environment variables..."

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=4000
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set CORS_ORIGIN="*"

echo "✅ Environment variables set"
echo ""

echo "📋 Step 3: Deploying application..."
echo "This will upload and deploy your LifeOS application to Railway."
echo ""

# Deploy the application
railway up

echo ""
echo "🎉 Deployment initiated!"
echo ""
echo "📊 To check status:"
echo "   railway status"
echo ""
echo "🌐 To open your app:"
echo "   railway open"
echo ""
echo "📝 To view logs:"
echo "   railway logs"
echo ""
echo "🔧 To add PostgreSQL database:"
echo "   1. Go to your Railway dashboard"
echo "   2. Click 'New Service'"
echo "   3. Select 'Database' -> 'PostgreSQL'"
echo "   4. Railway will auto-connect it"
echo ""
echo "✅ LifeOS deployment complete!"