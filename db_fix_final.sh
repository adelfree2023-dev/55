#!/bin/bash
set -e

echo "--- Creating onboarding_blueprints table ---"
docker exec apex-postgres psql -U apex -d apex -c "CREATE TABLE IF NOT EXISTS public.onboarding_blueprints (id TEXT PRIMARY KEY, name TEXT NOT NULL, config JSONB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"

echo "--- Seeding standard blueprint ---"
docker exec apex-postgres psql -U apex -d apex -c "INSERT INTO public.onboarding_blueprints (id, name, config) VALUES ('standard', 'Standard E-commerce', '{\"products\": [{\"name\": \"Sample Product\", \"price\": 100}], \"pages\": [{\"title\": \"Home\", \"slug\": \"home\"}, {\"title\": \"About\", \"slug\": \"about\"}], \"settings\": {\"theme\": \"light\"}}') ON CONFLICT (id) DO NOTHING;"

echo "--- Verifying ---"
docker exec apex-postgres psql -U apex -d apex -c "SELECT id, name FROM public.onboarding_blueprints;"
