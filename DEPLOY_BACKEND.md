# Valve IDE Backend Deployment Guide

## Quick Deploy to Fly.io

### Prerequisites
- Fly.io account: https://fly.io
- Fly CLI installed: `curl -L https://fly.io/install.sh | sh`

### One-Command Deploy

```bash
# 1. Login to Fly.io
flyctl auth login

# 2. Launch app (creates fly.toml if needed)
flyctl launch --name valve-backend --region iad --no-deploy

# 3. Set required secrets
flyctl secrets set JWT_SECRET=$(openssl rand -hex 32)
flyctl secrets set ENCRYPTION_KEY=$(openssl rand -hex 32)
flyctl secrets set FRONTEND_URL=https://tussle1.github.io/Valve

# 4. Deploy
flyctl deploy

# 5. Check status
flyctl status
flyctl logs
```

### Your App Will Be Available At:
- **Backend API**: `https://valve-backend.fly.dev`
- **WebSocket**: `wss://valve-backend.fly.dev/ws`
- **Health Check**: `https://valve-backend.fly.dev/health`

---

## Local Testing with Docker Compose

```bash
# Build and run locally
docker-compose up --build

# Backend available at http://localhost:3001
# Health check: http://localhost:3001/health
```

---

## GitHub Actions Auto-Deploy

1. Add `FLY_API_TOKEN` to GitHub repository secrets:
   - Go to https://fly.io/user/personal_access_tokens
   - Create token with "Deploy" scope
   - Add to GitHub: Settings → Secrets → Actions → `FLY_API_TOKEN`

2. Push to main branch triggers auto-deploy

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | 32+ char random string (`openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | Yes | 32-byte hex for AES-256-GCM (`openssl rand -hex 32`) |
| `FRONTEND_URL` | Yes | Your GitHub Pages URL (`https://tussle1.github.io/Valve`) |
| `DATABASE_URL` | No | PostgreSQL URL (uses JSON file storage if omitted) |
| `PORT` | No | Default: 3001 |
| `NODE_ENV` | No | `production` |

---

## Update Frontend Config

After backend deploy, update `packages/frontend/src/config/env.ts`:

```typescript
const PROD_API_URL = 'https://your-app-name.fly.dev';
const PROD_WS_URL = 'wss://your-app-name.fly.dev';
```

Then rebuild and redeploy frontend:
```bash
cd packages/frontend
npm run build
git add dist && git commit -m "Update backend URL" && git push
```

---

## Verify Deployment

```bash
# Check health
curl https://valve-backend.fly.dev/health

# Test WebSocket
wscat -c wss://valve-backend.fly.dev/ws

# Check logs
flyctl logs -a valve-backend
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Connection refused" | Check `flyctl logs` for startup errors |
| CORS errors | Verify `FRONTEND_URL` matches exactly |
| WebSocket fails | Ensure `wss://` URL matches backend domain |
| Secrets not working | Run `flyctl secrets list` to verify |

---

## Cost Estimate (Fly.io)

| Resource | Monthly Cost |
|----------|--------------|
| 1 shared CPU, 256MB RAM | ~$1-2/month |
| Auto-stop when idle | Free when unused |
| IPv4 address | $0.02/hour when running |

**Estimated: $1-5/month** for typical usage