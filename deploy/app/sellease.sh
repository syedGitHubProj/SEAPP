#!/bin/sh
# Server helper for one SellEase stack. Run it from the stack's folder, for example /opt/sellease/abc-staging.
#   ./sellease.sh pull                    download the deployed version's images
#   ./sellease.sh up                      start or update to the deployed version (no database changes)
#   ./sellease.sh migrate                 apply database changes (run by the manual "Migrate database" workflow)
#   ./sellease.sh create-admin USER "NAME"  create an Admin; you type the password, it is not shown
#   ./sellease.sh load-demo               demo designs, factories and customers (staging only)
#   ./sellease.sh wipe-staging            delete all data on staging and start again (staging only)
#   ./sellease.sh status | logs           what is running / recent API messages
set -eu
cd "$(dirname "$0")"
[ -f .env ] || { echo "No .env here. Copy .env.example to .env and fill it in first."; exit 1; }
IMAGE_TAG=$(cat .image-tag 2>/dev/null || echo latest)
export IMAGE_TAG

case "${1:-}" in
  pull)          docker compose pull api web ;;
  up)            docker compose up -d --remove-orphans ;;
  migrate)       docker compose run --rm -T api migrate ;;
  create-admin)  shift; docker compose run --rm api create-admin "$@" ;;
  load-demo)     docker compose run --rm -T api load-demo ;;
  wipe-staging)
    docker compose stop api
    docker compose run --rm -T api wipe-staging
    docker compose up -d api ;;
  status)        docker compose ps ;;
  logs)          docker compose logs --tail 100 api ;;
  *)             sed -n '2,10p' "$0"; exit 1 ;;
esac
