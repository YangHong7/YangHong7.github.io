#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> 生成静态页面..."
hexo g

echo "==> 提交源文件 (source 分支)..."
git add -A
git commit --allow-empty -m "Update $(date '+%Y-%m-%d %H:%M')"
git push origin source

echo "==> 部署静态页面到 main 分支..."
hexo deploy

echo "==> 完成"
