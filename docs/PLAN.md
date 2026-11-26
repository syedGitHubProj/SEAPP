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

## Phases (one branch and one pull request each, with a checkpoint for the owner at the end)
Phases 3 and 4 are large, so each will likely be split into 2–3 smaller pull requests. They are still reviewed one at a time.

**Phase 0: Project setup** (`phase-0-setup`)
- Run `git init`.
- Add the README, CLAUDE.md, `.gitignore` and the folder skeleton.
- Add a local `docker-compose` with PostgreSQL and MinIO.
- Add a CI workflow that builds and tests both apps.
- Set up project memory notes.

*Checkpoint:* the owner pushes, and CI is green on GitHub.

**Phase 1: Clickable prototype** (`phase-1-prototype`)
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

**Phase 2: Core API, data and sign-in** (`phase-2-core`)
- .NET solution and EF Core schema.
- Identity, roles and per-action permissions.
- Audit log, number sequences, settings (currency, branch).
- Customers, designs and accessories, with photo upload to Spaces.
- Connect the web sign-in, customers and catalogue to the real API.
- Docker images, Caddy, `deploy.yml`, and the manual `migrate.yml`.

*Tests:* integration tests on a real PostgreSQL for permissions, customers and catalogue.

*Checkpoint:* the owner creates the Droplet, the Spaces bucket and the GitHub secrets (step-by-step guide provided). Staging goes live with real sign-in.

**Phase 3: Operations** (`phase-3-…`, split into: sales orders and payments / factory purchasing and receiving / delivery)
- Sales orders (with line snapshots, agreed prices and both statuses).
- Advances and balance collections.
- Cancellations and refunds with a reason and approval.
- Purchase orders to factories, created against a sales order; each PO line linked to a sales-order line, with factory cost. Production tracking.
- Goods receipt with inspection notes and a photo of the factory invoice.
- Delivery scheduling, worker assignments, proof of delivery.
- Role-specific dashboards connected to real data.

*Tests:* status-change rules, payment calculations, and permission checks for each action.

*Checkpoint:* ABC staff run a few real-looking orders from start to finish on staging.

**Phase 4: Finance** (`phase-4-…`, split into: ledger, expenses and payments / reports and exports)
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

**Phase 5: Go-live** (`phase-5-golive`)
- One-time Excel import from the `.xlsm`: customers, suppliers, orders, items and purchases. It runs a dry run first and shows a report before anything is written.
- Opening balances.
- Nightly `pg_dump` backup to Spaces, with a tested restore.
- Uptime monitoring.
- Security review.
- Production domain (the owner checks that SellEase.app is available).
- A short user guide for each role.

*Checkpoint:* the owner approves the import result. Staff training, then switch-over from Excel.

## What the owner does by hand (never handled by Claude)
- `git push` and merging pull requests on GitHub (the exact commands are given each time).
- Creating the Droplet, the Spaces bucket and the domain, and entering every password and key directly into GitHub Secrets or the server's `.env`.
- Starting the database-migration workflow in GitHub Actions.

## Verification (every phase)
- Run `dotnet test` and the web tests (`npm test`, Playwright) locally; CI must be green on the pull request.
- A manual walkthrough at phone width and desktop width in the browser.
- From Phase 2 on: deploy to staging, run the migration by hand, and smoke-test the main flow of that phase.

## First phase to build
**Phase 0 (setup), then straight on to Phase 1 (clickable prototype).**
