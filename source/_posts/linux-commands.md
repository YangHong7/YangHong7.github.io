---
title: Linux 常用命令备忘录
date: 2026-07-03 14:00:00
categories:
  - Linux
tags:
  - Linux
  - 命令行
  - 笔记
---
## 文件操作

```bash
# 查看文件结构
tree -L 2

# 查找文件
find /path -name "*.log"
grep -r "keyword" /path/

# 查看文件大小
du -sh *
df -h
```

## 权限管理

```bash
chmod 755 script.sh    # rwxr-xr-x
chown user:group file  # 修改所有者
```

## 进程管理

```bash
ps aux                 # 查看所有进程
top                    # 实时监控
kill -9 PID            # 强制终止
nohup command &        # 后台运行
```

## 网络

```bash
netstat -tlnp          # 查看端口占用
curl -I url            # 查看 HTTP 头
ping -c 4 host         # 网络连通测试
```

## 实用技巧

- `Ctrl+R` — 搜索历史命令
- `!!` — 执行上一条命令
- `!$` — 上一条命令的最后一个参数
- `alias ll='ls -alF'` — 设置别名
