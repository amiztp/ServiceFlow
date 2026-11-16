# Member 1 public and client frontend

The owner selected the expanded 11-page document and workflow diagram on 8 November 2026. These supersede the PDF's reduced-release exclusions for email verification, password recovery, request photos/location, reviews and disputes. The folder tree in the document is a suggestion. Existing team components and conventions are retained.

## Run in VS Code

Open the ServiceFlow project and run in its terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the Local URL printed by Vite. Stop with Ctrl+C. Check changes with `npm.cmd run typecheck` and `npm.cmd run build`.

Demo mode defaults to on. Sign in with `nimal@example.com` / `DemoClient123!`, or register a sample account. A browser refresh resets sample accounts, requests, feedback and authentication. No real emails, bookings, payments or dispute notifications are sent. New sample requests stay NEW until a manager/backend supplies a quotation. The seeded records demonstrate the later workflow without giving clients manager controls.

## 11-page scope

| Page | Route | Delivered behavior |
| --- | --- | --- |
| Landing | `/` | Product introduction, service overview and navigation |
| Services/providers directory | `/services`, alias `/companies` | Search company/service/location, service filters, alphabetical or starting-price sorting |
| Provider profile | `/companies/:id` | Company services, prices, focus areas, contacts, sample completed-job totals/reviews, policy and shared Flow AI |
| Login | `/login` | API-backed login adapter, password visibility, role-based routing, preserved intended destination |
| Registration | `/register` | Client/company forms, phone, validation, sample verification step |
| Email verification | `/verify-email` | Sample single-use verification links, 15-minute expiry |
| Pending verification | `/pending-verification` | Company pending/rejected/approved states and status refresh |
| Password reset | `/password-reset` | Sample request/reset flow, single-use expiring links, password confirmation |
| Provider onboarding | `/provider-onboarding` | Account registration/email/admin-approval checklist, manager-workspace handoff |
| Client dashboard | `/client` | Overview plus Requests, Quotations, Jobs, Invoices and Profile/Settings tabs |
| Internal style guide | `/style-guide` | Existing shared components and loading, empty, error and disabled examples |

Dashboard tabs use URL query parameters such as `/client?tab=jobs&record=SF-JOB-1002`. Old `/client/jobs/:id` links redirect into the dashboard. Details remain within the selected tab. A new request is a modal and includes company/service, description, preferred date/time, address, browser/manual coordinates and up to three JPEG/PNG/WebP photos of 2 MB each. A permission failure leaves manual location entry available. Photos remain in demo memory rather than being uploaded.

Requests include expandable progress derived from current request/job/invoice records, attachments, cancellation with reason and a dispute form. Quotations display line items and support approve/decline confirmation. Jobs show progress, proposed appointment decisions, early cancellation, completed-job reviews and disputes. Invoices show server/sample totals and paid state with no client payment control. Profile changes and password changes work for sample accounts. Password changes require the current password. One review per completed job and one open dispute per record are enforced in the sample service.

Desktop uses the shared visual system and sidebar. Phones use a menu, bottom shortcuts and horizontally scrollable dashboard tabs. Shared `Tabs` supports arrow, Home and End keys. Dialogs preserve focus while typing and have scrollable content on short screens. Record loaders expose loading, errors, retries and empty states.

## Team branch review on 8 November 2026

Latest remote refs were fetched before implementation:

| Branch | Commit | Findings |
| --- | --- | --- |
| `member2_amishka` | `88a9e1b` | Manager/employee/admin screens and mock policy UI. App.tsx redirects `/` to manager and needs coordinated route integration. The policy upload/question behavior is simulated. |
| `member3` | `65eb8b1` | Auth routes and database models/migrations. Exposed registration/login/current-user/admin-test and health endpoints. Domain models do not imply implemented HTTP APIs. |
| `nadeeshan_AI_workflow` | `1277382` | PDF ingestion/retrieval and Gemini generation with chunk citations. The FastAPI app does not yet register policy/ask/job/schedule/invoice HTTP handlers. |

Teammates' branches were reviewed rather than merged wholesale. Operational routing remains Member 2's integration responsibility. `/workspace` clearly indicates its pending integration. Shared FlowAIPanel is reused by the company page and dashboard; no AI answer generator is duplicated.

## Live backend integration and limits

Set `VITE_DEMO_MODE=false` and `VITE_API_BASE_URL` in `.env.local`, restart Vite and configure backend CORS. Tokens stay in memory and a page refresh requires login.

The confirmed Member 3 adapter supports POST `/auth/register` with name/email/phone/password, POST `/auth/login`, and authenticated GET `/auth/me` after a token-only response. Uppercase backend roles are normalized. FastAPI detail strings and validation errors are shown without clearing form values. The backend currently creates PENDING clients and rejects login until ACTIVE, so the activation policy still requires backend work.

The original reduced-release operational adapter still uses the proposed `/companies`, `/requests`, `/quotations`, `/jobs`, `/invoices`, `/companies/:id/policy`, `/ai/ask-docs` and password-change contracts. These require agreement and implementation by Members 3/4 before production. Lists currently assume arrays and monetary values assume numbers. Pagination, Decimal handling, server-enforced ownership, first-login metadata and company status need real-server validation. Existing request fields are sent in live mode; the new time/coordinates/photo fields are disabled until their contract is agreed.

Expanded verification/recovery, company registration, profile editing and feedback flows deliberately have no invented live endpoints. They show an unavailable state in live mode. Sample verification/reset links are exposed for demonstration and must be replaced with server-issued tokens and actual email delivery. They are never production authentication. Completed-job totals/focus areas need public company response fields. Onboarding checks only confirmed account information and does not claim operational readiness.

AI results reuse FlowAIPanel with source/page metadata. ANSWERED responses without citations are shown as missing evidence. Citation links permit HTTP(S) only and include page anchors. Demo returns NO_POLICY and does not fabricate answers. The real AI response status/citation schema still needs agreement with Member 4.

## Source map

- `src/App.tsx` owns routes and the existing style guide.
- `src/features/marketplace/` owns landing, directory, profile, request form and client AI integration.
- `src/features/auth/` owns login/registration, verification/recovery, pending status, onboarding and forced password change.
- `src/features/client/ClientDashboardPage.tsx` coordinates tabs, record details and request modal.
- `src/features/client/pages.tsx` retains existing quotation/job/invoice decision views.
- `src/features/client/RequestTimeline.tsx`, `FeedbackForms.tsx` and `ProfileSettings.tsx` add expanded interactions.
- `src/lib/api.ts` is the single real HTTP client. `client-service.ts` is the operational adapter. `demo-account.ts` and `client-feedback.ts` isolate sample account/feedback behavior.
- `src/components/` remains the shared component source. `Tabs.tsx` is exported from the existing library. The shared Modal change stabilizes keyboard focus and adds a scrollable size limit.

## Validation

Run `node tests/member1-expanded.cjs` (also available through `node tests/browser-smoke.cjs`) with Playwright installed, or point `PLAYWRIGHT_MODULE` to an existing installation. `BROWSER_PATH` can select Edge/Chromium. The suite starts/stops Vite on 5192. It covers public discovery, protected login return, request modal with location/photo, cancellation, request timeline, quotation/schedule decisions, read-only invoice, reviews/disputes, profile, policy fallback, two-account isolation including a forbidden record URL, verification, recovery-link reuse rejection, provider onboarding, keyboard tabs/dialogs and 390px overflow. Screenshots go to ignored `test-artifacts/expanded/`.

Run `node tests/auth-contract.cjs` for live-mode tests with mocked HTTP responses on Vite port 5181. It covers token-only login, bearer `/auth/me`, roles, inactive users, field errors and preserved forms, plus rejected quotation approval staying an error. These tests do not establish that an actual backend/database workflow works.

The frontend can be demonstrated independently. Full production completion requires the missing backend contracts, real account/email/file storage, operational route integration and end-to-end authorization tests with the team.
