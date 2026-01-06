#!/bin/bash
# Automatic GitHub Pages Deployment Script for Planet Eden

echo "🌍 Planet Eden - GitHub Pages Deployment"
echo "=========================================="
echo ""
echo "This script will:"
echo "  1. Create a GitHub repo called 'planet-eden'"
echo "  2. Push your simulation"
echo "  3. Enable GitHub Pages"
echo ""
echo "First, you need a GitHub Personal Access Token with 'repo' permissions"
echo "Get one here: https://github.com/settings/tokens/new"
echo ""
read -p "Enter your GitHub Personal Access Token: " GITHUB_TOKEN
echo ""

# Create the repository
echo "📦 Creating GitHub repository..."
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/user/repos \
  -d '{"name":"planet-eden","description":"God Mode AI Life Simulation","private":false}')

if echo "$RESPONSE" | grep -q "Bad credentials"; then
  echo "❌ Error: Invalid token. Please check your token and try again."
  exit 1
fi

echo "✅ Repository created!"

# Copy to index.html
cp planet-eden-complete.html index.html

# Git setup
git add index.html
git commit -m "🌍 Initial commit: Planet Eden God Mode Simulation"
git branch -M main
git remote add origin https://github.com/markjspivey-xwisee/planet-eden.git
git push -u origin main

# Enable GitHub Pages
echo "🚀 Enabling GitHub Pages..."
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/markjspivey-xwisee/planet-eden/pages \
  -d '{"source":{"branch":"main","path":"/"}}'

echo ""
echo "✨ Deployment complete!"
echo ""
echo "🌐 Your simulation will be available at:"
echo "   https://markjspivey-xwisee.github.io/planet-eden"
echo ""
echo "⏱️  Note: GitHub Pages takes 1-2 minutes to build the first time"
echo "   Refresh the page if you see a 404 initially"
echo ""
