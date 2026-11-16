============================================
SERVICEFLOW — MEMBER 2 PROGRESS
============================================
Member   : Amishka
Branch   : member2_amishka
Scope    : Provider, Company Manager, Employee, Admin frontends
Status   : All backend-supported features COMPLETE

============================================
1. FOUNDATION (P0) — DONE
============================================
[x] Shared api.ts client (Member 1's, not duplicated)
[x] Token saved in localStorage (survives F5 refresh)
[x] /auth/me called on app load to restore session
[x] Role guards on all manager/employee/admin routes
[x] company_status routing (PENDING/REJECTED → pending-verification)
[x] Forced password change for temp passwords
[x] Error handling: 401/404/409/422
[x] apiUpload helper for multipart
[x] apiBlob helper for file downloads

.env final state:
  VITE_API_BASE_URL=http://localhost:8000
  VITE_DEMO_MODE=false
  VITE_USE_LIVE_API=true
  VITE_DEV_BYPASS_AUTH=false

============================================
2. MANAGER WORKSPACE — DONE
============================================
Dashboard
  - New/under-review/needs-info request counts
  - Quotations sent count
  - Jobs: in progress / scheduled / unscheduled / completed
  - Outstanding + collected amounts
  - Recent requests preview
  - Quick actions
  - Real data from /requests, /jobs, /invoices

Requests Inbox
  - Status filter (6 statuses)
  - Detail modal
  - Conversation thread (list + send)
  - Attachments list + download
  - Actions: Start review / Ask info / Reject
  - Navigate to Quotation Builder

Pipeline (Kanban)
  - 8 columns by workflow stage
  - Requests + jobs in single view
  - Click-through to Requests or Jobs

Schedule
  - 3 tabs (Needs / Awaiting client / Confirmed)
  - Assign employee
  - Reassign employee
  - Propose schedule (date + time)
  - Backend 409 feedback shown

Quotation Builder
  - Line items (add/remove, auto total)
  - Validity date/time
  - Optional downpayment + note
  - Save draft / Send to client
  - Sent view with status

Invoices & Payments
  - Summary cards (Outstanding / Collected / Billed)
  - Invoice list with status
  - Detail modal with payment history
  - Record partial payment (4 methods)
  - Overpayment validation
  - PDF download

My Business (5 tabs)
  - Services: catalog picker, price, description, active toggle
  - Service Areas: add/remove (409 duplicate handled)
  - Working Hours: 7-day editor with is_closed
  - Policies: upload, list, download, activate, delete
  - Settings: business name, description, phone, address

Workers / Team
  - Employee list with status
  - Create employee (one-time password reveal modal)
  - Edit employee (email, ACTIVE/INACTIVE)

Jobs
  - Status filter list
  - Cancel job (with reason)
  - Report issue on completed job (creates dispute)

Disputes
  - Provider's own disputes list
  - Status badges + admin notes
  - Closed date shown

Flow AI
  - Placeholder only (Member 4 not built yet)

============================================
3. EMPLOYEE WORKSPACE — DONE
============================================
My Day (5 tabs)
  - Today: today's jobs
  - Upcoming: future confirmed jobs
  - History: completed jobs
  - Profile: edit name + phone
  - Skills: add/remove skills

Job Detail
  - Start job (backend validates schedule confirmed)
  - Complete job (auto-creates invoice)
  - Work log: note, material, photo
  - Photo download
  - Cannot start before schedule is confirmed

============================================
4. ADMIN WORKSPACE — DONE
============================================
Dashboard
  - Provider count + pending count
  - Active services count
  - Open / resolved / total disputes
  - Quick actions

Verification Queue
  - Provider list with status + type filter
  - Approve / Reject / Suspend
  - Success + error feedback

Service Catalog
  - List with active/inactive counts
  - Create / Edit / Deactivate / Reactivate

All Requests & Jobs
  - Two tabs, platform-wide view
  - Status filters
  - Link to Disputes

Disputes
  - Filterable list
  - Update status (OPEN → UNDER_REVIEW → RESOLVED/CLOSED)
  - Admin note

Admin Settings
  - Placeholder (backend endpoint missing)

============================================
5. NOTIFICATIONS — DONE
============================================
  - Bell icon in header (all 3 roles)
  - Unread badge (30s polling)
  - Dropdown panel
  - Unread-only toggle
  - Mark one / Mark all read
  - Click outside + Escape close

============================================
6. FILES CREATED
============================================
  - lib/provider-service.ts         (~40 methods)
  - lib/employee-service.ts         (~8 methods)
  - types/provider.ts               (~25 types)
  - components/NotificationBell.tsx
  - features/manager/MyBusiness.tsx
  - features/manager/Pipeline.tsx
  - features/manager/Disputes.tsx
  - features/admin/Dashboard.tsx
  - features/admin/Disputes.tsx
  - features/admin/AllRequestsJobs.tsx

============================================
7. FILES MODIFIED
============================================
  - lib/api.ts                      (localStorage token, apiUpload, apiBlob)
  - app/session.tsx                 (/auth/me bootstrap)
  - App.tsx                         (role guards, routes, Flow AI placeholder)
  - components/index.tsx            (nav arrays for 4 roles)
  - components/client-shared.tsx    (19 status mappings)
  - features/manager/Dashboard.tsx
  - features/manager/Requests.tsx
  - features/manager/Schedule.tsx
  - features/manager/Jobs.tsx
  - features/manager/QuoteBuilder.tsx
  - features/manager/Invoices.tsx
  - features/manager/Team.tsx
  - features/employee/Jobs.tsx
  - features/employee/JobDetail.tsx
  - features/admin/Companies.tsx
  - features/admin/Catalog.tsx

============================================
8. API COVERAGE
============================================
45+ of 89 backend endpoints integrated.

  Auth                5
  Provider profile    2
  Offerings           3
  Service areas       3
  Working hours       2
  Policies            5
  Requests            6
  Messages            2
  Attachments         2
  Quotations          3
  Jobs                6
  Employees (mgr)     3
  Invoices            5
  Disputes            3
  Admin providers     5
  Admin services      4
  Admin disputes      2
  Notifications       4

Error codes handled: 401, 404, 409, 422

============================================
9. TESTING DONE
============================================
[x] Manual login / logout
[x] Session restore on F5
[x] Role guard redirect (client → /manager blocked)
[x] Manager request → quotation → invoice flow
[x] Employee start → complete → invoice auto-created
[x] Admin verification approve
[x] Partial payment + full payment
[x] Policy upload + download
[x] Notification bell + mark read
[x] npm run typecheck → 0 errors

[ ] npm run build         (you need to run)
[ ] Mobile test 390px     (you need to run)

============================================
10. BLOCKED (not Member 2's fault)
============================================
Blocked on Member 3 (backend endpoints missing):
  - Skills tab in My Business       → GET /providers/me/skills
  - Admin User Management           → GET /admin/users
  - Admin Global Documents          → GET /admin/documents
  - Admin Reports                   → GET /admin/reports
  - Manager viewing employee skills → GET /company/employees/{id}/skills
  - Employee availability display   → (no endpoint)
  - Admin Settings                  → GET/PUT /admin/settings

Blocked on Member 4:
  - Flow AI panel                   → POST /ai/ask-docs, /ai/ask-data

============================================
11. NEXT STEPS
============================================
1. Run: npm run build
2. Run: DevTools mobile 390px test
3. Commit + push + open PR
4. Message Member 3 with the 7 endpoint list

Member 2 backend-supported work = 100% DONE
Remaining items are other team members' dependencies
============================================