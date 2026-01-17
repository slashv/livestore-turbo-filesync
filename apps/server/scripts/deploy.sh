#!/bin/bash
set -e

# Deploy script for server with automatic secret setup
# Usage: ./scripts/deploy.sh [preview|prod]

ENV=${1:-prod}

if [ "$ENV" != "preview" ] && [ "$ENV" != "prod" ]; then
  echo "Usage: $0 [preview|prod]"
  exit 1
fi

# Determine wrangler environment flag
if [ "$ENV" = "preview" ]; then
  WRANGLER_ENV="--env dev"
  WORKER_NAME="livestore-app-server-dev"
  DB_NAME="livestore-auth-dev"
else
  WRANGLER_ENV=""
  WORKER_NAME="livestore-app-server"
  DB_NAME="livestore-auth-prod"
fi

echo "Deploying to $ENV environment ($WORKER_NAME)..."

# Run database migrations first
echo "Running database migrations..."
npx wrangler d1 migrations apply $DB_NAME --remote $WRANGLER_ENV 2>&1 || echo "Note: Migrations may already be applied."

# Deploy the worker
echo "Deploying worker..."
npx wrangler deploy $WRANGLER_ENV

# Check if BETTER_AUTH_SECRET is set as a secret
echo "Checking secrets..."
SECRET_LIST=$(npx wrangler secret list $WRANGLER_ENV 2>/dev/null || echo "")
SECRET_EXISTS=$(echo "$SECRET_LIST" | grep -c "BETTER_AUTH_SECRET" || true)

if [ "$SECRET_EXISTS" = "0" ]; then
  echo "BETTER_AUTH_SECRET not found. Generating and setting..."
  
  # Generate a secure random secret
  SECRET=$(openssl rand -base64 32)
  
  # Set the secret using wrangler
  echo "$SECRET" | npx wrangler secret put BETTER_AUTH_SECRET $WRANGLER_ENV
  
  echo "Secret set successfully."
  echo "Note: The worker will use the new secret on the next request."
else
  echo "BETTER_AUTH_SECRET already configured."
fi

echo ""
echo "Deployment complete!"
echo "URL: https://$WORKER_NAME.contact-106.workers.dev"
