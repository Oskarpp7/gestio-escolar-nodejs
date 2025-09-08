#!/usr/bin/env bash
# scripts/trigger-full-test.sh
# Dispara la Full Test Suite tocant el trigger i empenyent a main

set -euo pipefail

echo "🧪 Activant Full Test Suite per trigger..."
mkdir -p .ci
echo "# Trigger activat: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> .ci/full-test.trigger

git add .ci/full-test.trigger
git commit -m "ci(trigger): activar Full Test Suite - $(date '+%Y-%m-%d %H:%M')"
git push origin main

echo "✅ Full Test Suite activada. Revisa Actions:"
echo "   https://github.com/Oskarpp7/gestio-escolar-nodejs/actions"
