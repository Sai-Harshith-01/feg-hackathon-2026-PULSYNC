# feg-hackathon-2026-PULSYNC
## Challenge 01- Session Quality and Session-to-Action Conversion

## Demo frontend

The integrated mock frontend is a self-contained Next.js application in [`demo/`](demo/).
Run it with pnpm:

```powershell
cd demo
pnpm install
pnpm dev
```

Open http://localhost:3000 to view the demo. The demo uses its included mock data and
API routes; it does not require the backend or AI workstreams.

### Run with Docker

From the repository root:

```powershell
docker compose up --build
```

Open http://localhost:3000. Stop the container with `docker compose down`.
