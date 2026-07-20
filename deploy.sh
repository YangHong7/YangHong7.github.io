#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> 生成静态页面..."
hexo g

echo "==> 提交源文件 (source 分支)..."
git add -A
git commit --allow-empty -m "Update $(date '+%Y-%m-%d %H:%M')"
git push origin source

echo "==> 部署 (main 分支)..."
cd public
git add -A
git commit --allow-empty -m "Site updated: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main

echo "==> 完成"
