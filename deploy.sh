#!/bin/bash
# Auto-déploiement FILA2PRO sur TrueNAS.
# Vérifie GitHub ; si une nouvelle version existe, pull + rebuild + redémarre.
# Lancé périodiquement par une tâche planifiée (cron) TrueNAS.

set -e
REPO_DIR="/mnt/HOMELAB/fila2pro/web"
LOCK="/tmp/fila2pro-deploy.lock"

# Empêche deux déploiements simultanés
if [ -e "$LOCK" ]; then
  echo "$(date '+%F %T') - déploiement déjà en cours, on saute."
  exit 0
fi
trap 'rm -f "$LOCK"' EXIT
touch "$LOCK"

cd "$REPO_DIR" || { echo "Dossier introuvable: $REPO_DIR"; exit 1; }

git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "$(date '+%F %T') - déjà à jour ($LOCAL)."
  exit 0
fi

echo "$(date '+%F %T') - nouvelle version détectée → déploiement"
git pull origin main --quiet
docker compose build fila2pro
docker compose up -d
echo "$(date '+%F %T') - déploiement terminé ($(git rev-parse --short HEAD))."
