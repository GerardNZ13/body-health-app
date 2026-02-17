#!/usr/bin/env bash
# On the server: pull latest code, rebuild image, restart container.
set -e
cd "$(dirname "$0")/.."
git pull
docker compose build --no-cache
docker compose up -d
