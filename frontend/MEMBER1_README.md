# Member 1: public and client frontend

The app includes public company browsing, account screens and the client request-to-invoice interface. The redesign keeps the shared graphite/yellow palette, Sora/Inter/IBM Plex Mono fonts and existing component library.

## Run in VS Code

Open ServiceFlow, choose Terminal > New Terminal, then:

```powershell
cd frontend
npm ci
npm run dev
```

Open the URL Vite prints. Keep this terminal running. In a second frontend terminal:

```powershell
npm run typecheck
npm run build
```

Use Ctrl+Shift+G to review changes in VS Code. Work on `member1/frontend`; commit a small complete task, push the branch, and use a pull request targeting main for review.

## Demo and live modes

Demo mode defaults to on and is labelled on every screen. Use `nimal@example.com` / `DemoClient123!`, or click **Fill sample account**. Demo registration and decisions are in-memory simulations; refreshing resets all sample data and signs out. No payment or real booking occurs.

Two preloaded workflows let clients review a quotation and an appointment. Newly created sample requests remain NEW until a real manager/backend handles them. No mock manager execution controls are exposed to clients.

For live mode, copy `.env.example` to `.env.local`, set `VITE_DEMO_MODE=false` and `VITE_API_BASE_URL` to FastAPI, then restart Vite. Configure backend CORS for that frontend origin. Session tokens stay in memory; refresh requires sign-in.

## Routes and navigation

- `/` and `/companies`: directory with text search, service chips, service filter and starting-price sort. `/services` is an alias.
- `/companies/:id`: company services, contacts, public policy and shared AI display.
- `/companies/:id/request`: protected request form, preserving the chosen service through login.
- `/login`, `/register`, `/account-status`, `/change-password`: account screens.
- `/client`: dashboard with actual record counts, decisions awaiting attention and recent requests.
- `/client/requests`, `/client/quotations`, `/client/jobs`, `/client/invoices`: lists plus `/:id` details.
- `/style-guide`: shared component examples.
- `/workspace`: Member 2 integration placeholder; no operational implementation is claimed here.

Desktop navigation groups client tasks in a sidebar. Phones use an expandable menu plus bottom shortcuts. Nested records keep their parent navigation selected. Status text uses user-facing labels while API state values remain unchanged.

## Source map

- `src/App.tsx`: route declarations and shared component showcase.
- `src/components/layout/ClientShell.tsx`: public/client layout, grouped navigation and phone shortcuts.
- `src/features/marketplace/DirectoryPage.tsx`: discovery and search.
- `src/features/marketplace/pages.tsx`: company profile and request form.
- `src/features/auth/AuthPage.tsx`: registration/login forms, password visibility and demo autofill.
- `src/features/auth/pages.tsx`: company status, password change and operational placeholder.
- `src/features/client/DashboardPage.tsx`: client overview and next actions.
- `src/features/client/pages.tsx`: record lists, detail screens and decision confirmation.
- `src/styles/client.css`: scoped public/client presentation; shared operational tokens remain in `src/styles.css`.
- `src/components/index.tsx`: the team's existing shared library, including FlowAIPanel.
- `src/lib/api.ts`: API client, bearer headers, timeout and error normalization.
- `src/lib/client-service.ts`: demo logic and backend adapter.
- `src/types/client.ts`: proposed operational response types.

## Authentication handoff with Member 3

The adapter now matches the authentication code inspected on Member 3's branch:

- Client registration: POST `/auth/register` with name, email, phone and password.
- Login: POST `/auth/login` with email/password. Token-only responses are followed by authenticated GET `/auth/me`; responses already containing a user are also supported.
- Roles: CLIENT, COMPANY_MANAGER, EMPLOYEE and SYSTEM_ADMIN map to frontend role names.
- Errors: FastAPI `detail` text and validation arrays become readable messages and field errors. The planned `message` / `field_errors` format is still supported.
- The backend currently creates PENDING clients and requires ACTIVE status for login. Account activation needs a backend decision; the UI displays the real inactive-account message.

Company registration `/auth/register/company`, password change and company status metadata still need backend implementation/agreement. The current `/auth/me` schema does not expose all required company/first-login metadata. Tests using mocks verify adapter behavior; they do not prove real server/database integration.

## Operational and AI handoff

Agree the types in `src/types/client.ts` with Members 3 and 4 before disabling demo mode. List endpoints currently assume arrays; adapt pagination and Decimal strings to the agreed response shape. Backend totals and permissions are authoritative. Request responses need quotation_id when a quote exists. Quote listing derives from accessible requests and individual quote endpoints.

The company page reuses the existing FlowAIPanel; Member 2 should evolve the shared interactive component rather than duplicate it. Citations require controlled public URLs with policy ID, version and page. Demo mode returns NO_POLICY and never invents evidence. Policy upload/question endpoints, job scheduling, invoices and payments are pending backend integration.

Member 2's operational branch is intentionally not merged into this Member 1 PR. Both members changed App.tsx; integrate route modules together while preserving both public/client and operational routes. This PR updates only Member 1 screens and frontend compatibility code.

## Verification

On 3 November 2026, the locked dependencies installed and TypeScript/production build passed. Browser regression checks cover:

- Directory text search, quick service filters and price sorting.
- Protected request redirect/login, invalid login and preserved selected service.
- Request creation/cancellation; quotation approval/decline; one visible created job.
- Appointment approval/decline and early job cancellation.
- Read-only client invoices, policy fallback and keyboard dialog dismissal.
- Company demo registration and 390px overflow checks.

`tests/auth-contract.cjs` separately starts live mode against mocked API responses to check token-only login, bearer current-user lookup, role normalization, inactive-account feedback, unsupported roles, phone payload and FastAPI validation. No real backend or AI evaluation is claimed.

With Playwright available in your development environment, run the dev server and `node tests/browser-smoke.cjs`. Use TEST_BASE_URL for another port. Run `node tests/auth-contract.cjs` for adapter checks; it starts/stops a separate test server on 5181. PLAYWRIGHT_MODULE can point to an external installation; BROWSER_PATH can point to installed Edge/Chromium. These tools do not change package dependencies. Screenshots go to ignored `test-artifacts/`.

## Release status

This is a tested, demo-ready frontend with improved navigation and authentication compatibility. Remaining release work: real operational API integration, Member 2 route integration, company/account state metadata, real PDF citation access and cross-user/company permission tests against the backend. Team review is required before merging the pull request into main.
