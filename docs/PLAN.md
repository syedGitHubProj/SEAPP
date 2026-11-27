# SellEase (SEAPP): design and phased plan

## Context
ABC Furniture (a showroom in Pakistan) runs on an Excel workbook (`Furniture_Store_Manager_v2.xlsm`) today. The owner has written a full brief (`sellEase_Architecture_and_Business_Requirements.docx`) and sample screens (`FurniFlow Furniture ERP Experience.png`) for **SellEase**, a web app covering:
- the design catalogue
- customer orders and advances
- factory purchase orders
- receiving and delivery
- expenses
- accounting: cash book, profit and loss, balance sheet

`~/myDesk/SEAPP` holds only those 3 files. It is not a git repository yet. The GitHub repository `syedGitHubProj/SEAPP` already exists and is empty.

**Decisions confirmed by the owner:**
- Hosting on a DigitalOcean Droplet, the same setup as PTRP.
- English now, with all text kept in translation files so Urdu (right-to-left) can be added later.
- Phase 1 is a clickable prototype that uses sample data.
- No fixed deadline.
- At go-live, a one-time import of the existing Excel data.
- The document's defaults are accepted:
  - PKR, but the currency can be changed in settings.
  - One showroom, with the database ready for more branches.
  - A double-entry ledger.
  - Payments recorded by hand (no card or bank integrations).
  - External factories only.
  - Customer and factory portals later.

## Recommended stack (and why)
| Layer | Choice | Why |
|---|---|---|
| Website | Next.js + TypeScript, Tailwind, shadcn/ui, Lucide, `next-intl` | Same as PTRP and the brief. `next-intl` keeps the app Urdu-ready. Works well on phones. |
| API | ASP.NET Core (.NET 10) REST, one app split into clear modules ("modular monolith") | Same as PTRP. One app to deploy keeps costs and effort low. |
| Database | PostgreSQL + EF Core | The ledger and money figures need proper transactions. Uses `numeric(18,2)`, never floating-point numbers. |
| Sign-in | ASP.NET Core Identity: username or phone number + password. Admin creates staff accounts; no self sign-up. | Showroom staff may not have email addresses. Permissions are checked per action, as the brief requires. |
| Photos and invoices | DigitalOcean Spaces (S3-compatible); MinIO locally | Cheap. Design photos and factory-invoice photos stay out of the database. |
| Reports | QuestPDF (PDF), ClosedXML (Excel) | Free, server-side, no Office needed. Also reads the `.xlsm` for the import. |
| Deploy | Docker Compose + Caddy (automatic HTTPS) on one Droplet; GitHub Actions | The same proven route as PTRP. |
| Tests | API: xUnit + Testcontainers (real PostgreSQL). Web: Vitest + Playwright at phone and desktop widths. | |

## Running cost (approximate)
- **Database: free.** PostgreSQL is free, open-source software. It runs in Docker on the same Droplet as the app, exactly like PTRP, with no licence and no separate bill. DigitalOcean's paid "Managed Database" (about US$15/month or more) is **not** used.
- **Droplet:** about US$12–24/month.
- **Spaces (photo storage):** about US$5/month.
- **Domain:** about US$15–20/year.
- **All other software in the stack** (.NET, Next.js, Caddy, QuestPDF Community, ClosedXML, GitHub Actions on the free tier) is free.

## Domain and hosting layout (owner-confirmed 2026-11-26)
The owner registered **selease.com**. The domain is spelled with one "L", while the app's name ("SellEase") has two. The owner confirmed this spelling is intended.

**Each furniture client gets its own subdomain:**
- **ABC Furniture:** `abc.selease.com`. Its staging copy is at `abc-staging.selease.com`.
- **A second client:** `xyz.selease.com`, with staging at `xyz-staging.selease.com`.
- Each client runs a **separate copy of the same app**:
  - its own Docker containers
  - its own `.env` settings file
  - its own **PostgreSQL database**

  Because of this, one client can never see another's data, and each client is backed up and restored on its own. The app is designed for one business (`BranchId` covers branches within that business), so no tenant code is needed.
- Staging names use a dash (`abc-staging`) rather than a dot (`staging.abc`), so that one wildcard record covers them all.

**DNS:**
- One wildcard **A record**: `*.selease.com` → the production Droplet's IP address.
- Each staging name points to the staging Droplet with its own A record.

**Sharing Droplets:**
- **One shared Caddy per Droplet.** Only one program can use the web ports (80/443). Caddy sends each address to the right app and gets HTTPS certificates automatically.
- **Staging Droplet:** shared by every app's staging copy (SellEase clients and, if the owner wants, PTRP). If PTRP's Caddy is currently inside PTRP's own setup, it moves into the shared Caddy; that change is made in the PTRP project, not here. Staging holds only test data.
- **Production Droplet:** shared by the SellEase clients' live copies while they are small. It is kept separate from staging. A client moves to its own Droplet once it grows or if it needs to be kept separate.
- **Size:** each app (API, website and database) uses roughly 1–1.5 GB of memory. A **4 GB Droplet (about US$24/month)** holds 2–3 apps; 2 GB is too small.
- **Trade-off:** apps on a shared Droplet go down together if the server has a problem. That is acceptable for staging. For production it is acceptable while clients are small.

**When it is set up:**
- Phase 2: staging for ABC.
- Phase 5: ABC's production.

Each new client later means a new `.env`, a new database, one Caddy entry and, for staging, one DNS record. The owner enters the secrets and DNS records by hand, following step-by-step instructions.

## Key design rules (apply in every phase)
- **IDs and numbers:** every record has a hidden permanent ID plus a readable number (SO-000145, PO-000032, INV-…).
- **No deleting finished records:** posted money records are corrected with reversal or adjustment entries, never deleted. An audit log records who changed what and when.
- **Sales orders and purchase orders are separate records with separate flows.**
  - **Sales order (SO):** what the customer buys. The salesman records the design, customisation and the **agreed selling price** per line (it can be below the catalogue price; the discount is kept), takes the advance and promises a delivery date.
  - **Purchase order (PO):** what we buy from a factory, placed **against a sales order** by the salesman (or manager). It records the factory, expected completion date and **factory cost per line**.
  - Every PO line points to the SO line it is made for. One SO can be split across several POs and factories; each SO line can be on only one active PO.
  - This links each piece's selling price to its factory cost, giving the margin per order. The SO shows "Factory ordered" once its lines are on a PO.
- **Order snapshots:** each order line saves the design, specifications and price at the moment of sale, so later catalogue edits don't change old orders.
- **Two separate statuses on each order:**
  - Fulfilment: Draft → Confirmed → Factory Ordered → In Production → Received → Ready for Delivery → Delivered → Closed, or Cancelled.
  - Payment: unpaid / partial / paid / refunded, tracked independently of fulfilment.
- **Every business action creates its ledger entries automatically**, for example:
  - advance received = Cash/Bank ↑ and Customer Advances (a liability) ↑
  - delivery = revenue and cost of goods recognised
  - factory invoice = Supplier Payable ↑

  Factory purchases are never counted again as general expenses.
- **Branches:** every relevant table has a `BranchId`, with one branch for now.
- **Time and weeks:** time zone Asia/Karachi; weeks run Monday to Sunday.
- **Languages:** all screen text comes from `messages/en.json`, and the layout uses start/end spacing so right-to-left works later.
- **Database migrations on the server are never automatic.** They run only from a GitHub Actions workflow that the owner starts by hand, as on PTRP.

## Who can do what (owner-confirmed 2026-11-25)
| Action | Salesman | Manager | Admin |
|---|:-:|:-:|:-:|
| View catalogue | ✓ | ✓ | ✓ |
| Add / edit designs, prices, photos | | ✓ | ✓ |
| Add / edit customers | ✓ | ✓ | ✓ |
| Create Sale Orders, take advances and payments | ✓ | ✓ | ✓ |
| Create factory (purchase) orders against a Sale Order | ✓ | ✓ | ✓ |
| Add / edit factories | | ✓ | ✓ |
| Receiving, deliveries, expense approval, cash book, reports | | ✓ | ✓ |
| Users, roles, settings, audit log, financial corrections | | | ✓ |

Admin has full access to everything. Workers and skilled workers only see the receiving and delivery tasks assigned to them (Phase 3).
On screens, a customer's order is called a **Sale Order**.

## Repository layout
```
SEAPP/
  api/            SellEase.Api (.NET), Modules/{Identity,Catalog,Sales,Purchasing,Fulfilment,Finance,Admin}, tests/
  web/            Next.js app (app/, components/, messages/en.json, tests/)
  deploy/         docker-compose.yml, Caddyfile, backup script
  docs/brief/     the requirements .docx and the sample-screens .png (moved here, not deleted)
  .github/workflows/  ci.yml, deploy.yml, migrate.yml (manual)
  CLAUDE.md, README.md, .gitignore
```
`.gitignore` excludes:
- the `.xlsm` file (it may hold real customer data); it stays on the laptop only
- `.env*` files
- `.claude/settings.local.json`

## Phases (each ends with a checkpoint for the owner)
Work is committed directly to `main` for now, with no pull requests (owner's decision, 2026-11-25). Each phase is still tested and checked before the next starts. Phases 3 and 4 are large, so they'll be done in 2–3 smaller steps.

**Phase 0: Project setup** (done)
- Run `git init`.
- Add the README, CLAUDE.md, `.gitignore` and the folder skeleton.
- Add a local `docker-compose` with PostgreSQL and MinIO.
- Add a CI workflow that builds and tests both apps.
- Set up project memory notes.

*Checkpoint:* the owner pushes, and CI is green on GitHub.

**Phase 1: Clickable prototype** (built; waiting for staff feedback)
- Next.js screens with sample data stored in TypeScript files. There is no API yet.
- Green theme, sidebar on desktop, bottom tabs on phones.
- Salesman phone flow: home → catalogue → customise (with agreed price) → new sales order → receive advance → confirmation → create factory (purchase) order against it.
- Sales order detail page showing each line's factory order and cost.
- Desktop new-order wizard.
- Manager dashboard and admin dashboard.
- Lists for factory orders, receiving, deliveries and expenses.
- Sample cash book and profit-and-loss pages.
- A role switcher, so each person's view can be shown.

*Tests:* Playwright smoke tests at 375px and desktop widths, plus Vitest tests for the order-total and balance calculations.

*Checkpoint:* the owner and ABC staff try it on a laptop or phone and give feedback. Optional: put it on the Droplet at a staging address.

**Phase 2: Core API, data and sign-in**
- .NET solution and EF Core schema.
- Identity, roles and per-action permissions.
- Audit log, number sequences, settings (currency, branch).
- Customers (all roles), designs and accessories (Manager/Admin) with photo upload to Spaces, and factories (Manager/Admin).
- Connect the web sign-in, customers and catalogue to the real API.
- Docker images, Caddy, `deploy.yml`, and the manual `migrate.yml`.

*Tests:* integration tests on a real PostgreSQL for permissions, customers and catalogue.

*Built in steps*, each committed to `main` with its tests:
- **2a. Foundation (done):**
  - database and first migration
  - sign-in with username or phone number, roles and permissions
  - the Admin's staff accounts
  - audit log, number sequences (SO-000145) and settings (currency, branch)
- **2b. Records (done):** customers (all roles), factories, and designs with accessories (Manager/Admin), each with an audit trail.
- **2c. Photos (done):** design photos are stored on the computer during development and in DigitalOcean Spaces on the server.
- **2d. Website on real data (done):**
  - a sign-in page
  - the customers, factories and catalogue pages read from and save to the API
  - the role switcher is replaced by the real signed-in user
- **2e. Going online (built; waiting for the owner's server setup, see `docs/deploy/STAGING.md`):**
  - Docker images, Caddy, and `deploy.yml`
  - the manual `migrate.yml`
  - a step-by-step guide for the owner to set up the Droplet, DNS and secrets

*Checkpoint:* the owner creates the Droplet, the Spaces bucket and the GitHub secrets (step-by-step guide provided). Staging goes live with real sign-in.

**Phase 3: Operations** (in steps: sales orders and payments / factory purchasing and receiving / delivery)
- Sales orders (with line snapshots, agreed prices and both statuses).
- Advances and balance collections.
- Cancellations and refunds with a reason and approval.
- Purchase orders to factories, created against a sales order; each PO line linked to a sales-order line, with factory cost. Production tracking.
- Goods receipt with inspection notes and a photo of the factory invoice.
- Delivery scheduling, worker assignments, proof of delivery.
- Role-specific dashboards connected to real data.

*Tests:* status-change rules, payment calculations, and permission checks for each action.

*Checkpoint:* ABC staff run a few real-looking orders from start to finish on staging.

**Phase 4: Finance** (in steps: ledger, expenses and payments / reports and exports)
- Chart of accounts and automatic journal entries from every Phase 3 action.
- Expenses with categories and manager approval.
- Factory payments and the amount still owed to each supplier.
- Daily cash book with cash, bank and card kept separate, and end-of-day reconciliation.
- Reports:
  - sales, purchases
  - receivables (what customers still owe) and payables (what is owed to factories)
  - profit per order
  - profit and loss, balance sheet
  - for any week, month, year or custom dates
- PDF customer invoices; PDF and Excel exports.

*Tests:* the ledger always balances (debits = credits), and the brief's worked examples are reproduced exactly: order profit 48,000; closing cash 178,000; net operating profit 300,000.

*Checkpoint:* the owner or accountant checks the reports against hand calculations.

**Phase 5: Go-live**
- One-time Excel import from the `.xlsm`: customers, suppliers, orders, items and purchases. It runs a dry run first and shows a report before anything is written.
- Opening balances.
- Nightly `pg_dump` backup to Spaces, with a tested restore.
- Uptime monitoring.
- Security review.
- Production address `abc.selease.com` (see "Domain and hosting layout").
- A short user guide for each role.

*Checkpoint:* the owner approves the import result. Staff training, then switch-over from Excel.

## What the owner does by hand (never handled by Claude)
- `git push` to GitHub (the exact command is given each time).
- Creating the Droplet, the Spaces bucket and the domain, and entering every password and key directly into GitHub Secrets or the server's `.env`.
- Starting the database-migration workflow in GitHub Actions.

## Verification (every phase)
- Run `dotnet test` and the web tests (`npm test`, Playwright) locally; CI must be green after each push to `main`.
- A manual walkthrough at phone width and desktop width in the browser.
- From Phase 2 on: deploy to staging, run the migration by hand, and smoke-test the main flow of that phase.

## First phase to build
**Phase 0 (setup), then straight on to Phase 1 (clickable prototype).**
