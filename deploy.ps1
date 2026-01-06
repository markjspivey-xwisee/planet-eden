# Planet Eden - Automatic GitHub Pages Deployment
# Run this with: powershell .\deploy.ps1

Write-Host "🌍 Planet Eden - GitHub Pages Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Create a GitHub repo called 'planet-eden'"
Write-Host "  2. Push your simulation"
Write-Host "  3. Enable GitHub Pages"
Write-Host ""
Write-Host "First, you need a GitHub Personal Access Token with 'repo' permissions" -ForegroundColor Yellow
Write-Host "Get one here: https://github.com/settings/tokens/new" -ForegroundColor Green
Write-Host "(Check the 'repo' checkbox, then click 'Generate token' at the bottom)" -ForegroundColor Gray
Write-Host ""

$GITHUB_TOKEN = Read-Host "Enter your GitHub Personal Access Token"
Write-Host ""

# Create the repository
Write-Host "📦 Creating GitHub repository..." -ForegroundColor Yellow
$body = @{
    name = "planet-eden"
    description = "God Mode AI Life Simulation - Interactive ecosystem with divine powers"
    private = $false
} | ConvertTo-Json

$headers = @{
    Authorization = "token $GITHUB_TOKEN"
    Accept = "application/vnd.github+json"
}

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "✅ Repository created!" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "⚠️  Repository already exists, continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Copy to index.html
Write-Host "📄 Preparing files..." -ForegroundColor Yellow
Copy-Item planet-eden-complete.html index.html -Force

# Git setup
Write-Host "🔧 Setting up git..." -ForegroundColor Yellow
git add index.html
git commit -m "🌍 Initial commit: Planet Eden God Mode Simulation"
git branch -M main

# Check if remote exists
$remoteExists = git remote | Select-String -Pattern "origin"
if ($remoteExists) {
    git remote remove origin
}

git remote add origin https://markjspivey-xwisee:$GITHUB_TOKEN@github.com/markjspivey-xwisee/planet-eden.git
git push -u origin main

# Enable GitHub Pages
Write-Host "🚀 Enabling GitHub Pages..." -ForegroundColor Yellow
$pagesBody = @{
    source = @{
        branch = "main"
        path = "/"
    }
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/markjspivey-xwisee/planet-eden/pages" -Method Post -Headers $headers -Body $pagesBody -ContentType "application/json"
} catch {
    # Pages might already be enabled
}

Write-Host ""
Write-Host "✨ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your simulation will be available at:" -ForegroundColor Cyan
Write-Host "   https://markjspivey-xwisee.github.io/planet-eden" -ForegroundColor White
Write-Host ""
Write-Host "⏱️  Note: GitHub Pages takes 1-2 minutes to build the first time" -ForegroundColor Gray
Write-Host "   Refresh the page if you see a 404 initially" -ForegroundColor Gray
Write-Host ""
Write-Host "🎮 Share this link with your friends!" -ForegroundColor Green
Write-Host ""
