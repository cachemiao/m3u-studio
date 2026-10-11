#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p data/database data/logo data/backup
if [ "$(id -u)" = 0 ]; then
  chown -R 10001:10001 data
else
  echo '请先运行 sudo chown -R 10001:10001 data，再启动容器。'
fi
printf '执行 docker compose up -d --build，然后打开 http://设备IP:18080 在网页设置管理账号。\n'
