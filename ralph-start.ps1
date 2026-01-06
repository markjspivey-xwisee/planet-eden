# Ralph Loop Starter for Planet Eden
# Usage: .\ralph-start.ps1 [max-iterations]

param(
    [int]$MaxIterations = 50,
    [switch]$Reset
)

$ProjectRoot = $PSScriptRoot
$StateFile = Join-Path $ProjectRoot ".claude\ralph-state.json"
$LogFile = Join-Path $ProjectRoot ".claude\ralph-log.txt"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "     RALPH LOOP - Planet Eden Development     " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Reset state if requested
if ($Reset) {
    if (Test-Path $StateFile) {
        Remove-Item $StateFile -Force
        Write-Host "[Ralph] State reset" -ForegroundColor Yellow
    }
    if (Test-Path $LogFile) {
        Remove-Item $LogFile -Force
        Write-Host "[Ralph] Log cleared" -ForegroundColor Yellow
    }
}

# Show current task status
$FixPlan = Join-Path $ProjectRoot "@fix_plan.md"
if (Test-Path $FixPlan) {
    $content = Get-Content $FixPlan -Raw
    $completed = ([regex]::Matches($content, '\[x\]')).Count
    $incomplete = ([regex]::Matches($content, '\[ \]')).Count
    $inProgress = ([regex]::Matches($content, '\[~\]')).Count
    $total = $completed + $incomplete + $inProgress

    Write-Host "Current Task Status:" -ForegroundColor Green
    Write-Host "  Completed:   $completed" -ForegroundColor Gray
    Write-Host "  In Progress: $inProgress" -ForegroundColor Yellow
    Write-Host "  Remaining:   $incomplete" -ForegroundColor Red
    Write-Host "  Total:       $total" -ForegroundColor White
    Write-Host ""
}

Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Max Iterations: $MaxIterations"
Write-Host "  Prompt File:    PROMPT.md"
Write-Host "  Fix Plan:       @fix_plan.md"
Write-Host ""

Write-Host "To start the Ralph loop, run Claude Code with:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  claude --prompt `"$(Get-Content (Join-Path $ProjectRoot 'PROMPT.md') -Raw -ErrorAction SilentlyContinue | Select-Object -First 500)`"" -ForegroundColor White
Write-Host ""
Write-Host "Or simply run: claude" -ForegroundColor Yellow
Write-Host "Then tell Claude: 'Read PROMPT.md and start the Ralph loop'"
Write-Host ""

# Monitor option
Write-Host "To monitor progress, watch the log:" -ForegroundColor Green
Write-Host "  Get-Content .claude\ralph-log.txt -Wait -Tail 20" -ForegroundColor White
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
