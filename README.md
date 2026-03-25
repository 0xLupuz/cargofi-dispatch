# CargoFi Dispatch

Fleet management TMS for CargoFi — dispatch operations, load tracking, OO settlements, and WhatsApp automation.

## Stack
- **Frontend:** Next.js 15 (App Router) + Tailwind CSS
- **Backend:** FastAPI (Railway) — see `cargofi-dispatch-api` repo
- **Database:** Supabase (PostgreSQL)
- **AI:** Claude Vision (rate con parsing)
- **Messaging:** Meta WhatsApp Cloud API

## Getting Started

```bash
cp .env.local.example .env.local
# fill in your env vars
npm install
npm run dev
```

## Deploy
- Frontend: Vercel → dispatch.cargofi.io
- Backend: Railway → api.cargofi.io (or cargofi-backend-production.up.railway.app)
