#!/usr/bin/env bash
# deploy/scripts/deploy.sh
# Reproducible deployment script for an AWS EC2 Linux instance.
# Run as the 'ubuntu' (or ec2-user) system user — not as root.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/yourorg/vehiclevault.git}"
APP_DIR="${APP_DIR:-/opt/vehiclevault}"
COMPOSE_FILE="${APP_DIR}/compose.yaml"

echo "=== VehicleVault EC2 Deployment ==="

# 1. Update packages and install Docker
if ! command -v docker &>/dev/null; then
  echo "[1/6] Installing Docker..."
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg lsb-release
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker "$USER"
  echo "[1/6] Docker installed. You may need to log out and back in for group changes."
else
  echo "[1/6] Docker already installed."
fi

# 2. Clone or pull repository
if [ -d "$APP_DIR/.git" ]; then
  echo "[2/6] Pulling latest changes..."
  git -C "$APP_DIR" pull --ff-only
else
  echo "[2/6] Cloning repository to $APP_DIR..."
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER":"$USER" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

# 3. Create .env if it does not exist
if [ ! -f "${APP_DIR}/.env" ]; then
  echo "[3/6] Creating .env from .env.example..."
  cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  echo "IMPORTANT: Edit ${APP_DIR}/.env and set strong credentials before continuing."
  exit 1
else
  echo "[3/6] .env already exists — skipping."
fi

# 4. Start the application
echo "[4/6] Starting Docker Compose stack..."
cd "$APP_DIR"
docker compose pull mongodb  # Pull latest MongoDB image
docker compose up --build -d
echo "[4/6] Stack started."

# 5. Wait for health checks
echo "[5/6] Waiting for services to become healthy..."
sleep 20
docker compose ps

# 6. Verify
echo "[6/6] Health check:"
curl -s http://localhost/api/health | python3 -m json.tool || true

echo ""
echo "=== Deployment Complete ==="
echo "Application is running at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "Next steps:"
echo "  1. Point your domain's A record to the public IP above."
echo "  2. Install Certbot: sudo apt-get install -y certbot"
echo "  3. Issue certificate: sudo certbot certonly --standalone -d yourdomain.com"
echo "  4. Copy deploy/nginx/vehiclevault.conf to /etc/nginx/sites-available/"
echo "  5. ln -s /etc/nginx/sites-available/vehiclevault.conf /etc/nginx/sites-enabled/"
echo "  6. sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "Volume backup commands:"
echo "  docker run --rm -v vehiclevault_vehicle_documents:/src -v /backup:/dest alpine tar czf /dest/uploads-\$(date +%Y%m%d).tar.gz -C /src ."
echo "  docker run --rm -v vehiclevault_mongodb_data:/src -v /backup:/dest alpine tar czf /dest/mongodb-\$(date +%Y%m%d).tar.gz -C /src ."
