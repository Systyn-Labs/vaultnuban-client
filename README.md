# VaultNUBAN Dashboard

**Reference client for the VaultNUBAN Dedicated Virtual Accounts platform** — a multi-tenant, role-aware operations console built for Systyn Labs' hackathon submission.

> VaultNUBAN's product is the API. This dashboard makes the primitive legible: provision accounts, watch payments reconcile, resolve suspense, and manage tenants — without touching a single API response directly.

---

## What it does

VaultNUBAN lets Nigerian fintechs issue dedicated virtual NUBAN accounts to their end-customers via a single API (backed by Nomba's payment rails). This dashboard is the operations console for that platform, covering three distinct roles with full CRUD and lifecycle management.

### Three-role architecture

| Role | Scope | Primary job |
|---|---|---|
| **Tenant Developer** | One tenant | Integrate & manage: provision accounts, manage customers & identities, read transactions/statements, manage API keys |
| **Tenant Ops** | One tenant | Day-to-day money operations: review & resolve suspense queue, update KYC tiers, read statements |
| **Platform Admin** | All tenants | Onboard tenants, view global reconciliation health, suspend misbehaving tenants, monitor cross-tenant suspense |

### Sections by role

**Developer**
- **Virtual Accounts** — Provision new NUBANs, rename labels, suspend/unsuspend, and close (irreversible terminal state with confirmation). NUBAN is always immutable.
- **Customers** — Full CRUD with identity documents (NIN/BVN), KYC tier management, soft-deactivate.
- **Transactions** — Filterable ledger (All / Credit / Debit) with `webhook` / `sweep` / `manual` source badges. Each row has a webhook payload viewer showing the exact JSON that would be posted to a relay endpoint.
- **Statements** — Chronological ledger with running balance. Real CSV export to local disk.
- **API Keys** — Create scoped keys (developer / ops / full access). Full key shown exactly once in a copy modal and never re-displayed. Revoke with confirmation.

**Ops**
- **Suspense Queue** — Unresolved inbound credits filterable by reason (`unmatched`, `closed_account`, `amount_mismatch`, `tier_limit`). Resolve modal: reassign to any active NUBAN or flag for NIP refund. Each resolution writes an audit entry.
- **Customers** — Read access + KYC tier updates (no create/delete).
- **Statements** — Same ledger view as Developer.
- **Audit Log** — Immutable per-tenant action trail showing actor, role, action, resource, and timestamp in WAT.

**Admin**
- **Global Health** — Platform-wide ledger invariant check (Σ debits = Σ credits), sweep stats, webhook success rate, open suspense total.
- **Tenants** — Full tenant list with customer/account/suspense counters. Onboard new tenant → key issued once via reveal modal. Suspend/restore kill-switch.
- **Cross-tenant Suspense** — Read-only roll-up of suspense items across all tenants for spotting systemic issues.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript + Vite 6 |
| Routing | TanStack Router v1 (manual `createRootRoute`) |
| State | Zustand v5 — `useAppStore` (UI/role/toast) + `useDataStore` (all entities + mutations) |
| Data fetching | TanStack Query v5 (wired, ready for real API integration) |
| Tables | TanStack Table v8 |
| UI primitives | Radix UI (Dialog, Select, Slot, etc.) + custom CVA components |
| Styling | Tailwind CSS v4 — custom dark design tokens |
| Typography | Inter (body) + IBM Plex Mono (amounts/NUBANs) via Google Fonts |
| Icons | Lucide React |

### Design tokens (dark theme)

```
canvas:       #0E1525   — app background
surface:      #111827   — main content bg
surface-2:    #1C2638   — card / input bg
surface-3:    #243044   — elevated surfaces
border:       #1E2D42   — default border
accent:       #4338CA   — indigo, interactive / active state
brand:        #D99A2B   — Systyn Labs amber
cream:        #F6F2E9   — Systyn Labs cream (V-mark fill)
```

### Brand

The VaultNUBAN mark is a V-shape built from two overlapping parallelograms — the same geometric two-piece language as the Systyn Labs S-mark, reinterpreted for "Vault." Indigo (`#4338CA`) is the product accent; cream and amber carry the Systyn Labs heritage.

---

## Project structure

```
src/
  components/
    layout/         AppShell, Sidebar, MobileTopBar, PageHeader, SectionLayout
    shared/         KeyRevealModal (one-time secret display)
    ui/             Button, Badge, Card, DataTable, Dialog, FilterBar, Input, Toast
  sections/
    admin/          GlobalHealth, Tenants, CrossTenantSuspense
    dev/            VirtualAccounts, Transactions, ApiKeys
    shared/         Customers, Statements       ← shared between dev + ops roles
    ops/            SuspenseQueue, AuditLog
  store/
    app.store.ts    role, section, tenant, toast
    data.store.ts   all entities + seed data + mutation methods
  router.ts         TanStack Router manual setup
  main.tsx          StrictMode + QueryClientProvider + RouterProvider
```

---

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
```

No environment variables or backend required — the dashboard runs entirely on seeded in-memory state (Zustand). This is intentional for the hackathon demo; real API integration replaces the `useDataStore` mutations with TanStack Query mutations against the VaultNUBAN REST API.

---

## Seed data

Three tenants are seeded: **Acme Fintech** (`acme`), **Bridger Pay** (`bridger`), **Nova Wallet** (`nova`). Switch tenants via the sidebar dropdown — all data (accounts, customers, transactions, suspense, keys) is scoped per tenant.

Switch roles via the three-pill tab at the top of the sidebar. Each role combination has its own default section and navigation.

---

## Demo walkthrough (judges)

1. **Multi-tenant isolation** — Admin role → Tenants table → switch tenant scope in sidebar → observe data isolation
2. **Account lifecycle** — Dev role → Virtual Accounts → Provision → Rename → Suspend → Unsuspend → Close
3. **Payment reconciliation** — Dev role → Transactions → click Webhook on any row to see the raw Nomba payload
4. **Suspense resolution** — Ops role → Suspense Queue → Resolve → choose Reassign → pick a target NUBAN
5. **KYC tier change** — Ops role → Customers → KYC tier → downgrade Tier 3 → observe balance-cap warning
6. **Global health** — Admin role → Global Health → invariant check panel (Σ debits = Σ credits ✓)
7. **Secret hygiene** — Dev role → API Keys → Create key → key shown once in copy modal → disappears after close

---

## Design decisions

**Same-API rule** — in production, every write goes through the documented VaultNUBAN REST API with tenant-scoped keys. The dashboard is a reference client, not a backdoor. No privileged DB access.

**Soft deletes only** — closing an account or deactivating a customer never destroys ledger data. Closure and deactivation are terminal status transitions that preserve the audit trail (per the API PRD).

**Role separation in the UI** — Developer and Ops views present different affordances over the same tenant data. API key scope selection makes the Developer/Ops separation-of-duties story visible without requiring two separate logins for the demo.

**No auth UI** — seeded role tokens / role switcher replaces a login screen. Auth is undifferentiated effort that doesn't score in the hackathon judging rubric; the focus is on the money operations UX.

---

## Repository

[github.com/Systyn-Labs/vaultnuban-client](https://github.com/Systyn-Labs/vaultnuban-client)

Built by Systyn Labs · Powered by Nomba
