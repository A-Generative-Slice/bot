#!/bin/bash

# Railway Deployment Fix Script
# This script commits the Railway configuration files and pushes to GitHub

echo "🚀 Railway Deployment Fix Script"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the bot directory"
    echo "Please run: cd /home/aafrin/bot"
    exit 1
fi

echo "✅ Checking Git status..."
git status

echo ""
echo "📝 Adding Railway configuration files..."
git add railway.json Procfile package.json

echo ""
echo "💾 Committing changes..."
git commit -m "Fix Railway deployment: Add config files and update Node version"

echo ""
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Railway should auto-deploy in 2-3 minutes."
echo ""
echo "Next steps:"
echo "1. Go to Railway Dashboard"
echo "2. Check the deployment logs"
echo "3. Wait for 'Build successful' message"
echo "4. Service should show as 'Active'"
echo ""
echo "If still having issues, check: railway_troubleshooting.md"
