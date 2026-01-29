# n8n-owntracks

A monorepo bridging OwnTracks & n8n - lightweight, easy-to-deploy location tracking integration.

## Features

### Backend API
- **OwnTracks HTTP JSON endpoint** - Receives location data from OwnTracks apps
- **YAML configuration** - Easy configuration with support for Basic Auth and encryption
- **Lightweight database** - SQLite-based storage with configurable TTL/auto-expiration
- **REST API** - Query stored location data
- **Automatic cleanup** - Periodic removal of expired records

### n8n Integration
- **Custom Trigger Nodes** - Trigger workflows on new locations or significant movement
- **TypeScript implementation** - Fully typed for better development experience
- **Flexible filtering** - Filter by device and minimum distance
- **Easy deployment** - Install as n8n community node

## Architecture

```
n8n-owntracks/
├── packages/
│   ├── backend/              # OwnTracks HTTP API backend
│   │   ├── src/
│   │   │   ├── index.ts      # Main entry point
│   │   │   ├── server.ts     # Fastify server setup
│   │   │   ├── database.ts   # SQLite database manager
│   │   │   ├── config.ts     # Configuration schema
│   │   │   ├── config-loader.ts  # YAML config loader
│   │   │   └── encryption.ts # OwnTracks payload decryption
│   │   └── package.json
│   └── n8n-nodes-owntracks/  # n8n custom nodes
│       ├── credentials/
│       │   └── OwnTracksApi.credentials.ts
│       ├── nodes/
│       │   └── OwnTracks/
│       │       ├── OwnTracksTrigger.node.ts
│       │       └── owntracks.svg
│       └── package.json
└── package.json              # Root workspace config
```

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- n8n instance (for using the custom nodes)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/pdiegmann/n8n-owntracks.git
cd n8n-owntracks
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build all packages:**
```bash
npm run build
```

### Backend Setup

1. **Create configuration file:**
```bash
cd packages/backend
cp config.example.yaml config.yaml
```

2. **Edit `config.yaml` with your settings:**
```yaml
server:
  host: 0.0.0.0
  port: 3000
  cors: true

auth:
  enabled: true
  username: admin
  password: $2b$10$... # Use bcrypt to hash your password

database:
  path: ./data/owntracks.db
  ttl: 2592000  # 30 days
```

3. **Generate bcrypt password (optional):**
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your-password', 10, (err, hash) => console.log(hash));"
```

4. **Start the backend:**
```bash
npm start
# or for development with hot reload:
npm run dev
```

The backend will start on `http://localhost:3000` (or your configured host/port).

### n8n Node Installation

#### Option 1: Local Development
```bash
cd packages/n8n-nodes-owntracks
npm link
cd ~/.n8n
npm link n8n-nodes-owntracks
```

#### Option 2: Install from npm (when published)
```bash
npm install -g n8n-nodes-owntracks
```

#### Option 3: Install via n8n UI
1. Go to **Settings** > **Community Nodes**
2. Click **Install**
3. Enter: `n8n-nodes-owntracks`
4. Click **Install**

### OwnTracks App Configuration

Configure your OwnTracks mobile app to send location data to your backend:

1. Open OwnTracks app
2. Go to **Preferences** > **Connection**
3. Set **Mode** to **HTTP**
4. Set **URL** to: `http://your-server:3000/owntracks`
5. If you enabled auth, set **Authentication** to **Basic Auth**
6. Enter your **Username** and **Password**
7. Set **Device ID** to identify your device

For encrypted payloads:
1. Enable **Encryption** in OwnTracks preferences
2. Set your encryption key (up to 32 characters; OwnTracks pads with zeroes)
3. Add the same key to your backend `config.yaml`

## Usage

### Backend API Endpoints

#### POST /owntracks
Receives OwnTracks location data (used by OwnTracks app). The backend will accept empty payloads (OwnTracks can send zero-length payloads for deletions).

**Request body example:**
```json
{
  "_type": "location",
  "lat": 51.5074,
  "lon": -0.1278,
  "tst": 1234567890,
  "acc": 10,
  "batt": 85,
  "tid": "ab",
  "vel": 5
}
```

#### GET /locations
Retrieve stored locations.

**Query parameters:**
- `limit` - Number of records to return (default: 100)
- `device` - Filter by device ID

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

#### GET /locations/:id
Get a specific location by ID.

#### POST /cleanup
Manually trigger TTL cleanup of expired records.

#### GET /health
Health check endpoint with database statistics.

### n8n Trigger Node

#### OwnTracks Trigger
Triggers workflows when new location data arrives.

**Configuration:**
- **Event Type:**
  - `New Location` - Trigger on any new location update
  - `Significant Movement` - Only trigger when movement exceeds threshold
- **Device Filter** - Filter by specific device (optional)
- **Minimum Distance** - Distance threshold in meters (for significant movement)
- **Poll Interval** - How often to check for new locations (seconds)

**Output Data:**
The trigger node outputs location data with all OwnTracks fields:
```json
{
  "id": 123,
  "_type": "location",
  "lat": 51.5074,
  "lon": -0.1278,
  "tst": 1234567890,
  "acc": 10,
  "batt": 85,
  "tid": "ab",
  "device": "my-phone"
}
```

#### Example Workflow
1. Add **OwnTracks Trigger** node
2. Configure credentials (backend URL and auth)
3. Set event type to "Significant Movement" with 500m threshold
4. Connect to other n8n nodes (e.g., send notification, update database, etc.)

## Configuration Options

### Environment Variables

You can override YAML config with environment variables:

```bash
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
AUTH_USERNAME=admin
AUTH_PASSWORD=$2b$10$...
ENCRYPTION_KEY=your-secret-key
DB_PATH=/data/owntracks.db
DB_TTL=2592000
CONFIG_PATH=/path/to/config.yaml
```

### Database TTL

The TTL (Time To Live) setting automatically removes old location records:
- Default: 2592000 seconds (30 days)
- Set to `0` to disable auto-expiration
- Cleanup runs automatically every hour
- Manual cleanup: `POST /cleanup`

### OwnTracks HTTP headers

OwnTracks HTTP mode can send device identifiers via headers. The backend uses the `X-Limit-D` header to populate the `device` field if it is missing from the payload.

## Deployment

### Docker (Recommended)

Create a `Dockerfile` for the backend:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install dependencies
RUN npm install --workspace=@n8n-owntracks/backend

# Copy source
COPY packages/backend ./packages/backend
COPY tsconfig.json ./

# Build
RUN npm run build --workspace=@n8n-owntracks/backend

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "packages/backend/dist/index.js"]
```

Build and run:
```bash
docker build -t owntracks-backend .
docker run -p 3000:3000 -v $(pwd)/config.yaml:/app/config.yaml -v $(pwd)/data:/app/data owntracks-backend
```

### Systemd Service

Create `/etc/systemd/system/owntracks-backend.service`:

```ini
[Unit]
Description=OwnTracks Backend
After=network.target

[Service]
Type=simple
User=owntracks
WorkingDirectory=/opt/owntracks-backend
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable owntracks-backend
sudo systemctl start owntracks-backend
```

### Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name owntracks.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Considerations

1. **Use HTTPS** - Always use HTTPS in production to protect location data
2. **Enable Authentication** - Use Basic Auth to prevent unauthorized access
3. **Encryption** - Use OwnTracks payload encryption for additional security
4. **Firewall** - Restrict access to the backend server
5. **Regular Updates** - Keep dependencies updated for security patches

## Development

### Project Structure
- `packages/backend` - Fastify-based HTTP server
- `packages/n8n-nodes-owntracks` - n8n community nodes

### Development Commands

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start backend in dev mode (with hot reload)
npm run dev --workspace=@n8n-owntracks/backend

# Build n8n nodes
npm run build --workspace=n8n-nodes-owntracks

# Clean build artifacts
npm run clean
```

### Testing Locally

Test the backend with curl:

```bash
# Send location data
curl -X POST http://localhost:3000/owntracks \
  -H "Content-Type: application/json" \
  -d '{
    "_type": "location",
    "lat": 51.5074,
    "lon": -0.1278,
    "tst": 1234567890,
    "tid": "ab"
  }'

# Get locations
curl http://localhost:3000/locations

# Health check
curl http://localhost:3000/health
```

## Troubleshooting

### Backend not starting
- Check if port 3000 is available: `lsof -i :3000`
- Verify configuration file exists and is valid YAML
- Check logs for error messages

### OwnTracks app not sending data
- Verify URL is correct and reachable
- Check authentication credentials
- Ensure CORS is enabled if testing from browser
- Verify encryption key matches if using encryption

### n8n node not appearing
- Ensure node is properly installed: `npm list -g n8n-nodes-owntracks`
- Restart n8n after installation
- Check n8n logs for errors
- Verify package.json has correct n8n metadata

### No data in triggers
- Verify OwnTracks app is sending data (check backend logs)
- Check polling interval is not too long
- Verify credentials in n8n are correct
- Check device filter matches your device ID

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Resources

- [OwnTracks Documentation](https://owntracks.org/booklet/)
- [OwnTracks HTTP Mode](https://owntracks.org/booklet/tech/http/)
- [OwnTracks JSON Format](https://owntracks.org/booklet/tech/json/)
- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community Nodes](https://docs.n8n.io/integrations/creating-nodes/)

## Support

For issues and questions:
- GitHub Issues: https://github.com/pdiegmann/n8n-owntracks/issues
- OwnTracks Community: https://github.com/owntracks
- n8n Community: https://community.n8n.io/

