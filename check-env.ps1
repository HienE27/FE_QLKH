# Script to check if .env files are being committed
# Run this before committing: .\check-env.ps1

Write-Host "Checking for .env files in git staging area..." -ForegroundColor Yellow

$stagedFiles = git diff --cached --name-only
$envFiles = $stagedFiles | Where-Object { $_ -match '\.env' }

if ($envFiles) {
    Write-Host "`n❌ ERROR: Found .env files in staging area!" -ForegroundColor Red
    Write-Host "The following files contain sensitive information:" -ForegroundColor Red
    $envFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "`nPlease remove them from staging:" -ForegroundColor Yellow
    Write-Host "  git reset HEAD <file>" -ForegroundColor Cyan
    Write-Host "`nOr unstage all .env files:" -ForegroundColor Yellow
    Write-Host "  git reset HEAD .env*" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "✅ No .env files found in staging area. Safe to commit!" -ForegroundColor Green
    exit 0
}

