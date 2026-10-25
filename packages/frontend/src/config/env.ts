// Environment configuration for Valve Frontend
// All values can be overridden via VITE_* environment variables

// Default production backend URL (replace with your Fly.io URL after deploy)
const PROD_API_URL = 'https://valve-backend.fly.dev';
const PROD_WS_URL = 'wss://valve-backend.fly.dev';

export const config = {
  // Backend API URL
  apiUrl: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PROD_API_URL : '/api'),
  
  // WebSocket URL
  wsUrl: import.meta.env.VITE_WS_URL || (import.meta.env.PROD ? PROD_WS_URL : '/ws'),
  
  // GitHub Pages base path
  basePath: import.meta.env.BASE_URL || '/',
  
  // Feature flags
  features: {
    aiChat: true,
    terminal: true,
    git: true,
    agents: true,
    settings: true,
  },
  
  // Default values
  defaults: {
    theme: 'dark',
    accentColor: 'violet',
    density: 'comfortable',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
} as const;

export type Config = typeof config;

// Helper to build API URLs
export function apiUrl(path: string): string {
  const base = config.apiUrl.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

// Helper to build WebSocket URLs
export function wsUrl(path: string): string {
  const base = config.wsUrl.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}