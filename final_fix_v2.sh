#!/bin/bash
set -e

echo "--- Fixing Audit Logs Schema ---"
docker exec apex-postgres psql -U apex -d apex -c "ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(50);"

echo "--- Fixing Traefik Permissions ---"
mkdir -p ~/apex-v2/infra/docker/traefik/dynamic
chmod 777 ~/apex-v2/infra/docker/traefik/dynamic

echo "--- Verification ---"
docker exec apex-postgres psql -U apex -d apex -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'status';"
ls -ld ~/apex-v2/infra/docker/traefik/dynamic
