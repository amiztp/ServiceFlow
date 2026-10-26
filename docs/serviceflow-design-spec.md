# ServiceFlow — Confirmed Design System Specification

**Version:** 1.0 · **Confirmed:** 26 October 2026 · **Status:** FINAL — this document is the single source of truth.
**Purpose:** Give this file to any AI (or developer) and it can reproduce the ServiceFlow design exactly.
If another document, mockup, or suggestion conflicts with this spec, **this spec wins**.

---

## 0. Quick-start prompt (paste this to an AI)

> You are designing UI for **ServiceFlow**, a service booking & job management platform.
> Follow the "ServiceFlow Design System Specification v1.0" exactly: Hi-Vis Graphite palette,
> Sora headings + Inter body + IBM Plex Mono for form/label language, Work-Order Docket design
> language (job tickets, stamps, perforations), Stamp & Stub buttons, Punched Tag status badges
> with Lucide icon + label, squared corners (4–8px), no gradients, no glassmorphism, no neon,
> no stock-photo hero images, no "Field 01" style labels, and never communicate status by colour
> alone. Prices in LKR. Sample/demo content must be labelled as sample.

---

## 1. Product context (one paragraph)

ServiceFlow is an AI-assisted service booking and job management system. Clients browse service
providers without an account, register to submit a service request, receive a quotation, approve
it, get a scheduled job/appointment, then an invoice paid **offline** (platform records payment
status only). Company-side roles: **Manager** and **Employee**; plus platform **Admin**.
**Flow AI** is an in-app assistant that answers questions **only** from a company's uploaded
public policy PDF and must cite the document + page; if the document lacks the answer, it says
evidence is insufficient instead of guessing. Example story used in all mockups: company
**BrightFix**, manager **Chamari**, employee **Asha Perera**, client **Nimal Fernando**,
basic inspection **LKR 3,000** (LKR 2,500 fee + LKR 500 call-out). Stack: React + Vite +
TypeScript + Tailwind, FastAPI, PostgreSQL + pgvector.

---

## 2. Design language — "Work-Order Docket"

The whole UI is styled like paperwork from a well-run service workshop: job tickets,
rubber stamps, perforation lines, barcodes, form labels. Five principles:

1. **Paperwork, not glass.** Flat surfaces, 1px borders, squared corners. No gradients,
   no glassmorphism, no blur effects, no neon, no soft "floating app" look.
2. **Mono is the form language.** IBM Plex Mono (uppercase, letter-spaced) is used for labels,
   stamps, badges, IDs, table headers, ticket stubs — anything that would be typed or stamped
   on a paper form.
3. **Stamps approve things.** Important confirmations appear as rotated stamp marks
   (e.g. `QUOTATION APPROVED ✓`, rotated ~−4°, double border, mono uppercase).
4. **Tickets hold jobs.** Job/request content lives in ticket cards: header, dashed
   perforation separators, a stub area with barcode + job ID (e.g. `SF-JOB-2087`) + total.
5. **Signal yellow is for action.** The yellow is spent only on primary actions, the active
   nav state, marker highlights, and the dispatch ticker — never as decoration or body text.

Signature elements: hero job-ticket card tilted **−1.2°**; rotated approval stamp; barcode made
of CSS bars with mono caption; a black dispatch **ticker** strip with scrolling mono items
separated by `///`; dot-grid hero background (`radial-gradient` dots at 22px — the only
gradient allowed, and only as a dot pattern); marker highlight behind the key word of the H1
(signal yellow, lower 38% of the text).

---

## 3. Colour tokens (canonical)

| Token | Hex | Used for |
|---|---|---|
| `--primary` (graphite) | `#22262B` | Sidebar, dark panels, footer, primary structure |
| `--primary-2` | `#2E3238` | Sidebar hover, secondary dark structure |
| `--primary-800` | `#34383F` | Dark panel inner borders/raised areas |
| `--ink` | `#17191C` | Body text on light, button borders, stamp shadow |
| `--text-2` | `#565D63` | Secondary text |
| `--signal` | `#F2C230` | Primary CTA fill, active nav, stamp accents, ticker highlights (always with `#17191C` text — 10.5:1) |
| `--signal-hover` | `#DFAC1D` | Primary CTA hover |
| `--signal-text` | `#6E5600` | Signal yellow when it must appear **as text** on light backgrounds |
| `--bg` | `#F5F5F3` | Page background (warm concrete) |
| `--surface` | `#FFFFFF` | Cards, panels |
| `--wash` | `#E9EAE7` | Muted surface, chips on light |
| `--border` | `#D9DBD6` | Card/form borders (component showcase uses `#DEE3DD`) |
| `--line` | `#E7EAE4` | Hairline separators inside cards |

### Status colours (independent of brand skin — never recoloured)

| Status | Colour | Tint bg | Rule |
|---|---|---|---|
| Completed / Approved / Paid | `#237A45` | `#E7F3EB` | Paid badge is solid green, white text |
| In progress / Scheduled | `#2563A6` | `#E8EFF8` | — |
| Declined / Rejected | `#B93832` | `#FAECEB` | Destructive hover darkens to `#9C2B25` |
| Awaiting / Unpaid (text) | `#96600B` | `#FBF0D3` | Text colour is `#96600B`; `#B86E10` may be used only as a dot/graphic |
| Cancelled | `#64748B` | — | **No tint pairing** (fails AA): use `#64748B` text on white, or white text on solid `#64748B` |
| Amber graphic accent | `#D99A2B` | — | Graphics only — never text (2.4:1) |

All text/background pairings above meet WCAG AA for their intended size. Status is **never**
shown by colour alone — always icon + text label.

---

## 4. Typography

| Role | Font | Notes |
|---|---|---|
| Headings | **Sora** (600/700) | `letter-spacing: -0.01em` |
| Body / UI | **Inter** (400/500/600) | Base 15–16px, line-height ~1.55 |
| Form language | **IBM Plex Mono** (500/600) | Uppercase, `letter-spacing: .07–.14em`, 11–12.5px — labels, badges, stamps, IDs, eyebrows, table headers, ticket stubs |

Numbers in prices/metrics/tables use `font-variant-numeric: tabular-nums`.
**No other fonts.** (Clash Display and Fraunces were tried and rejected — do not use them.)

Type scale in use: H1 44px (hero, Sora 700, tight) · H2 30px · section H2 25px · card titles
15.5–17px Sora 600 · body 15px · small/meta 13–13.5px · mono labels 11–12px.

---

## 5. Shape, spacing, elevation

- **Corner radius:** 4px default (buttons, badges, inputs, cards in app), 6px large cards,
  8px max (homepage cards). Pills only for avatars, count badges, and the search bar.
  Stamps/badges are **squared (3–4px)** — never pill-shaped.
- **Spacing rhythm:** 4/8px base; card padding 20–28px; section padding ~84px (homepage).
- **Shadows:** restrained — `0 1px 2px rgba(23,25,28,.06)` cards;
  `0 2px 8px rgba(23,25,28,.08), 0 12px 28px -12px rgba(23,25,28,.16)` raised ticket.
  The only hard shadow in the system is the Stamp button's `4px 4px 0 #17191C` offset.
- **Focus:** visible 2px outline (graphite on light, signal on dark) with 2px offset. Always.

---

## 6. Icon system — Lucide

- Library: **Lucide** only (`lucide-react` in the app; inline SVG in mockups). Stroke width 2,
  `stroke-linecap/join: round`, `fill: none`, colour = `currentColor`.
- Sizes: **13px** inside badges · **16–17px** in buttons/detail rows · **19px** sidebar ·
  never below 13px or above 20px in UI chrome.
- Icons always accompany a text label, except the single icon-only "More actions" button
  (which must have `aria-label` + tooltip) and the provider-card verified chip (§7.6).

### 6.1 Main navigation (app sidebar)

| Label | Lucide (`lucide-react`) |
|---|---|
| Dashboard | `LayoutDashboard` |
| Browse services | `Search` |
| Service categories | `Grid2X2` |
| Requests | `ClipboardList` |
| Quotations | `FileText` |
| Jobs | `BriefcaseBusiness` |
| Schedule | `CalendarDays` |
| Invoices | `Receipt` |
| Flow AI | `Sparkles` |
| Company | `Building2` |
| Team / employees | `Users` |
| Settings | `Settings` |

### 6.2 Common actions

| Action | Lucide |
|---|---|
| Add | `Plus` |
| Edit | `Pencil` |
| View details | `Eye` |
| Filter | `ListFilter` |
| Download invoice | `Download` |
| Upload policy PDF | `Upload` |
| More actions | `Ellipsis` |

### 6.3 Workflow statuses (badge icon mapping — single source in `StatusBadge`)

| Status | Lucide | Badge colours |
|---|---|---|
| Awaiting response | `Clock3` | amber tint bg, `#96600B` |
| Approved | `CircleCheck` | green tint, `#237A45` |
| Declined / failed | `CircleX` | red tint, `#B93832` |
| Scheduled | `CalendarCheck2` | blue tint, `#2563A6` |
| In progress | `Play` | blue tint, `#2563A6` |
| Completed | `CheckCheck` | green tint, `#237A45` |
| Paid | `BadgeCheck` | **solid** green bg, white text |
| Warning / unpaid | `TriangleAlert` | amber tint bg, `#96600B` |
| Cancelled | `Ban` | **solid** slate bg, white text |

### 6.4 Service details & Flow AI

| Field | Lucide |
|---|---|
| Location | `MapPin` |
| Date | `CalendarDays` |
| Time | `Clock3` |
| Price | `Banknote` |
| Client | `UserRound` |
| Assigned employee | `UserRoundCheck` |
| Ask a question | `MessageCircleQuestionMark` |
| Source document | `FileSearch` |
| AI answer / Flow AI brand mark | `Sparkles` |

---

## 7. Components

### 7.1 Buttons — "Stamp & Stub"
- **Primary = Stamp:** signal `#F2C230` fill, **2px solid ink border**, hard shadow
  `4px 4px 0 #17191C`. Hover: shadow shrinks to `2px 2px` and button shifts (2px, 2px) —
  a physical press. Active: shadow 0, shift (4px, 4px). Dark text `#17191C`, Sora/Inter 600.
- **Secondary = Stub:** white/transparent, **2px dashed** ink-40% border. Hover: border becomes
  solid ink + pale signal wash `#FBF3D3`.
- **Destructive = Void Stamp:** transparent, 2px solid `#B93832`, red text; hover fills solid
  red with white text (an empty stamp being inked). In the app it is used rarely (Reject).
- **Icon-only:** square Stub, 40px, icon 18px, requires `aria-label` + tooltip.
- **Disabled:** flat light-grey fill, muted text, **no shadow, no border contrast, no press**.
- Sizes: default 44px height (12px 20px padding), small 36px. Radius 4px (homepage 6px ok).
- Buttons may carry a leading Lucide icon (16–17px, 8px gap).

### 7.2 Status badges — "Punched Tags"
Flat paper-tag look: **no shadow, no press effect, no thick border, NO dot/eyelet.**
1px outline = the status colour mixed at 42% (`color-mix`), tint background (§3), radius 3px,
padding 3px 10px, **IBM Plex Mono uppercase 11px, letter-spacing .07em**, Lucide icon 13px +
label, 6px gap. Paid and Cancelled are solid-filled with white text. Used identically in
tables, cards, dashboards, and the homepage hero ticket (e.g. `SCHEDULED`, `UNPAID` tags).

### 7.3 App sidebar (`AppSidebar`)
Graphite `#22262B`, 248px. Logo row: signal square chip "SF" (mono) + "ServiceFlow" (Sora 700,
white). Links: icon 19px + label, `#C9CDD2` text; hover `#2E3238` bg + white text; **active =
solid signal block, ink text, weight 600**. Optional count pill (red `#B93832`, mono 11px;
on the active item it inverts to ink bg/signal text). Footer: user block over a dashed
white-22% top border — initials avatar (dark circle, signal mono initials), name (white 13.5px),
role · company (grey 12px). On mobile the sidebar collapses (top bar / wrapped row).

### 7.4 Public top navigation (homepage)
Light bar, sticky, white-88% + blur, 1px bottom border. Logo = graphite square with white
flow-node SVG + Sora wordmark with signal node dot. Links Inter 500; hover = graphite pill
wash. Right side: "Log in" (ghost), "Join as a Provider" (Stamp primary). Mobile: hamburger →
slide-down panel. (A dashed "tear-line" nav variant was designed and **rejected** — do not use.)

### 7.5 Cards
- **Request / Job card (ticket):** white, 1px border, header row (title + ID stamp chip —
  mono, thin border, rotated +1.5°), dashed perforation footer, Punched Tag status.
- **Invoice card:** line rows + total in mono tabular; status tag (Paid solid / Unpaid amber).
- **Metric card:** mono uppercase label, Sora 700 value (tabular-nums), small delta text.
- **Provider card:** initials monogram block (graphite, Sora initials — **no photos**),
  name + verified chip (§7.6), type tag, rating stars in dark-signal `#6E5600`, jobs count,
  "from LKR …" price, View Profile (Stamp small). **Provider cards have NO hover effect**
  (no lift, no border change) — buttons inside keep their own press.

### 7.6 Verified chip (provider cards)
Icon-only: 26×26px graphite square, radius 4px, white shield-check SVG 15px.
The word "Verified" is **not** displayed; keep `title="Verified provider"`, `role="img"`,
`aria-label`, and visually-hidden text for screen readers.

### 7.7 Forms
Labels: Inter 500 13.5px (mono uppercase for docket-styled forms). Inputs: 44px height,
1px border `#D9DBD6`, radius 4px (6px homepage), white bg; focus = graphite border + soft
ring. Validation error = red border + red 13px message with icon; required marks shown.
Selects and date/time fields match input styling exactly.

### 7.8 Tables
Desktop: mono uppercase 11.5px headers (`#565D63`), row separators 1px `--line`, status =
Punched Tag, row actions = icon buttons. Mobile: the same data becomes stacked cards —
never a horizontally-scrolling table.

### 7.9 Modal, empty & loading states
- **Modal:** white card, radius 6px, graphite overlay 45%; destructive confirmations use the
  Void Stamp button; reject flows require a reason (textarea, validated).
- **Empty state:** dashed-border box, mono headline, one Stamp CTA.
- **Loading:** spinner (graphite) + pulsing skeleton bars — **no shimmer gradients**.

### 7.10 Flow AI panel (`FlowAIPanel`)
White card; header = `Sparkles` in signal-text + "Flow AI" (Sora 700). Question row:
`MessageCircleQuestionMark` + question in a tinted box. Answer row: `Sparkles` + answer text.
**Every answer ends with a source chip:** `FileSearch` icon + mono text
`Source: <Document> · Page N`. No-answer state: the panel states the policy document doesn't
cover the question ("insufficient evidence") — it never invents an answer.

### 7.11 Dispatch ticker & stamps (homepage signatures)
Ticker: black `#17191C` strip, mono uppercase items in ivory, key words in signal, separated
by `///`, slow linear scroll (pause on hover, respect `prefers-reduced-motion`).
Approval stamp: mono uppercase, double border (2px outer + inner offset), rotated −4°,
graphite or green ink at 85% opacity.

---

## 8. Layout & responsive

- Content max-width 1160–1180px, page padding 24px.
- Hero: two columns (1.05fr / .95fr) — copy+search left, job ticket right (tilted −1.2°,
  straightens on hover). Stacks to one column ≤1020px.
- Breakpoints: 1020px (hero/sidebar stack), 860px (nav → hamburger, grids → 2 col),
  560px (1 col, H1 32px).
- The homepage is **photo-free**: no hero photograph (one was tried and removed by decision).
  Imagery = monograms, icons, CSS barcode, dot grid only.

---

## 9. Content rules

- Currency always **LKR** with tabular numbers (e.g. `LKR 3,000`).
- Sample/demo content is **labelled** ("Sample preview", "sample photo", demo names) —
  never present invented providers, reviews, or statistics as real.
- No exaggerated claims ("best in the country", "guaranteed lowest price", "100% trusted").
- Tone: helpful, confident, plain. Button labels are verbs (`Find Providers`, `Approve quotation`).
- Statuses use the exact words of §6.3 — the same word in badge, table, and backend state.

---

## 10. Hard rules — never do these

1. **No dot/eyelet on status badges.** Badges = icon + label only.
2. **No hover effect on provider cards.**
3. **No "Field 01 / Form SF-01" style labels** or numbered section prefixes anywhere.
4. **No Clash Display, no Fraunces** — Sora + Inter + IBM Plex Mono only.
5. **No hero photos / stock imagery** on the homepage; no photos on provider cards (monograms).
6. **No gradients** (except the dot-grid pattern), glassmorphism, neon, or pill-shaped badges.
7. **No status by colour alone** — icon + text always; **no tint background for Cancelled**.
8. **No signal yellow as text** on light backgrounds — use `#6E5600`.
9. **No invented numbers/claims** in copy; sample content stays labelled.
10. Do not recolour status tokens to match a brand skin — they are fixed (§3).

---

## 11. Reference files (living examples)

| File | Contents |
|---|---|
| `serviceflow-home.html` | Public homepage — docket design, Stamp & Stub, hero ticket, ticker |
| `serviceflow-component-showcase.html` | Web component library — buttons, forms, badges, cards, table, modal, Flow AI, dashboard previews (**palette source of truth**) |
| `serviceflow-app-components.html` | App components from the Lucide table — sidebar, action buttons, workflow badges, detail ticket, Flow AI |
| `serviceflow-docket-buttons.html` | Stamp & Stub button specification (adopted) |

React component names: `AppSidebar`, `ActionButton` (variants: stamp / stub / void / icon),
`StatusBadge` (maps backend state → icon + colour centrally), `DetailRow`, `JobTicketCard`,
`ProviderCard`, `FlowAIPanel`, `Modal`, `EmptyState`, `Skeleton`. Design tokens are owned by
one team member and imported — never hard-code hex values in components.
