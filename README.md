# Valve IDE

> **A production-grade, extensible AI-powered IDE built with TypeScript, React, and a universal multi-provider AI architecture.**

Valve is a modern IDE designed from the ground up for AI-first development. It features a universal provider system supporting 15+ AI providers, a Monaco-based code editor, integrated terminal, Git/GitHub workflow, and a complete agent runtime with tool-calling and approval flows.

[![TypeScript](https://img.shields.io/badge/TypeScript-94%25-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Valve IDE (Monorepo)                             │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│  @valve/shared  │ @valve/backend  │ @valve/frontend │   Extensions API      │
│                 │                 │                 │                       │
│ • Types & Schemas│ • REST API      │ • React + Vite  │ • Language Server   │
│ • Zod Validation │ • WebSocket     │ • Monaco Editor │ • Themes            │
│ • Provider Defs  │ • Provider Reg. │ • xterm.js      │ • Commands          │
│ • Agent Types    │ • Agent Runtime │ • Zustand Store │ • Keybindings       │
│ • Workspace Types│ • Terminal API  │ • Tailwind CSS  │ • Views             │
│ • Git Types      │ • Settings API  │ • Git Panel     │ • Debug Adapters    │
│ • Terminal Types │ • Git API       │ • AI Chat       │ • Formatters        │
│ • Settings Types │ • Workspace API │ • Agent Panel   │ • Linters           │
│ • Extension Types│ • Auth (JWT)    │ • Terminal      │ • AI Providers      │
└────────┬────────┴────────┬─────────┴────────┬────────┴───────────────────┘
         │                 │                  │
         └─────────────────┴──────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  JSON File Storage│
                    │  (Dev) / PostgreSQL│
                    │  (Prod via Drizzle)│
                    └───────────────────┘
```

### Monorepo Structure

```
Valve/
├── packages/
│   ├── shared/           # Shared types, Zod schemas, constants
│   │   ├── src/
│   │   │   ├── providers/    # Provider types, capabilities, models
│   │   │   ├── agents/       # Agent types, tools, approvals
│   │   │   ├── workspace/    # Workspace, project, file tree types
│   │   │   ├── git/          # Git types (changes, branches, commits)
│   │   │   ├── terminal/     # Terminal types (sessions, profiles, tasks)
│   │   │   ├── settings/     # Settings, themes, credentials
│   │   │   ├── extensions/   # Extension API types
│   │   │   └── index.ts      # Barrel exports
│   │   └── tsconfig.json
│   │
│   ├── backend/          # Node.js REST API + WebSocket server
│   │   ├── src/
│   │   │   ├── routes/       # REST endpoints
│   │   │   │   ├── providers.ts   # Provider CRUD, model listing
│   │   │   │   ├── chat.ts        # Conversations, streaming chat
│   │   │   │   ├── workspace.ts   # Workspace/project/file ops
│   │   │   │   ├── git.ts         # Git status, diff, log, operations
│   │   │   │   ├── terminal.ts    # WebSocket terminal sessions
│   │   │   │   ├── settings.ts    # Settings, encrypted credentials
│   │   │   │   └── agents.ts      # Agent tasks, approvals, tools
│   │   │   ├── providers/    # 15+ Provider adapters
│   │   │   │   ├── base.ts        # Base adapter, SSE parsing
│   │   │   │   ├── openai.ts      # OpenAI + Azure OpenAI
│   │   │   │   ├── anthropic.ts   # Anthropic Claude
│   │   │   │   ├── google.ts      # Google Gemini
│   │   │   │   ├── xai.ts         # xAI Grok
│   │   │   │   ├── deepseek.ts    # DeepSeek
│   │   │   │   ├── mistral.ts     # Mistral AI
│   │   │   │   ├── openrouter.ts  # OpenRouter (100+ models)
│   │   │   │   ├── together.ts    # Together AI
│   │   │   │   ├── fireworks.ts   # Fireworks AI
│   │   │   │   ├── groq.ts        # Groq (fast inference)
│   │   │   │   ├── huggingface.ts # Hugging Face Inference
│   │   │   │   ├── cohere.ts      # Cohere
│   │   │   │   ├── ollama.ts      # Local Ollama
│   │   │   │   ├── lmstudio.ts    # Local LM Studio
│   │   │   │   └── registry.ts    # Provider/model registry
│   │   │   ├── db/           # JSON file storage (dev) / Drizzle ORM (prod)
│   │   │   └── index.ts      # Express + WS server entry
│   │   └── tsconfig.json
│   │
│   └── frontend/         # React + Vite SPA
│       ├── src/
│       │   ├── components/
│       │   │   ├── ai/          # AIChatPanel, ModelPicker
│       │   │   ├── editor/      # Monaco Editor wrapper
│       │   │   ├── explorer/    # File tree, search
│       │   │   ├── git/         # Git panel (changes, branches, commits)
│       │   │   ├── terminal/    # xterm.js terminal
│       │   │   ├── layout/      # ActivityBar, TopBar, Panels
│       │   │   └── ui/          # Button, Input, Dropdown, Modal, Tooltip
│       │   ├── hooks/           # Custom React hooks (useTabs, useTerminal, etc.)
│       │   ├── stores/          # Zustand store (UI state, data)
│       │   ├── utils/           # Helpers (cn, formatting, tokens)
│       │   ├── types/           # Frontend-specific types
│       │   ├── main.tsx         # App entry point
│       │   ├── App.tsx          # Main layout
│       │   └── index.css        # Tailwind + custom theme
│       ├── public/              # Static assets (404.html for SPA)
│       ├── vite.config.ts       # Vite config with GitHub Pages base
│       └── tsconfig.json
│
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml  # GitHub Pages deployment
│
├── turbo.json               # Turborepo config (optional)
├── package.json             # Root workspace config
└── README.md
```

---

## ✨ Features

### 🤖 Universal AI Provider System
- **15+ Providers**: OpenAI, Azure OpenAI, Anthropic, Google Gemini, xAI Grok, DeepSeek, Mistral, OpenRouter, Together AI, Fireworks, Groq, Hugging Face, Cohere, Ollama (local), LM Studio (local)
- **Unified Interface**: Single `ProviderAdapter` interface — swap providers without code changes
- **Model Registry**: Persistent model catalog with capabilities, pricing, context windows
- **Streaming & Tools**: Full streaming support + function/tool calling across all providers
- **Credential Management**: AES-256-GCM encrypted API key storage with scope support (user/workspace/project)

### 💬 AI Chat Panel
- Multi-conversation support with persistence
- Streaming responses with token counting
- Model/provider picker with capability badges
- System instructions + project instructions
- Message attachments (files, code snippets)
- Copy/regenerate/edit message actions
- Markdown rendering with syntax highlighting

### 🤖 Agent Runtime (5 Built-in Agents)
| Agent | Purpose |
|-------|---------|
| **Code Agent** | General coding tasks, refactoring, implementation |
| **Debug Agent** | Error analysis, stack traces, fix suggestions |
| **Refactor Agent** | Code improvement, patterns, modernization |
| **Test Agent** | Unit/integration test generation, coverage |
| **Review Agent** | Code review, security, best practices |

- **Task Queue**: Async execution with pause/resume/cancel
- **Approval Flow**: Human-in-the-loop for sensitive operations (file writes, commands, credentials)
- **Tool System**: 12 built-in tools (read/write files, execute commands, git, search, terminal, etc.)
- **Event Streaming**: Real-time agent progress via WebSocket

### 📝 Monaco Code Editor
- Full VS Code-compatible editing experience
- Multi-tab support with dirty tracking
- Language detection, IntelliSense, hover, go-to-definition
- Find/Replace with regex support
- Minimap, line numbers, bracket matching
- Custom Valve dark theme

### 🌳 File Explorer
- Virtualized file tree (handles large projects)
- Inline rename, delete, create files/folders
- Git status indicators (modified, staged, untracked)
- Context menu with common actions
- Drag-and-drop reordering (planned)

### 🔧 Integrated Terminal (xterm.js)
- Multiple persistent sessions
- WebSocket-based PTY backend
- Resize, copy/paste, links detection
- Custom profiles (shell, env, cwd)
- Task runner integration

### 📦 Git & GitHub Integration
- File status (staged/unstaged/untracked)
- Stage/unstage individual files or all
- Commit with conventional commit helper
- Branch management (create, checkout, delete)
- Commit history with diff view
- Push/pull/fetch with remote management
- GitHub PR view (planned)

### ⚙️ Settings System
- **Scopes**: User → Workspace → Project (cascading)
- Categories: Editor, Terminal, AI, Git, Extensions, Appearance
- Import/Export settings as JSON
- Encrypted credential storage
- Theme customization (8 accent colors, density settings)

### 🧩 Extension System (Foundation)
- VS Code-compatible Extension API
- Contribution points: commands, views, languages, themes, keybindings
- Host process isolation (planned)
- Permission system (filesystem, network, git, terminal, credentials)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Language** | TypeScript (strict mode) |
| **Frontend** | React 18, Vite 5, Zustand, Tailwind CSS |
| **Editor** | Monaco Editor (@monaco-editor/react) |
| **Terminal** | xterm.js + addons (fit, web-links) |
| **Backend** | Express.js, ws (WebSocket), node-pty |
| **Database** | JSON files (dev), Drizzle ORM + PostgreSQL (prod) |
| **Validation** | Zod (shared schemas) |
| **AI Providers** | Native fetch, SSE parsing, tool calling |
| **Auth** | JWT (access + refresh tokens) |
| **Encryption** | Web Crypto API (AES-256-GCM) |
| **Build** | Vite, tsc, Turborepo (optional) |
| **Deploy** | GitHub Actions → GitHub Pages (frontend) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 22+** (LTS recommended)
- **pnpm 9+** (or npm/yarn)
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/tussle1/Valve.git
cd Valve

# Install all workspace dependencies
pnpm install

# Build all packages
pnpm run build

# Start development servers (both frontend + backend)
pnpm run dev
```

### Development URLs

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| WebSocket | ws://localhost:3001/ws |

### Environment Variables

**Backend** (`packages/backend/.env`):
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-32-byte-hex-encryption-key
DATABASE_URL=postgresql://user:pass@localhost:5432/valve  # Optional for prod
```

**Frontend** (`packages/frontend/.env`):
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

---

## 📦 Available Scripts

### Root (Monorepo)
```bash
pnpm install          # Install all dependencies
pnpm run build        # Build all packages
pnpm run dev          # Start all dev servers
pnpm run lint         # Lint all packages
pnpm run test         # Run all tests
pnpm run clean        # Remove dist/node_modules
```

### Per Package
```bash
# Shared
cd packages/shared && pnpm run build

# Backend
cd packages/backend && pnpm run dev      # tsx watch mode
cd packages/backend && pnpm run build    # tsc compile
cd packages/backend && pnpm run start    # node dist/index.js

# Frontend
cd packages/frontend && pnpm run dev     # Vite dev server
cd packages/frontend && pnpm run build   # Production build
cd packages/frontend && pnpm run preview # Preview production build
```

---

## 🌐 Deployment

### Frontend → GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`) that automatically builds and deploys the frontend to GitHub Pages on push to `main`.

**Live URL**: `https://tussle1.github.io/Valve/`

#### Setup Steps:
1. Go to **Settings → Pages** in your GitHub repo
2. Set **Source** to "GitHub Actions"
3. Push to `main` branch or manually trigger the workflow
4. The workflow builds with `base: "/Valve/"` and deploys to `gh-pages` branch

#### For Custom Domain:
```typescript
// vite.config.ts
const base = process.env.CUSTOM_DOMAIN ? "/" : "/Valve/";
```
Update `pathSegmentsToKeep = 0` in `index.html` and `public/404.html`.

### Backend Deployment

Deploy the backend to any Node.js hosting (Railway, Render, Fly.io, AWS, etc.):

```bash
# Build
cd packages/backend && pnpm run build

# Run
node dist/index.js
```

**Required environment variables:**
- `PORT` (default 3001)
- `JWT_SECRET` (32+ chars)
- `ENCRYPTION_KEY` (32-byte hex)
- `DATABASE_URL` (PostgreSQL for production)
- `FRONTEND_URL` (CORS origin)

---

## 🔐 Security

- **Encrypted Credentials**: AES-256-GCM via Web Crypto API
- **JWT Authentication**: Access tokens (15m) + Refresh tokens (7d)
- **Rate Limiting**: Express rate limiter on API routes
- **Helmet**: Security headers
- **CORS**: Configured for frontend origin only
- **Input Validation**: Zod schemas on all API endpoints
- **No Secrets in Code**: All credentials via environment variables

---

## 🧪 Testing

```bash
# Unit tests (Vitest)
pnpm run test

# Frontend only
cd packages/frontend && pnpm run test

# Backend only
cd packages/backend && pnpm run test
```

---

## 📁 Project Statistics

| Metric | Value |
|--------|-------|
| **Total Lines** | ~13,500 (excl. deps) |
| **TypeScript** | 94.3% |
| **Packages** | 3 (shared, backend, frontend) |
| **Providers** | 15+ |
| **Agents** | 5 built-in |
| **Tools** | 12 built-in |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- No `any` types without justification

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Monaco Editor** — VS Code's editor core
- **xterm.js** — Terminal emulator
- **Zustand** — Lightweight state management
- **Tailwind CSS** — Utility-first styling
- **Zod** — TypeScript-first validation
- **All AI Providers** — For their excellent APIs

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/tussle1/Valve/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tussle1/Valve/discussions)
- **Email**: valve-ide@example.com

---

<div align="center">
  <strong>Built with ❤️ for developers who want AI-native workflows</strong>
</div>