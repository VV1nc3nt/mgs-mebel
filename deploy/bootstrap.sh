#!/usr/bin/env bash
# One-time (idempotent) setup of a clean Ubuntu 24.04 server for the staging stack.
# Run as root:  bash bootstrap.sh
# Optional:     DEPLOY_PUBKEY='ssh-ed25519 AAAA... ci' bash bootstrap.sh   (key for GitHub Actions)
# Swap is not touched.
set -euo pipefail

DEPLOY_USER=deploy
APP_DIR=/opt/mgs

[[ $EUID -eq 0 ]] || { echo "ERROR: run as root" >&2; exit 1; }
# shellcheck source=/dev/null
. /etc/os-release
[[ "$ID" == ubuntu ]] || { echo "ERROR: Ubuntu expected, got $ID" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
APT_OPTS=(-y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

log() { printf '\n==> %s\n' "$*"; }

has_keys() { [[ -s "$1/.ssh/authorized_keys" ]] && grep -Eq '(ssh-(ed25519|rsa)|ecdsa-sha2-|sk-(ssh|ecdsa)-)' "$1/.ssh/authorized_keys"; }

log "System update"
apt-get update
apt-get "${APT_OPTS[@]}" upgrade
apt-get "${APT_OPTS[@]}" install ca-certificates curl gnupg ufw fail2ban python3-systemd unattended-upgrades cron

log "Docker (official repository)"
install -m 0755 -d /etc/apt/keyrings
if [[ ! -s /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi
cat > /etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable
EOF
apt-get update
apt-get "${APT_OPTS[@]}" install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

log "User $DEPLOY_USER"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
fi
passwd -l "$DEPLOY_USER" >/dev/null   # no password: key-only login
usermod -aG docker "$DEPLOY_USER"
DEPLOY_HOME=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$DEPLOY_HOME/.ssh"
touch "$DEPLOY_HOME/.ssh/authorized_keys"
# Give deploy the admin keys of root if it has none yet.
if ! has_keys "$DEPLOY_HOME" && has_keys /root; then
  cat /root/.ssh/authorized_keys >> "$DEPLOY_HOME/.ssh/authorized_keys"
fi
if [[ -n "${DEPLOY_PUBKEY:-}" ]] && ! grep -qxF "$DEPLOY_PUBKEY" "$DEPLOY_HOME/.ssh/authorized_keys"; then
  printf '%s\n' "$DEPLOY_PUBKEY" >> "$DEPLOY_HOME/.ssh/authorized_keys"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.ssh/authorized_keys"
chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"

log "SSH hardening"
if ! has_keys /root && ! has_keys "$DEPLOY_HOME"; then
  echo "ERROR: neither root nor $DEPLOY_USER has authorized_keys." >&2
  echo "Add your public key first (ssh-copy-id root@<server>), then re-run. Password login left unchanged." >&2
  exit 1
fi
# 00- prefix: sshd uses the first value it sees, and 50-cloud-init.conf may enable passwords.
cat > /etc/ssh/sshd_config.d/00-mgs.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
EOF
mkdir -p /run/sshd
sshd -t
systemctl reload-or-restart ssh

log "Firewall (ufw)"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

log "fail2ban"
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable fail2ban
systemctl restart fail2ban

log "Unattended upgrades"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable --now unattended-upgrades

log "App directory $APP_DIR"
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR" "$APP_DIR/backups" "$APP_DIR/caddy"
if [[ -f "$APP_DIR/.env" ]]; then
  chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi

log "Backup cron (daily 03:30)"
cat > /etc/cron.d/mgs-backup <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 3 * * * $DEPLOY_USER cd $APP_DIR && [ -x ./backup.sh ] && ./backup.sh >> $APP_DIR/backups/backup.log 2>&1
EOF
chmod 644 /etc/cron.d/mgs-backup

log "Done"
docker --version
docker compose version
echo "Next steps: docs/deploy.md → «Первичная настройка сервера»."
