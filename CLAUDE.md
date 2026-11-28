# SellEase — notes for Claude

SellEase is a furniture showroom app for ABC Furniture in Pakistan. It covers the catalogue, sales orders and advances, factory purchase orders, receiving and delivery, expenses, and double-entry accounting. The brief is in `docs/brief/`, and the approved phases are in `docs/PLAN.md`.

## Owner's rules (always follow)
- Never commit secrets.
- Never ask for, handle or store passwords, tokens or API keys. The owner enters them into GitHub Secrets or the server's `.env` themselves.
- Never run database migrations against a server automatically. They run only from a GitHub Actions workflow that the owner starts by hand.
- The owner pushes to GitHub. Give them the exact `git push` command.
- Confirm with the owner before deleting anything.
- Never commit the owner's Excel workbook (`*.xlsm`); it may hold real customer data.
- This project is separate from the owner's other projects. Don't read or change folders outside SEAPP.
- Explain things in short, plain English, with exact steps for anything the owner must do by hand.

## How we work
- For now (owner's choice, 2026-11-25): work directly on `main`, no pull requests. Commit each piece of work to `main`; the owner runs `git push`.
- Every change adds or updates tests, and everything must pass locally before committing. CI runs on every push to `main`; if it fails, fixing it comes first.
- Pull requests per phase may return later (for example once the app is live); ask the owner before changing this.
- Each phase ends with a checkpoint where the owner checks the result.

## Design rules
- **Money:** `decimal` in C# and `numeric(18,2)` in PostgreSQL. Never floating-point numbers. PKR is the default currency, changeable in settings.
- **IDs and numbers:** every record has a hidden ID (GUID) plus a readable number (SO-000145, PO-000032).
- **Finished records:** posted financial records are never deleted. Corrections use reversal or adjustment entries, and the audit log records who changed what.
- **Sales orders and purchase orders are separate records with separate flows.**
  - **Sales order (SO):** what the customer buys. The salesman records the design, customisation and the **agreed selling price** per line (it can be below the catalogue price; the discount is kept), takes the advance and promises a delivery date.
  - **Purchase order (PO):** what we buy from a factory, placed **against a sales order** by the salesman (or manager). It records the factory, expected completion date and **factory cost per line**.
  - Every PO line points to the SO line it is made for. One SO can be split across several POs and factories; each SO line can be on only one active PO.
  - This links each piece's selling price to its factory cost, giving the margin per order. The SO shows "Factory ordered" once its lines are on a PO.
- **Roles:** Admin can do everything. Manager can do everything except user/settings administration, including adding designs and factories. Salesman: Sale Orders, payments, and factory orders against a Sale Order. The full table is in `docs/PLAN.md`.
- **Salesman limits (owner, 2026-11-28):** no customer list (finds a customer by full phone number on a Sale Order, or adds a new one there); never sees catalogue prices, factory costs or margins (types the agreed price); sees only their own Sale Orders and factory orders (Phase 3); their factory orders have no cost and need a Manager's approval, where the Manager enters the cost (Phase 3).
- **Customers** are created only on a Sale Order; there is no "Add customer" button.
- **Catalogue (owner, 2026-11-28):** a design has no base price; its price is the sum of the chosen items. Each category keeps an item list; each design offers some of those items with its own price and default ticks; the salesman picks items with quantities. "Other items" (mirror, lights…) are a separate price list sold without a design.
- **Wording:** customer orders are called **Sale Orders** on screen.
- **Order snapshots:** order lines save the design, specifications and price at the time of sale.
- **Order statuses:** fulfilment status and payment status are tracked separately.
- **Ledger:** business actions create balanced journal entries automatically. Factory purchases are never counted again as general expenses.
- **Branches:** `BranchId` on branch-specific tables.
- **Time:** time zone Asia/Karachi; weeks run Monday to Sunday.
- **Screen text:** all text goes through translation files (`next-intl`, `messages/en.json`), and layouts use start/end spacing so Urdu right-to-left can be added later.

## Commands
- **API:**
  - Run `cd api && dotnet test`. The tests start their own PostgreSQL through Testcontainers, so Docker must be running.
  - Then run `dotnet run --project src/SellEase.Api --launch-profile http`. The API is at http://localhost:5216.
- **API one-off commands** (add `--` after `dotnet run --project src/SellEase.Api`):
  - `migrate`: applies database changes and reference data. On a server it runs only from the manual workflow.
  - `seed-dev`: creates sample staff accounts for your own computer only. The password is in `appsettings.Development.json`.
  - `create-admin USERNAME "NAME"`: creates an Admin. The owner types the password; it is never passed as an argument.
- **Design photos:**
  - Development uses the setting `Photos:Store=Local`, which keeps the files in `api/src/SellEase.Api/local-photos/` (ignored by git).
  - Servers use `Photos:Store=S3` with DigitalOcean Spaces. The `Photos__S3__*` keys are entered by the owner in the server's `.env`.
  - The bucket stays private, and the API serves the photos.
  - Don't name a folder `data/` next to `Data/`: macOS treats them as the same folder.
- **New migration:** `cd api && dotnet ef migrations add <Name> --project src/SellEase.Api --output-dir Data/Migrations`. A test fails if you forget it.
- **Permissions:** `api/src/SellEase.Api/Auth/Permissions.cs` mirrors the "Who can do what" table in `docs/PLAN.md`. Every endpoint needs a signed-in user unless it is marked `AllowAnonymous`.
- **Web:** `cd web && npm run lint && npm test && npm run build && npm run e2e`, or `npm run dev`
- **Running the whole app locally:**
  1. Start the database.
  2. Run `cd api && dotnet run --project src/SellEase.Api -- seed-dev` once.
  3. Start the API with `dotnet run --project src/SellEase.Api --launch-profile http`.
  4. In another terminal, run `cd web && npm run dev`.
  5. Sign in at http://localhost:3000 as `admin`, `manager` or `03001234567`, with the password in `appsettings.Development.json`.
- **How the website reaches the API:** the browser calls `/api/...` on the website's own address. Next.js forwards those calls to `API_URL` (default http://localhost:5216); this address is fixed when the website is built. On the server, Caddy does the forwarding. The sign-in session is an HttpOnly cookie.
- **Browser tests (`npm run e2e`):**
  - They need the database running.
  - They build into `.next-e2e` and start their own API on port 5317 (website on 3100), with a separate `sellease_e2e` database and `local-photos-e2e/` folder.
  - They run fine alongside your own API (5216) and dev website (3000), and never touch your local data.
- **Prototype data:** Sale Orders, factory orders and finance still use `web/src/data/sample.ts` and the browser-only `web/src/lib/prototype-store.ts` until Phase 3. Customers, factories, the catalogue, staff and sign-in use the API.
- **Screen text:** all text is in `web/messages/en.json`.
- **Local database:** `docker compose -f deploy/docker-compose.dev.yml up -d` (port 5433)
- **Servers:**
  - `docs/deploy/STAGING.md` is the owner's step-by-step guide.
  - `deploy/caddy/` holds the one shared Caddy per Droplet. `deploy/app/` holds one stack per client (`docker-compose.yml`, `.env.example`, `sellease.sh`).
  - GitHub Actions are all manual: **Deploy** (build images to GHCR, then start them), **Migrate database**, and **Staging tools** (`load-demo` / `wipe-staging`, which needs `WIPE <stack>` typed in).
  - Each stack is a GitHub environment (e.g. `abc-staging`) with the secrets `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY` and `SERVER_KNOWN_HOSTS`.
  - The API refuses `load-demo` outside Development/Staging and `wipe-staging` outside Staging.
  - To add a client: add its name to the workflow `options` lists, then add a Caddy site file, an `.env`, a DNS record and a GitHub environment.
- **Next.js version:** this is Next.js 16. Read `web/AGENTS.md` and `web/node_modules/next/dist/docs/` before relying on memory.
