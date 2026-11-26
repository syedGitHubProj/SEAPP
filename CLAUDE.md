# SellEase — notes for Claude

SellEase is a furniture showroom app for ABC Furniture in Pakistan. It covers the catalogue, sales orders and advances, factory purchase orders, receiving and delivery, expenses, and double-entry accounting. The brief is in `docs/brief/`, and the approved phases are in `docs/PLAN.md`.

## Owner's rules (always follow)
- Never commit secrets.
- Never ask for, handle or store passwords, tokens or API keys. The owner enters them into GitHub Secrets or the server's `.env` themselves.
- Never run database migrations against a server automatically. They run only from a GitHub Actions workflow that the owner starts by hand.
- The owner pushes to GitHub and merges pull requests. Give them the exact `git push` command.
- Confirm with the owner before deleting anything.
- Never commit the owner's Excel workbook (`*.xlsm`); it may hold real customer data.
- This project is separate from the owner's other projects. Don't read or change folders outside SEAPP.
- Explain things in short, plain English, with exact steps for anything the owner must do by hand.

## How we work
- One branch and one pull request per phase (or per part of a large phase), named `phase-N-<topic>`.
- Every pull request adds tests and must pass CI.
- Each phase ends with a checkpoint where the owner checks the result.

## Design rules
- **Money:** `decimal` in C# and `numeric(18,2)` in PostgreSQL. Never floating-point numbers. PKR is the default currency, changeable in settings.
- **IDs and numbers:** every record has a hidden ID (GUID) plus a readable number (SO-000145, PO-000032).
- **Finished records:** posted financial records are never deleted. Corrections use reversal or adjustment entries, and the audit log records who changed what.
- **Order snapshots:** order lines save the design, specifications and price at the time of sale.
- **Order statuses:** fulfilment status and payment status are tracked separately.
- **Ledger:** business actions create balanced journal entries automatically. Factory purchases are never counted again as general expenses.
- **Branches:** `BranchId` on branch-specific tables.
- **Time:** time zone Asia/Karachi; weeks run Monday to Sunday.
- **Screen text:** all text goes through translation files (`next-intl`, `messages/en.json`), and layouts use start/end spacing so Urdu right-to-left can be added later.

## Commands
- **API:** `cd api && dotnet test`, then `dotnet run --project src/SellEase.Api`
- **Web:** `cd web && npm run lint && npm test && npm run build && npm run e2e`, or `npm run dev`
- **Prototype data:** sample data is in `web/src/data/sample.ts`; browser-only demo state is in `web/src/lib/prototype-store.ts`. Both are replaced by API calls from Phase 2.
- **Screen text:** all text is in `web/messages/en.json`.
- **Local database:** `docker compose -f deploy/docker-compose.dev.yml up -d` (port 5433)
- **Next.js version:** this is Next.js 16. Read `web/AGENTS.md` and `web/node_modules/next/dist/docs/` before relying on memory.
