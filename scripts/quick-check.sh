#!/bin/bash
# 快速验证脚本 - 开发过程中快速检查
# 用法: ./scripts/quick-check.sh

set -e

cd "$(dirname "$0")/.." || exit 1

echo "⚡ Quick Check..."

# 1. TypeScript
echo "📝 TypeScript..."
pnpm ts-check --noEmit > /dev/null 2>&1 && echo "✅ OK" || echo "❌ FAILED"

# 2. Lint
echo "🔧 ESLint..."
pnpm lint --quiet > /dev/null 2>&1 && echo "✅ OK" || echo "❌ FAILED"

# 3. Server
echo "🔌 Server..."
curl -s --max-time 2 http://localhost:5000 > /dev/null 2>&1 && echo "✅ OK" || echo "⚠️  NOT RUNNING"

# 4. API
echo "🌐 API..."
curl -s http://localhost:5000/api/cron/ai-active 2>/dev/null | grep -q "aiUsers" && echo "✅ OK" || echo "⚠️  CHECK NEEDED"

echo "Done!"
