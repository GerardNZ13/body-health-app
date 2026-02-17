# On the server (Windows): pull latest code, rebuild image, restart container.
Set-Location $PSScriptRoot\..
git pull
docker compose build --no-cache
docker compose up -d
