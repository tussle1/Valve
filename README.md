# Valve

**A universal AI development environment** — VS Code-style IDE in the browser with pluggable AI providers, terminal, Git, and agent framework.

![Valve IDE](https://img.shields.io/badge/Valve-v0.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-94.3%25-3178C6)
![React](https://img.shields.io/badge/React-18-61DAFB)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

| Category | Capabilities |
|----------|--------------|
| **AI Providers** | OpenAI, Anthropic, Google, Groq, Ollama, OpenRouter, Together, Mistral, Cohere, Perplexity, xAI, LM Studio — unified interface |
| **Terminal** | Full PTY via xterm.js + WebSocket — run any CLI command |
| **Git** | Stage, commit, push, pull, branch, diff — native via simple-git |
| **Agents** | Configurable autonomous agents with tool access (file ops, terminal, git, search) |
| **Workspace** | File explorer, multi-tab editor (Monaco), settings persistence |
| **Models** | Dynamic model registry per provider — auto-fetches available models |

---

## 🏗 Architecture

```
Valve/
├── packages/
│   ├── frontend/     # React + Vite + Monaco Editor + xterm.js
│   ├── backend/      # Node.js + Express + WebSocket + SQLite/JSON
│   └── shared/       # TypeScript types (2000+ lines) — single source of truth
├── .github/workflows/  # CI/CD for GitHub Pages + Railway/Fly.io
└── railway.toml      # Railway deployment config
```

**Tech Stack**: React 18, TypeScript, Express, Socket.io, Monaco Editor, xterm.js, simple-git, better-sqlite3, Zod, TanStack Query, Zustand

---

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- npm 10+

### Local Development

```bash
# 1. Clone & install
git clone https://github.com/tussle1/Valve.git
cd Valve
npm install --workspaces --include-workspace-root

# 2. Build shared types
npm run build --workspace=packages/shared

# 3. Start backend (terminal 1)
npm run dev --workspace=packages/backend

# 4. Start frontend (terminal 2)
npm run dev --workspace=packages/frontend
```

**Frontend**: http://localhost:5173  
**Backend API**: http://localhost:3001  
**WebSocket**: ws://localhost:3001/ws

---

## 📦 Project Structure

### Shared Package (`packages/shared/`)
Single source of truth for all types:
- `providers.ts` — Provider adapters, model registry, capability types
- `agents.ts` — Agent config, tasks, tools, execution types
- `terminal.ts` — PTY session, resize, output types
- `git.ts` — Git operations, status, diff, commit types
- `workspace.ts` — Files, tabs, settings, themes
- `chat.ts` — Messages, conversations, streaming types
- `api.ts` — REST endpoints, WebSocket events, error types

### Backend (`packages/backend/`)
- **Database**: Better-sqlite3 (SQLite) + JSON file fallback
- **Providers**: 12 adapters with unified `ProviderAdapter` interface
- **WebSocket**: Socket.io for terminal, agent streaming, git operations
- **API**: REST routes for providers, models, agents, files, git, settings

### Frontend (`packages/frontend/`)
- **Editor**: Monaco (VS Code editor core)
- **Terminal**: xterm.js + fit/addon-webgl
- **State**: Zustand + TanStack Query
- **UI**: Custom CSS variables, no framework dependency

---

## 🔌 Adding a New AI Provider

1. Create `packages/backend/src/providers/your-provider.ts`
2. Implement `ProviderAdapter` interface
3. Register in `packages/backend/src/providers/registry.ts`
4. Add models to `packages/backend/src/models/registry.ts`
5. Frontend auto-detects via `/api/providers` and `/api/models`

---

## 📜 Scripts

```bash
# Root
npm install                    # Install all workspaces
npm run build                  # Build all packages
npm run dev                    # Start all dev servers

# Shared
npm run build --workspace=packages/shared  # Compile TypeScript

# Backend
npm run dev --workspace=packages/backend   # tsx watch mode
npm run start --workspace=packages/backend # Production start

# Frontend
npm run dev --workspace=packages/frontend  # Vite dev server
npm run build --workspace=packages/frontend # Production build
npm run preview --workspace=packages/frontend # Preview build
```

---

## 🌐 Deployment

### Frontend → GitHub Pages (Auto)
- Push to `main` → GitHub Actions builds & deploys
- Live at: **https://tussle1.github.io/Valve/**

### Backend → Railway (Recommended)
1. Go to **https://railway.app** → Sign in with GitHub
2. **"New Project"** → **"Deploy from GitHub repo"** → Select `tussle1/Valve`
3. **Root Directory**: `/packages/backend`
4. **Add Variables** (Railway dashboard → Variables):
   - `JWT_SECRET` = `openssl rand -hex 32`
   - `ENCRYPTION_KEY` = `openssl rand -hex 32`
   - `FRONTEND_URL` = `https://tussle1.github.io/Valve`
5. **Deploy** → get URL like `https://xxx.up.railway.app`

### After Backend Deploy
1. Copy your Railway URL (e.g., `https://valve-backend.up.railway.app`)
2. Update `packages/frontend/src/config/env.ts`:
   ```typescript
   const PROD_API_URL = 'https://your-railway-url.up.railway.app';
   const PROD_WS_URL = 'wss://your-railway-url.up.railway.app';
   ```
3. Push → GitHub Pages rebuilds with new backend URL

---

## 🔐 Security

- **JWT_SECRET**: Signs auth tokens (32+ chars, `openssl rand -hex 32`)
- **ENCRYPTION_KEY**: AES-256-GCM for stored API keys (32 bytes hex)
- **API Keys**: Encrypted at rest, never logged, proxied through backend
- **CORS**: Locked to `FRONTEND_URL` only

---

## 📊 Stats

| Metric | Value |
|--------|-------|
| Total Files | 64 |
| Total Lines | 13,527 |
| TypeScript/TSX | 94.3% |
| CSS | 3.2% |
| Other | 2.5% |

---

## 🤝 Contributing

1. Fork → branch → PR
2. Follow existing patterns (shared types first)
3. Add types to `packages/shared` before implementing
4. Test locally with `npm run dev`

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

**Built for developers who want universal AI access without vendor lock-in.**