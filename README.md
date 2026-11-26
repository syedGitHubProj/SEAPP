# SellEase

Furniture sales, factory ordering and financial management for ABC Furniture.

- Business requirements and sample screens: [docs/brief](docs/brief)
- Approved phased plan: [docs/PLAN.md](docs/PLAN.md)

## Folders

| Folder | What it is |
|---|---|
| `api/` | ASP.NET Core (.NET 10) API and its tests |
| `web/` | Next.js website (TypeScript, Tailwind) and its tests |
| `deploy/` | Docker Compose files (local database now; server files from Phase 2) |
| `docs/` | Brief, plan and guides |
| `.github/workflows/` | CI: builds and tests both apps on every push to `main` |

## Run it locally

Needs: .NET 10 SDK, Node 22, Docker Desktop.

```bash
# Website (http://localhost:3000)
cd web && npm install && npm run dev

# API (prints its address; try /health)
cd api && dotnet run --project src/SellEase.Api

# Local database (used from Phase 2)
docker compose -f deploy/docker-compose.dev.yml up -d
```

## Phase 1 prototype

The website is a clickable prototype with sample data (no server, nothing saved except in your own browser).
Use **Viewing as** at the top to switch between Salesman, Manager and Admin.

## Tests

```bash
cd api && dotnet test
cd web && npm run lint && npm test && npm run build
cd web && npx playwright install chromium   # once
cd web && npm run e2e   # browser tests at phone and desktop sizes (after build)
```
