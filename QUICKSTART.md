# Quick Start Guide

This guide will help you get up and running with n8n-owntracks in minutes.

## Prerequisites

- Docker + Docker Compose (recommended for production)
- Bun 1.3+ installed (development/builds; can also be used for production runtime if desired)
- OwnTracks mobile app (iOS or Android)
- n8n instance (optional, for using the trigger nodes)

## Step 1: Install and Build (Local Development)

```bash
git clone https://github.com/pdiegmann/n8n-owntracks.git
cd n8n-owntracks
bun install
bun run build
```

## Step 2: Configure the Backend

Create a `config.yaml` file in `packages/backend/`:

```yaml
server:
  host: 0.0.0.0
  port: 3000
  cors: true

auth:
  enabled: false  # Set to true for production

encryption:
  enabled: false  # Enable to decrypt OwnTracks encrypted payloads
  # key: your-secret-encryption-key (up to 32 chars; OwnTracks pads with zeroes)

database:
  path: ./data/owntracks.db
  ttl: 2592000  # 30 days

logging:
  level: info
  pretty: true
```

## Step 3: Start the Backend

```bash
cd packages/backend
bun run start
```

The server will start on http://localhost:3000

## Step 4: Configure OwnTracks App

1. Open OwnTracks on your mobile device
2. Go to **Preferences** → **Connection**
3. Set **Mode** to **HTTP**
4. Set **URL** to: `http://your-server-ip:3000/owntracks`
5. If using auth, set **Authentication** to **Basic Auth**
6. Set a **Device ID** (e.g., "my-phone")
7. If using encrypted payloads, set the same encryption key in OwnTracks and your backend config

## Step 5: Test It!

Send a test location:

```bash
curl -X POST http://localhost:3000/owntracks \
  -H "Content-Type: application/json" \
  -d '{
    "_type": "location",
    "lat": 51.5074,
    "lon": -0.1278,
    "tst": 1234567890,
    "device": "test"
  }'
```

Check stored locations:

```bash
curl http://localhost:3000/locations
```

## Step 6: Use with n8n (Optional)

### Install the n8n Node

```bash
cd packages/n8n-nodes-owntracks
bun link
cd ~/.n8n
bun link n8n-nodes-owntracks
```

Restart n8n, and you'll see the "OwnTracks Trigger" node available.

### Create a Workflow

1. Add an **OwnTracks Trigger** node
2. Configure credentials (backend URL)
3. Set event type (e.g., "Significant Movement")
4. Connect to other nodes (e.g., send notification)

## Docker Deployment (Recommended)

```bash
# Create config file
cp packages/backend/config.example.yaml config.yaml
# Edit config.yaml with your settings

# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

## n8n Node Installation (Production)

```bash
npm install -g n8n-nodes-owntracks
# or with Bun:
bun add -g n8n-nodes-owntracks
```

Restart n8n, and you'll see the "OwnTracks Trigger" node available.

## Release Automation (Maintainers)

- Tag `backend-vX.Y.Z` to trigger the GHCR Docker build and push workflow.
- Tag `nodes-vX.Y.Z` (after bumping `packages/n8n-nodes-owntracks/package.json`) to publish to npm via GitHub Actions (the workflow uses `npm publish`, but `bun publish` works for manual releases).

## Troubleshooting

### Backend won't start
- Check if port 3000 is available
- Verify config.yaml syntax
- Check logs for errors

### OwnTracks not sending data
- Ensure backend URL is correct and accessible
- Check firewall settings
- Verify device has internet connection
- Check backend logs for incoming requests

### n8n node not appearing
- Ensure node is properly linked
- Restart n8n
- Check n8n logs

## Next Steps

- Set up HTTPS with a reverse proxy (nginx, Caddy)
- Enable authentication for production
- Configure TTL based on your needs
- Explore n8n workflow automations

## Examples

### Example 1: Location Logging
Log all location updates to a file or database using n8n.

### Example 2: Geofencing
Trigger actions when entering/leaving specific areas.

### Example 3: Battery Monitoring
Get notified when device battery is low while away from home.

## Getting Help

- GitHub Issues: https://github.com/pdiegmann/n8n-owntracks/issues
- Documentation: See README.md
- OwnTracks Docs: https://owntracks.org/booklet/
- n8n Community: https://community.n8n.io/
