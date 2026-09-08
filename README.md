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

## Repository structure

```text
.
├── .github/
│   └── workflows/
├── demo/
│   ├── app/              # Next.js pages and mock API routes
│   ├── components/       # UI components
│   ├── lib/              # Client, domain, and server helpers
│   ├── public/           # Static assets
│   ├── Dockerfile
│   ├── package.json
│   └── pnpm-lock.yaml
├── docs/                 # Project documentation
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

The `demo/` application is currently self-contained and uses mock data and API
routes. Backend and AI services can be integrated independently in their
respective workstreams.
