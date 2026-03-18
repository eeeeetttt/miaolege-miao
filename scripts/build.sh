#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Building the project..."
# 使用 --webpack 标志强制使用 webpack 构建（next-pwa 需要 webpack）
npx next build --webpack

echo "Build completed successfully!"
