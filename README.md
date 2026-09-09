# feg-hackathon-2026--PULSYNC

## PULSYNC

FEG Hackathon 2026 - Challenge 01: Session Quality and Session-to-Action
Conversion.

The integrated application consists of a Vue.js frontend and a FastAPI backend.

## Frontend

The Vue frontend is in [`demo/`](demo/). Run it locally with pnpm:
Run it with pnpm:

```powershell
cd demo
pnpm install
pnpm dev
```

Open http://localhost:3000 to view the frontend. The Vite development proxy forwards
API requests to http://localhost:8000.

## Backend

The FastAPI service is in [`backend/`](backend/). Run it locally from the repository
root:

```powershell
pip install -r requirements.txt
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

The API health endpoint is available at http://localhost:8000/api/health.

## Run the complete stack with Docker Compose

From the repository root:

```powershell
docker compose up --build
```

Open http://localhost:3000. The API is available at http://localhost:8000.
Stop the services with `docker compose down`.

## Repository structure

```text
.
├── .github/
│   └── workflows/
├── demo/
│   ├── src/              # Vue application source
│   ├── public/            # Static assets
│   ├── Dockerfile         # Vite build and Nginx runtime image
│   ├── nginx.conf         # SPA fallback configuration
│   ├── package.json
│   └── pnpm-lock.yaml
├── backend/
│   ├── app/main.py        # FastAPI application and routes
│   ├── services/          # Session intelligence and analytics services
│   ├── tests/             # Backend tests
│   ├── Dockerfile
│   └── requirements.txt
├── docs/                 # Architecture, impact, compliance, and API contract
├── src/                  # Reserved for integrated application source
├── tests/                # Repository-level validation
├── assets/               # Shared project assets
├── config/               # Shared project configuration
├── docker-compose.yml
├── .env.example
├── docker-compose.yml     # Frontend and backend orchestration
├── requirements.txt
└── README.md
```

The frontend consumes the FastAPI endpoints through `VITE_API_URL`. Docker Compose
builds the frontend with `http://localhost:8000` so browser requests reach the
published backend service.

## Technology stack

- Frontend: Vue 3, Vite, TypeScript, Tailwind CSS
- Package manager: pnpm
- Backend: FastAPI, SQLAlchemy, SQLite by default
- Containerization: Docker and Docker Compose

## Prerequisites

- Node.js 22 or later
- pnpm 10 or later
- Docker Desktop with the Linux engine enabled

## Environment variables

Use [`.env.example`](.env.example) for shared configuration. Set `VITE_API_URL`
when running the frontend against a non-default backend URL.

## Testing

Build the demo from its directory:

```powershell
cd demo
pnpm install --frozen-lockfile
pnpm build
```

## Project documentation

- [Architecture](docs/architecture.md)
- [Impact case](docs/impact-case.md)
- [Compliance note](docs/compliance-note.md)
- [Dependencies](docs/dependencies.md)
