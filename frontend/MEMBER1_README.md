# Member 1 frontend

This implementation extends the existing shared React app. Follow the repository's graphite/yellow design specification. Existing components remain in `src/components/index.tsx`; additional shared helpers are in `src/components/client-shared.tsx`.

## Run in VS Code

Open the ServiceFlow repository, then in its terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open the URL Vite prints. Run `npm run build` in a second frontend terminal before committing. `tsconfig.json` now provides the missing TypeScript configuration.

Demo mode defaults to on. The banner labels sample data. Sign in with `nimal@example.com` and `DemoClient123!`. Changes and authentication reset when the browser reloads. Demo registration is a simulation, not an account saved to a server. Requests newly created in the demo remain NEW; the two preloaded workflows allow quotation and appointment decisions without pretending to implement manager actions.

## Routes

| Route | Purpose |
| --- | --- |
| `/`, `/companies`, `/services` | Company directory and filters |
| `/companies/:id` | Public profile, offerings, public policy and shared AI display |
| `/companies/:id/request` | Protected service request form |
| `/login`, `/register` | Login and client/company registration |
| `/account-status` | Pending/rejected company state |
| `/change-password` | Required temporary-password replacement |
| `/client` | Dashboard and decisions awaiting attention |
| `/client/requests`, `/client/requests/:id` | Request list/detail and early cancellation |
| `/client/quotations`, `/client/quotations/:id` | Quotation list/detail and approval/decline |
| `/client/jobs`, `/client/jobs/:id` | Progress, schedule approval/decline and early cancellation |
| `/client/invoices`, `/client/invoices/:id` | Read-only invoice and payment state |
| `/style-guide` | Shared components, form examples and feedback states |
| `/workspace` | Explicit integration placeholder for Member 2's operational routes |

## Code map

- `src/App.tsx`: routing, public shell, client navigation and showcase.
- `src/app/session.tsx`: in-memory authentication and frontend role routing.
- `src/features/marketplace/pages.tsx`: directory, profile, request form and policy panel integration.
- `src/features/auth/pages.tsx`: account screens.
- `src/features/client/pages.tsx`: client workflow screens.
- `src/lib/client-service.ts`: demo data/actions and backend endpoint adapter.
- `src/lib/api.ts`: one API client, bearer header, error handling and request timeout.
- `src/types/client.ts`: proposed frontend data shapes.

The API adapter is a starting contract, not verified backend integration. Frontend guards improve navigation; the backend must enforce every permission, company boundary and state transition.

## Backend handoff

Copy `.env.example` to `.env.local` and set `VITE_DEMO_MODE=false` only when real APIs are ready. Restart Vite after environment changes. `VITE_API_BASE_URL` should point to FastAPI; configure backend CORS for the frontend origin.

Agree the types in `src/types/client.ts` with Members 3 and 4 before enabling live mode. The current assumptions are:

- Login returns `{ access_token, user }`; `/auth/me` returns a User. Login currently posts JSON `{ email, password }`; adapt if the backend chooses OAuth form encoding.
- List endpoints return arrays; if paginated, unwrap the agreed envelope in client-service.ts.
- Company offerings contain IDs, active flags and numeric starting prices. All operational records are already scoped by the server to the authenticated user.
- Request fields are `company_id`, `company_service_id`, `description`, `address`, `preferred_date`. Request responses include `quotation_id` when a quote exists.
- Client quotation listing derives from accessible requests and GET `/quotations/{id}`; no unagreed list endpoint is introduced.
- Monetary values use numbers in the UI; backend Decimal strings may require normalization in the adapter. Backend totals are authoritative.
- Errors use `message` and optional `field_errors`. Record actions refresh their data only after success. Conflict/error feedback preserves entered data.
- Company policy returns null or `{ title, url }` with a controlled public PDF URL. A 404 currently displays retryable feedback; normalize it to null if that is the agreed no-policy response.
- AI returns `{ status, answer, citations }`; citations currently include a controlled `url` plus policy ID/version/title/page. If the backend uses a file reference, resolve it to an authorized URL in the adapter. No evidence is invented in demo mode.
- The existing FlowAIPanel is reused. Member 2 should evolve that shared component for interactive question/status/citation props; the company page supplies question input and citation links around it for now.
- Member 2 owns operational screens, rejected-company edit/resubmission and manager actions. Pending/rejected states link into that planned integration; those workflows are not implemented here.
- Token storage is memory-only. Reload requires login. Agree refresh/session persistence with Member 3 before extending authentication.

## Verification

Production build and TypeScript checks run in the implementation workspace. The browser test uses Playwright against the demo development server and captures desktop/mobile screenshots under `test-artifacts/`.

If Playwright is installed in your development environment:

```powershell
# Terminal 1: npm run dev
# Terminal 2:
node tests/browser-smoke.cjs
```

Set `TEST_BASE_URL` if Vite uses another port. Set `BROWSER_PATH` to an installed Chromium/Edge executable if no Playwright browser is installed. Set `PLAYWRIGHT_MODULE` if using an external Playwright installation. Playwright is not added to the shared package manifest.

The smoke test covers directory filters, protected navigation, login failure, request creation/cancellation, quote approval and resulting job, schedule approval, read-only invoices, policy fallback, keyboard dialog dismissal, company registration and 390px layout overflow. It does not prove backend permission isolation or real policy citations; those require real API integration.

## Suggested Git workflow

Review changes on your existing Member 1 branch. Commit source, `tsconfig.json`, this guide and the test script. Keep node_modules, dist, local environment files and generated screenshots out of Git unless the team deliberately stores screenshot evidence in docs.

Suggested PR title: `Member 1: public marketplace and client workflow frontend`.
Describe this as a demo-ready frontend with a proposed API adapter. Do not claim the real end-to-end service journey is integrated until Members 3 and 4 supply and verify the APIs.
