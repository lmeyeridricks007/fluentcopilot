#!/usr/bin/env bash
# Deploy FluentCopilot Azure Functions backend to dev.
# Requires: az login, func (Azure Functions Core Tools v4), Node 20+
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FUNCTION_APP="${AZ_FUNCTION_APP:-func-language-tutor-dev}"
API_BASE="${API_BASE_URL:-https://func-language-tutor-dev-cqd6fkgdb2hmcnah.westeurope-01.azurewebsites.net}"

echo "==> Building backend (TypeScript)"
cd "$ROOT/backend"
npm install
npm run build

echo "==> Pruning devDependencies for production bundle"
npm prune --production

echo "==> Bundling Linux ffmpeg (must run AFTER prune — prune drops cross-platform optional deps)"
npm install @ffmpeg-installer/linux-x64@4.1.0 --force --os=linux --cpu=x64 --no-save --omit=dev

echo "==> Publishing to Azure Function App: $FUNCTION_APP"
func azure functionapp publish "$FUNCTION_APP"

echo "==> Restoring devDependencies for local work"
npm install

echo "==> Health check"
curl -fsS "$API_BASE/api/health" | head -c 500
echo ""
echo "Done. API base: $API_BASE"
