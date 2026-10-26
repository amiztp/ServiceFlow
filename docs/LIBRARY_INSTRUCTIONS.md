# How to use the ServiceFlow component library

**For:** all four ServiceFlow team members
**Stack:** React + Vite + TypeScript + Tailwind CSS (frontend) · FastAPI + PostgreSQL (backend)
**Files you need:** `ServiceFlow_UI_Component_Library.zip` and this guide.

> **The one rule that keeps the design consistent:**
> There is **one shared copy** of the components in the team's frontend.
> Never paste your own copy of a component into your page, and never create your own
> button / badge / card styles. If a component is missing, ask Member 1 (see §8).

---

## 1. What the library is

A ready-made set of ServiceFlow components — buttons, status badges, forms, cards, tables,
sidebar navigation, and the Flow AI panel — all built in our confirmed design
(graphite `#22262B`, signal yellow `#F2C230`, Sora / Inter / IBM Plex Mono, Lucide icons).

- The ZIP's `serviceflow-ui` folder is a **demo + the component source**. It is not the finished app.
- Run its **showcase** page to see every component working, with sample data.
- The design rules behind it live in `docs/serviceflow-design-spec.md` inside the ZIP.

---

## 2. Before you start

Install **Node.js 20 or newer** (comes with npm). Check in a terminal:

```bash
node --version
npm --version
```

You do **not** need Python, FastAPI, or PostgreSQL just to view or use the components.

---

## 3. See the components (the showcase)

1. Extract `ServiceFlow_UI_Component_Library.zip`, open a terminal **inside the `serviceflow-ui` folder**
   (in VS Code: *File → Open Folder*, then *Terminal → New Terminal*).
2. Run:

```bash
npm ci
npm run dev
```

3. Open the URL Vite prints (usually `http://localhost:5173/`). Keep the terminal running; **Ctrl+C** stops it.

Other commands:

```bash
npm run typecheck   # must pass with no errors
npm run build       # must succeed before you share code
```

The showcase uses **sample data only**. Its alert popups stand in for real routes and API calls.
Study `src/demo/Showcase.tsx` — it contains a working example of every component.

> If `npm ci` says the lockfile is missing, check `package-lock.json` is in the folder;
> `npm install` will work instead.

---

## 4. Where the components live in the real app

The library is integrated into the shared frontend **once, by Member 1** — everyone else
just pulls the commit from Git. After that, the shared files are:

| File in the real frontend | What it is |
|---|---|
| `src/components/index.tsx` | All shared components (single source) |
| `src/styles.css` | Design tokens + shared classes — imported once in `src/main.tsx` |
| `tailwind.config.cjs` | Colours, fonts, radius merged from the library |

**Do not copy** the library's `src/demo` folder into the real app — it is only for learning.

If the integration has not happened yet in your copy of the repo, Member 1 follows the
installation guide §4 (copy the two files above, merge the Tailwind config, run
`npm install lucide-react` if it is missing, then typecheck + build).

---

## 5. Use a component in your page

Import what you need from the shared components file. The path is relative to your page file —
this example assumes your page is one folder below `src`:

```tsx
import { Plus } from 'lucide-react'
import { ActionButton, JobTicketCard, StatusBadge } from '../components'

export function ManagerJobsPage() {
  return (
    <main className="space-y-5 p-6">
      <h1 className="sf-display text-2xl font-bold">Jobs</h1>

      <ActionButton variant="stamp" icon={Plus} onClick={() => {
        // Put your real action here: open a form, route, or dialog.
      }}>
        Add job
      </ActionButton>

      <StatusBadge status="scheduled" />

      <JobTicketCard
        id="SF-JOB-2087"
        title="Basic inspection"
        status="scheduled"
        client="Nimal Fernando"
        schedule="Tue, 10:00–11:00"
        employee="Asha Perera"
        amount="LKR 3,000"
      />
    </main>
  )
}
```

Remember: display components do **not** save data. Your page supplies the data and the
callbacks (`onClick`, navigation, API calls).

### Component cheat sheet

| You need… | Use | Key props |
|---|---|---|
| Main action (yellow) | `ActionButton` | `variant="stamp"`, `icon`, `onClick` |
| Secondary action | `ActionButton` | `variant="stub"` |
| Destructive action | `ActionButton` | `variant="void"` |
| Icon-only button | `ActionButton` | `variant="icon"` + **required** `aria-label` |
| Status label | `StatusBadge` | `status` (see §6) |
| Text / select / notes input | `TextField`, `SelectField`, `TextAreaField` | `label`, `error`, `required` |
| Date / time input | `DateField`, `TimeField` | `label` |
| Request / quotation card | `RequestCard`, `QuotationCard` | IDs, people, amounts, `status` |
| Job / invoice card | `JobTicketCard`, `InvoiceCard` | workflow fields, `onDownload` for invoices |
| Provider / dashboard number | `ProviderCard`, `MetricCard` | data props |
| Table (desktop) + cards (mobile) | `ResponsiveTable` | `columns`, `rows` — every row needs a unique `id` |
| Role sidebar | `AppSidebar` + `roleNav` | `items={roleNav.manager}` (or your role), `activeHref`, `userName`, `subtitle`, `onNavigate` |
| Confirmation dialog | `Modal` | `open`, `onClose`, `title` |
| Nothing here yet / loading | `EmptyState`, `Skeleton` | clear `title` / `description` |
| Flow AI answer | `FlowAIPanel` | `question`, `answer`, `source`, `page` |

---

## 6. Statuses: frontend ↔ backend

`StatusBadge` accepts exactly these UI keys:

`awaiting` · `approved` · `declined` · `scheduled` · `in_progress` · `completed` · `paid` · `unpaid` · `cancelled`

Each part of the system (requests, quotations, jobs, invoices) has its **own backend states**.
Map them to the UI keys **in one shared place** — never cast a backend string directly:

```ts
import type { WorkflowStatus } from '../components'

const invoiceStatus: Record<'UNPAID' | 'PAID', WorkflowStatus> = {
  UNPAID: 'unpaid',
  PAID: 'paid',
}
```

If an unknown status arrives from the API, fix the mapping — do not invent a new badge
colour and do not silently cast the value.

**Flow AI rule:** an answer counts as complete only with a `source` document and `page`.
If the policy doesn't cover the question, `FlowAIPanel` shows the insufficient-evidence
message. Never hard-code an answer the document doesn't support.

---

## 7. Who does what

| Member | Your job with the library |
|---|---|
| **1 — design system, public & client UI** | Integrate the library once; own `styles.css`, Tailwind tokens and all shared-component changes; review visual changes before merge. |
| **2 — manager, employee, admin UI** | Build with the shared imports; pass the correct `roleNav` array for each role; add no local copies of styles. |
| **3 — auth, requests, quotations, database** | Agree API field names and the status mapping (§6) with the frontend; keep backend state names consistent. |
| **4 — jobs, scheduling, invoices, AI, deployment** | Wire components to real routes/APIs; always pass Flow AI `source` + `page`; verify the full workflow builds before deployment. |

---

## 8. Need a component that doesn't exist?

1. Check the showcase (`src/demo/Showcase.tsx`) — it may already exist under another name.
2. Ask **Member 1** to add it to the shared file, or open a pull request that changes
   `src/components/index.tsx` / `src/styles.css` centrally.
3. Never solve it by styling your own version inside your page — that's how four
   different-looking apps happen.

---

## 9. Design rules everyone follows

- Colours come from tokens only — graphite `#22262B`, signal `#F2C230`, paper `#F5F5F3`,
  border `#D9DBD6`. **Never hard-code a new hex** on a page without a reviewed design change.
- Headings Sora, body Inter, IBM Plex Mono for IDs, tags and small labels.
- Yellow **Stamp** button = the one main action; dashed **Stub** = secondary; **Void** = destructive.
- Always Lucide icon **plus** a text label. Status is never shown by colour alone.
- Prices are `LKR` with tabular numbers. Provider cards are photo-free and have **no hover lift**.
- Sample/demo content must stay labelled as sample.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| `node` / `npm` not recognised | Install Node.js 20+, reopen the terminal |
| `npm ci` fails (lockfile) | Confirm `package-lock.json` exists, or use `npm install` |
| Page has no styling | Check `styles.css` is imported in `main.tsx`, Tailwind `content` paths include `./src/**/*.{ts,tsx}`, then restart Vite |
| `lucide-react` not found | Run `npm install lucide-react` in the frontend folder |
| Component import fails | Check the relative path and that `src/components/index.tsx` exists |
| Fonts look different offline | Google Fonts needs network; system fallbacks apply offline — that's fine |
| Unknown status from API | Fix the shared mapping (§6) |
| Port 5173 busy | Use the alternate URL Vite prints |

---

## 11. Before you merge — checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Checked the page at one desktop width and one mobile width
- [ ] No new hard-coded colours or one-off component styles
- [ ] Statuses come through the shared mapping; Flow AI answers carry source + page
- [ ] Sample data is labelled as sample

*Based on the ServiceFlow Component Library Installation Guide and the confirmed design
specification v1.0 (`serviceflow-design-spec.md`).*
