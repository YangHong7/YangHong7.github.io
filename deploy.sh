#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [ "$(git branch --show-current)" != "source" ]; then
  echo "错误：请在 source 分支执行部署。" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "错误：工作区存在未提交变更，请先检查并提交。" >&2
  exit 1
fi

echo "==> 生成静态页面..."
npm run clean
npm run build

echo "==> 推送 source 分支..."
git push origin source

echo "==> 部署静态页面到 main 分支..."
npm run deploy

echo "==> 完成"
