# Add all changes, commit with message, push to origin main.
# Usage: .\scripts\push-updates.ps1
#        .\scripts\push-updates.ps1 "Your commit message"
#        npm run push -- "Your commit message"

$message = $args[0]
if (-not $message) { $message = "Updates" }

Set-Location $PSScriptRoot\..
git add .
git commit -m "$message"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Nothing to commit (or commit failed). Exiting."
    exit $LASTEXITCODE
}
git push origin main
