# ChiefVoice CRM — Frontend

Vite + React + TypeScript dashboard for ChiefVoice CRM. This is a standalone
project — it talks to `chiefvoice-crm-backend` over HTTP (CORS-enabled), with
no shared files or build step between the two.

## Local development

```
npm install
npm run dev
```

Runs on `http://localhost:5173` and proxies `/api/*` to the backend on
`http://localhost:3000` (see `vite.config.js`). Start the backend separately
in its own repo/terminal.

## Build

```
npm run build
```

Outputs a static build to `dist/`, deployable to any static host (Vercel,
Netlify, Cloudflare Pages, etc.) pointed at the backend's API URL.

## Routes

- `/` — customer dashboard
- `/admin` — platform admin panel (requires an account allowlisted via the
  backend's `PLATFORM_ADMIN_EMAILS`)
