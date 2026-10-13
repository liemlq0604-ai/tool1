#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run with sudo bash.'; exit 1; }
readonly PACKAGE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
readonly ARCHIVE="$PACKAGE_DIR/tool1-release.tar.gz"
[[ -f "$ARCHIVE" ]] || { echo "Missing $ARCHIVE"; exit 1; }
command -v node >/dev/null
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<22 || (a===22&&b<16))process.exit(1)' || { echo 'Node.js >=22.16 required'; exit 1; }
exec 9>/run/lock/tool1-deploy.lock
flock -n 9 || { echo 'Tool1 deployment already running'; exit 75; }
stage=$(mktemp -d /tmp/tool1-install.XXXXXX)
trap 'rm -rf -- "$stage"' EXIT
tar -xzf "$ARCHIVE" -C "$stage"
[[ -f "$stage/src/server.ts" && -f "$stage/package.json" && -f "$stage/RELEASE" ]]
release=$(cat "$stage/RELEASE")
[[ "$release" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid release ID'; exit 1; }
node --experimental-strip-types --test "$stage"/tests/*.test.ts
if ! id tool1 >/dev/null 2>&1; then useradd --system --home /var/lib/tool1 --create-home --shell /usr/sbin/nologin tool1; fi
install -d -m 755 /opt/tool1 /opt/tool1/releases
target="/opt/tool1/releases/$release"
if [[ ! -d "$target" ]]; then
  install -d -m 755 "$target"
  cp -a "$stage/." "$target/"
  chown -R root:root "$target"
fi
# cp -a preserves the staging directory's 0700 mode. The service account
# must be able to traverse the release and read its source, including reruns.
find "$target" -type d -exec chmod 755 {} +
find "$target" -type f -exec chmod 644 {} +
runuser -u tool1 -- test -r "$target/src/server.ts"
runuser -u tool1 -- bash -c 'cd "$1" && node --experimental-strip-types --test tests/*.test.ts' _ "$target"
if ss -ltnH '( sport = :4173 )' | grep -q . && ! systemctl is-active --quiet tool1.service; then
  echo 'Port 4173 is occupied by another app; aborting.'; exit 1
fi
previous=$(readlink -f /opt/tool1/current || true)
ln -sfn "$target" /opt/tool1/current.next
mv -Tf /opt/tool1/current.next /opt/tool1/current
cat > /etc/systemd/system/tool1.service <<EOF
[Unit]
Description=Tool1 Parts Card Printer
After=network.target
[Service]
Type=simple
User=tool1
Group=tool1
WorkingDirectory=/opt/tool1/current
Environment=HOST=0.0.0.0
Environment=PORT=4173
ExecStart=$(command -v node) --experimental-strip-types /opt/tool1/current/src/server.ts
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
MemoryMax=512M
TasksMax=64
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable tool1.service
systemctl restart tool1.service
for attempt in {1..30}; do
  if curl -fsS --max-time 3 http://127.0.0.1:4173/api/health | grep -q 'tool1-parts-card'; then
    echo "TOOL1 DEPLOY PASS: $release; open http://<Ubuntu-IP>:4173"; exit 0
  fi
  sleep 1
done
echo 'Health failed; restoring the previous code release if available.'
if [[ -n "$previous" && -d "$previous" ]]; then
  ln -sfn "$previous" /opt/tool1/current.next
  mv -Tf /opt/tool1/current.next /opt/tool1/current
  systemctl restart tool1.service
fi
journalctl -u tool1.service -n 30 --no-pager
exit 1
