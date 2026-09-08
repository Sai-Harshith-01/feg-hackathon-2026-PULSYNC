# feg-hackathon-2026-PULSYNC

## PULSYNC

FEG Hackathon 2026 - Challenge 01: Session Quality and Session-to-Action
Conversion.

The current working prototype is a self-contained Next.js demo. Backend and
AI services are separate workstreams and are not included in this branch.

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
│   ├── lib/              # Client, session, domain, and server helpers
│   ├── public/           # Static assets
│   ├── screenshots/      # Submission screenshots
│   ├── presentation/     # Submission presentation materials
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── next.config.mjs
│   ├── package.json
│   └── pnpm-lock.yaml
├── docs/                 # Architecture, impact, compliance, and API contract
├── src/                  # Reserved for integrated application source
├── tests/                # Repository-level validation
├── assets/               # Shared project assets
├── config/               # Shared project configuration
├── docker-compose.yml
├── .env.example
├── requirements.txt
└── README.md
```

The `demo/` application is currently self-contained and uses mock data and API
routes. Backend and AI services can be integrated independently in their
respective workstreams.

## Technology stack

- Frontend prototype: Next.js 16, React 19, TypeScript, Tailwind CSS
- Package manager: pnpm
- Local data and API behavior: mock services included in `demo/`
- Containerization: Docker and Docker Compose
- Planned workstreams: FastAPI/Python backend, Python AI/ML, Supabase/PostgreSQL

## Prerequisites

- Node.js 22 or later
- pnpm 10 or later
- Docker Desktop (optional, for the containerized demo)

## Environment variables

No environment variables are required for the current mock demo. Use
[`.env.example`](.env.example) as the repository-level template when shared
services are added.

## Testing

Build the demo from its directory:

```powershell
cd demo
pnpm install --frozen-lockfile
pnpm build
```

## Demo flow

Start at `/`, then explore the sports feed, event details, live view, wallet,
my bets, promotions, support, and portal routes. The included API routes provide
the mock data needed by the prototype.

## Known limitations and future work

The current demo does not connect to the separate backend, AI, or database
workstreams. Authentication, settlement, analytics, and other interactions are
mocked for the prototype. Future work will connect these surfaces through the
agreed service contracts and add the team's submission media under `demo/`.

## Project documentation

- [Architecture](docs/architecture.md)
- [Impact case](docs/impact-case.md)
- [Compliance note](docs/compliance-note.md)
- [Dependencies](docs/dependencies.md)
