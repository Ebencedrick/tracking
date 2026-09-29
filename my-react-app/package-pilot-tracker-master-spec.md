# Package Pilot Tracker — Master Project Spec

> **How to use this file**: this is the single source of truth for the project — rationale,
> UX spec, database schema, exact routes, and build order all in one place. Any AI coding tool
> (Cursor, Copilot, Antigravity, Claude Code, etc.) should be given this entire file as context
> before generating code.
>
> **Sourcing note**: this project is a recreation of `packagepilottracker.com`. Only the
> homepage and `/track` page were reachable and are marked **[CONFIRMED]**. There is no
> reachable dashboard on the live site (`/admin/dashboard` redirects to the homepage; no
> `/login`, `/dashboard`, or `/account` is linked anywhere). Everything else — dashboard,
> backend, database — is a **[PROPOSED]** design for what you are building from scratch, not
> a reverse-engineering of a real system.

---

## Table of Contents
1. [Confirmed Public Site](#1-confirmed-public-site)
2. [Client Dashboard UX Spec](#2-client-dashboard-ux-spec)
3. [Locked Technical Decisions](#3-locked-technical-decisions)
4. [Data Models (MongoDB / Mongoose)](#4-data-models-mongodb--mongoose)
5. [Full Route Table — Pages](#5-full-route-table--pages)
6. [Full Route Table — API](#6-full-route-table--api)
7. [Final Directory Tree](#7-final-directory-tree)
8. [Environment Variables](#8-environment-variables)
9. [Build Order](#9-build-order)
10. [Open Items](#10-open-items)

---

## 1. Confirmed Public Site

### 1.1 Site Map [CONFIRMED]
| Route | Purpose |
|---|---|
| `/` | Marketing homepage — hero, carrier badges, service modality cards, tracking teaser |
| `/ship` | "Request Shipment" — booking form, carrier param support (`?carrier=DHL Express`, `?mode=air`) |
| `/track` | Waybill lookup — enter tracking number, get live telemetry |
| `/services` | Freight service catalogue (Air / Ocean FCL-LCL / Overland cold-chain) |
| `/about` | "Enterprise Freight" — company/enterprise info |
| `/faq` | "Global Fleet & FAQ" |
| `/contact` | Support / operations desk |
| `/policies` | Privacy Policy + Terms of Service (anchored `#terms`) |

No dashboard, customer portal, or admin route is linked anywhere in this map.

### 1.2 Shipment Booking (`/ship`) [CONFIRMED]
- Accepts query params to preselect **carrier** (`DHL Express`, `FedEx Priority`, `UPS Worldwide`, `USPS Priority`, `Maersk Intermodal`) and **mode** (`air`, `sea`, `land`).
- Implies a form: carrier select, mode select, origin/destination, package details, rate calculation ("transparent per-KG carrier rates").

### 1.3 Tracking (`/track`) [CONFIRMED]
- Single input: **Waybill Identification Number**.
- Waybill format: `PLOT-#####-XX#` (e.g. `PLOT-99420-CT4`) — prefix + 5-digit number + 3-char alphanumeric suffix.
- Auto-generated **scannable QR code** per waybill (site uses `api.qrserver.com` third-party image API).
- Advertised output: live GPS coordinates, vehicle/driver identifiers, milestone checkpoint log, customs clearance status, "4-second telemetry refresh."

### 1.4 Notifications [CONFIRMED]
- "Automated Notifications" — dispatch confirmation + delay notices, described as instant.

---

## 2. Client Dashboard UX Spec [PROPOSED]

Scoped to the **client/shipper-facing** side only (ops/admin console is a future addition).

### 2.1 User roles
1. **Shipper (client)** — books shipments, views own shipment list/history, downloads waybills/QR codes, manages saved addresses/payment.
2. **Ops / Dispatch staff** *(future)* — updates milestone checkpoints, assigns carriers/vehicles.
3. **Admin** *(future)* — manages users, rates, carriers, system telemetry.

### 2.2 Dashboard Shell Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Logo   Package Pilot          🔔(3)   Acme Corp ▾            │  ← sticky top bar
├───────────┬───────────────────────────────────────────────────┤
│ Overview  │                                                   │
│ Shipments │                (page content)                    │
│ Notifs    │                                                   │
│ Account   │                                                   │
│ [+ Ship]  │  ← primary CTA, always visible                     │
└───────────┴───────────────────────────────────────────────────┘
```
- Sidebar collapses to icon-only under 768px; top bar persists.
- Bell icon shows unread count → dropdown of 5 most recent → "View all" → Notifications screen.

### 2.3 Screen: Overview (`/dashboard`)
- **Stat cards** (4): *In Transit*, *Customs Hold*, *Delivered (7d)*, *Exceptions* — clickable, filter the Shipments list.
- **Active shipments mini-map** — Leaflet, one marker per in-transit shipment, clustered if >10.
- **Recent activity feed** — last 8 checkpoint/notification events, newest first.
- **Empty state**: "Ship your first package" CTA → `/dashboard/ship`.
- Data: `GET /api/shipments?status=in_transit,customs,exception` + `GET /api/notifications?limit=8`.

### 2.4 Screen: Shipments List (`/dashboard/shipments`)
- **Columns**: Waybill (monospace, copyable), Carrier badge, Mode icon, Origin → Destination, Status pill, ETA, Last update (relative time).
- **Filters**: status (multi-select), carrier, mode, date range — reflected in URL query params.
- **Search**: waybill code, client-side for loaded page + server search on submit.
- Row click → detail. Row hover → quick actions (copy waybill, download QR, duplicate shipment).
- **Pagination**: cursor-based (`?after=<id>`), 20/page.
- **Empty vs filtered-empty**: distinct messaging + "Clear filters."
- Data: `GET /api/shipments?status=&carrier=&mode=&from=&to=&search=&after=`.

### 2.5 Screen: Shipment Detail (`/dashboard/shipments/[waybill]`)
```
┌───────────────────────────────┬───────────────────────────┐
│  PLOT-99420-CT4        [pill] │  Live Map (Leaflet)        │
│  DHL Express Air · NYC→LHR    │  ● origin  ✈ current  ○dest│
│  ETA: 14h 22m                 │  (polls /location every 4s)│
├───────────────────────────────┤                            │
│  Milestone Timeline           │                            │
│  ✓ Booked           09:12     ├───────────────────────────-┤
│  ✓ Dispatched       11:40     │  Documents                 │
│  ● In Transit       — live —  │  📄 Invoice   📄 Customs    │
│  ○ Customs                    │  [Download all]            │
│  ○ Delivered                  ├───────────────────────────-┤
│                                │  Shipment Details          │
│                                │  Weight, Rate, Client ref  │
└───────────────────────────────┴───────────────────────────-┘
```
- Status pill colors: gray=pending, blue=in_transit, amber=customs, green=delivered, red=exception.
- Timeline ticks live as checkpoints arrive; current step pulses, future steps dimmed.
- Live map marker interpolates smoothly between polls (never jumps).
- **Exception banner** (only if `status = exception`): red banner + "Contact support" (pre-filled with waybill).
- "Share tracking link" (copies public `/track?waybill=...`), "Print waybill + QR."
- Data: `GET /api/shipments/:waybill` (initial) → `GET /api/shipments/:waybill/location` (poll) → `GET /api/shipments/:waybill/documents`.

### 2.6 Screen: Create Shipment (`/dashboard/ship`)
Multi-step wizard:
1. **Mode & Carrier** — 5 carrier cards, mode toggle (air/sea/land).
2. **Origin & Destination** — address autocomplete, live preview map.
3. **Package Details** — weight, dimensions, declared value, package count.
4. **Review & Rate** — computed per-kg rate, editable client reference/PO field.
- Draft state persisted across steps (component state, not localStorage — see §3).
- On submit: `POST /api/shipments` → waybill + QR → success screen ("Track" / "Ship another" / "Download label").
- Inline per-field validation before allowing next step.

### 2.7 Screen: Notifications (`/dashboard/notifications`)
- Chronological, grouped by day ("Today", "Yesterday", "This week"), unread bold + dot.
- Click links to the related shipment. "Mark all as read."
- Filter by type: Dispatch / Delay / Customs / Delivered.
- Data: `GET /api/notifications?...`, `PATCH /api/notifications/:id`.

### 2.8 Screen: Account & Billing (`/dashboard/account`)
- Company profile (name, billing address, tax ID).
- Saved addresses (reusable origin/destination presets).
- Users list (viewer vs. shipper roles) if account is shared.
- Invoices list, downloadable PDF per row.
- Data: `GET/PATCH /api/account`, `GET /api/account/invoices`.

### 2.9 Cross-cutting states (all screens)
- **Loading**: skeleton shapes, never a blank screen or bare spinner.
- **Error**: inline retry ("Couldn't load shipments. Retry."), never a full-page crash.
- **Auth expiry**: silent refresh if possible; else redirect to `/login` preserving return path.
- **Responsive**: sidebar → bottom tab bar under 768px (Overview / Shipments / Ship / Notifications / Account); detail screen's two columns stack to map → timeline → documents.

---

## 3. Locked Technical Decisions

| Decision | Value |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | MongoDB |
| ODM | Mongoose |
| Auth | NextAuth.js (credentials provider, JWT session) |
| Maps | Leaflet.js + OpenStreetMap tiles |
| Realtime | Polling every 4000ms (matches site's advertised "4-second refresh"); Socket.IO is a valid v2 upgrade, not required for v1 |
| QR generation | `qrcode` npm package (self-hosted, replaces third-party API) |
| Package manager | npm |

Agents: treat this table as ground truth. If a prompt conflicts with it, this table wins unless the user explicitly overrides a row.

---

## 4. Data Models (MongoDB / Mongoose)

```ts
// models/Shipment.ts
import { Schema, model, models } from "mongoose";

const CheckpointSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  eventType: { type: String, required: true }, // "booked" | "dispatched" | "in_transit" | "customs" | "delivered" | "exception"
  note: String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const ShipmentSchema = new Schema({
  waybillCode: { type: String, required: true, unique: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  carrierId: { type: Schema.Types.ObjectId, ref: "Carrier", required: true },
  mode: { type: String, enum: ["air", "sea", "land"], required: true },
  origin: { name: String, lat: Number, lng: Number },
  destination: { name: String, lat: Number, lng: Number },
  status: {
    type: String,
    enum: ["pending", "in_transit", "customs", "delivered", "exception"],
    default: "pending",
    index: true,
  },
  weightKg: Number,
  packageCount: Number,
  declaredValue: Number,
  clientReference: String,
  rate: Number,
  eta: Date,
  checkpoints: [CheckpointSchema],
}, { timestamps: true });

ShipmentSchema.index({ clientId: 1, status: 1 });

export default models.Shipment || model("Shipment", ShipmentSchema);
```

**Why checkpoints are embedded, not a separate collection**: the timeline is always read
together with the shipment (map + timeline view render together), rarely queried alone, and
won't grow unbounded (a shipment closes out and stops accumulating checkpoints). If you expect
very high-frequency raw GPS pings instead of discrete milestones, switch to a separate
`checkpoints` collection indexed on `shipmentId` so the shipment document stays small.

```ts
// models/User.ts
import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["client", "ops", "admin"], default: "client" },
  companyName: String,
  billingAddress: String,
}, { timestamps: true });

export default models.User || model("User", UserSchema);
```

```ts
// models/Carrier.ts
import { Schema, model, models } from "mongoose";

const CarrierSchema = new Schema({
  name: { type: String, required: true },   // "DHL Express"
  code: { type: String, required: true },    // "DHL"
  mode: { type: String, enum: ["air", "sea", "land"], required: true },
});

export default models.Carrier || model("Carrier", CarrierSchema);
```

```ts
// models/Notification.ts
import { Schema, model, models } from "mongoose";

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment", required: true },
  type: { type: String, enum: ["dispatch", "delay", "customs", "delivered"], required: true },
  message: { type: String, required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

export default models.Notification || model("Notification", NotificationSchema);
```

```ts
// models/Document.ts
import { Schema, model, models } from "mongoose";

const DocumentSchema = new Schema({
  shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment", required: true, index: true },
  type: { type: String, enum: ["invoice", "customs", "label"], required: true },
  fileUrl: { type: String, required: true },
}, { timestamps: true });

export default models.Document || model("Document", DocumentSchema);
```

### Waybill generation logic
```
PLOT-{5-digit sequential/random}-{2 letters}{1 digit}
e.g. PLOT-99420-CT4
```
Prefix constant per brand. Middle segment checked for uniqueness via the unique index on
`waybillCode` (catch duplicate-key error, regenerate). Suffix is a short checksum/mode code.

### Live map / telemetry logic
1. On shipment creation, store `origin` and `destination` coordinates.
2. A server-side interval (`setInterval` or `node-cron`, every 4s) computes the next point
   along a straight line or route geometry between origin and destination, proportional to
   elapsed time vs. ETA.
3. That point is `$push`ed into `shipment.checkpoints` and returned from the location endpoint.
4. Frontend polls `/api/shipments/:waybill/location` every 4s and animates the Leaflet marker
   to the new coordinate with a short CSS/JS transition (never a jump).

---

## 5. Full Route Table — Pages

| Path | File | Auth | Purpose |
|---|---|---|---|
| `/` | `app/(public)/page.tsx` | none | Marketing homepage |
| `/ship` | `app/(public)/ship/page.tsx` | none | Public booking form (guest checkout) |
| `/track` | `app/(public)/track/page.tsx` | none | Public waybill lookup |
| `/services` | `app/(public)/services/page.tsx` | none | Static service catalogue |
| `/about` | `app/(public)/about/page.tsx` | none | Static company info |
| `/faq` | `app/(public)/faq/page.tsx` | none | Static FAQ |
| `/contact` | `app/(public)/contact/page.tsx` | none | Static contact/support |
| `/policies` | `app/(public)/policies/page.tsx` | none | Static privacy/terms |
| `/login` | `app/(auth)/login/page.tsx` | none | Client login |
| `/register` | `app/(auth)/register/page.tsx` | none | Client signup |
| `/dashboard` | `app/(dashboard)/page.tsx` | client | Overview — §2.3 |
| `/dashboard/shipments` | `app/(dashboard)/shipments/page.tsx` | client | Shipments list — §2.4 |
| `/dashboard/shipments/[waybill]` | `app/(dashboard)/shipments/[waybill]/page.tsx` | client | Shipment detail — §2.5 |
| `/dashboard/ship` | `app/(dashboard)/ship/page.tsx` | client | Create shipment wizard — §2.6 |
| `/dashboard/notifications` | `app/(dashboard)/notifications/page.tsx` | client | Notifications — §2.7 |
| `/dashboard/account` | `app/(dashboard)/account/page.tsx` | client | Account/billing — §2.8 |

`(dashboard)` route group is wrapped by `app/(dashboard)/layout.tsx`, which must:
1. Check session server-side (redirect to `/login?from=<path>` if absent).
2. Render the sidebar/topbar shell described in §2.2.

---

## 6. Full Route Table — API

All routes live under `app/api/`. Every response follows this envelope, no exceptions:

```ts
// success
{ ok: true, data: <payload> }
// error
{ ok: false, error: { code: string, message: string } }
```

| Method | Path | File | Auth | Body / Query | Returns |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | `app/api/auth/register/route.ts` | none | `{ name, email, password, companyName }` | `{ userId }` |
| * | `/api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.ts` | none | NextAuth-managed | session/JWT |
| GET | `/api/shipments` | `app/api/shipments/route.ts` | client | query: `status, carrier, mode, from, to, search, after, limit` | `{ items: Shipment[], nextCursor }` |
| POST | `/api/shipments` | `app/api/shipments/route.ts` | client | see below | `{ shipment: Shipment }` |
| GET | `/api/shipments/:waybill` | `app/api/shipments/[waybill]/route.ts` | client (own) or public | — | `{ shipment: Shipment }` |
| GET | `/api/shipments/:waybill/location` | `app/api/shipments/[waybill]/location/route.ts` | public | — | `{ lat, lng, timestamp, status }` |
| POST | `/api/shipments/:waybill/checkpoint` | `app/api/shipments/[waybill]/checkpoint/route.ts` | ops/admin (future) | `{ lat, lng, eventType, note }` | `{ checkpoint }` |
| GET | `/api/shipments/:waybill/documents` | `app/api/shipments/[waybill]/documents/route.ts` | client (own) | — | `{ documents: Document[] }` |
| GET | `/api/notifications` | `app/api/notifications/route.ts` | client | query: `unreadOnly, limit, after` | `{ items: Notification[] }` |
| PATCH | `/api/notifications/:id` | `app/api/notifications/[id]/route.ts` | client (own) | `{ readAt: true }` | `{ notification }` |
| GET | `/api/account` | `app/api/account/route.ts` | client | — | `{ account }` |
| PATCH | `/api/account` | `app/api/account/route.ts` | client | partial account fields | `{ account }` |
| GET | `/api/account/invoices` | `app/api/account/invoices/route.ts` | client | — | `{ invoices: [] }` |

### `POST /api/shipments` request body (exact shape)
```ts
{
  carrierId: string,          // ObjectId of a carriers doc
  mode: "air" | "sea" | "land",
  origin: { name: string, lat: number, lng: number },
  destination: { name: string, lat: number, lng: number },
  weightKg: number,
  packageCount: number,
  declaredValue: number,
  clientReference?: string
}
```
Server derives: `waybillCode` (generated), `rate` (computed server-side — never trust a
client-submitted rate), `status: "pending"`, empty `checkpoints: []`, `eta` (computed from mode
+ distance).

---

## 7. Final Directory Tree

```
package-pilot-tracker/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── ship/page.tsx
│   │   ├── track/page.tsx
│   │   ├── services/page.tsx
│   │   ├── about/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── contact/page.tsx
│   │   └── policies/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── shipments/page.tsx
│   │   ├── shipments/[waybill]/page.tsx
│   │   ├── ship/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── account/page.tsx
│   └── api/
│       ├── auth/register/route.ts
│       ├── auth/[...nextauth]/route.ts
│       ├── shipments/route.ts
│       ├── shipments/[waybill]/route.ts
│       ├── shipments/[waybill]/location/route.ts
│       ├── shipments/[waybill]/checkpoint/route.ts
│       ├── shipments/[waybill]/documents/route.ts
│       ├── notifications/route.ts
│       ├── notifications/[id]/route.ts
│       └── account/route.ts
├── components/
│   ├── ui/                    # Button.tsx, Card.tsx, Input.tsx, Badge.tsx, Skeleton.tsx
│   ├── tracking/
│   │   ├── LiveMap.tsx        # Leaflet wrapper, polls location endpoint
│   │   ├── MilestoneTimeline.tsx
│   │   └── QrWaybill.tsx
│   └── dashboard/
│       ├── Sidebar.tsx
│       ├── Topbar.tsx
│       ├── StatCard.tsx
│       └── ShipmentTable.tsx
├── lib/
│   ├── db.ts                  # cached mongoose connection singleton
│   ├── auth.ts                # NextAuth config/options
│   ├── waybill.ts             # generate() + validate()
│   ├── telemetry.ts           # interpolate(origin, destination, progressPct)
│   ├── rate.ts                # computeRate(mode, weightKg, distanceKm)
│   └── apiResponse.ts         # ok()/err() envelope helpers
├── models/
│   ├── User.ts
│   ├── Carrier.ts
│   ├── Shipment.ts
│   ├── Notification.ts
│   └── Document.ts
├── types/
│   └── index.ts               # shared TS interfaces mirroring the models above
├── .env.local.example
└── public/
```

**Rule for agents**: do not invent alternate file names or restructure this tree. If a new
feature needs a new file, add it in the matching folder above and update this section.

---

## 8. Environment Variables

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/packagepilot
NEXTAUTH_SECRET=<random 32+ char string>
NEXTAUTH_URL=http://localhost:3000
```

---

## 9. Build Order

Follow this sequence — do not build screens before their data layer exists.

1. **Scaffold**: Next.js + TypeScript + Tailwind init. Add `.env.local` from §8.
2. **DB layer**: `lib/db.ts` connection singleton, all five `models/*.ts` files from §4.
3. **Auth**: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/register/route.ts`, `/login` and `/register` pages.
4. **Core shipment API**: `lib/waybill.ts`, `lib/rate.ts`, then `app/api/shipments/route.ts` (GET list + POST create) and `app/api/shipments/[waybill]/route.ts` (GET one).
5. **Telemetry API**: `lib/telemetry.ts`, `app/api/shipments/[waybill]/location/route.ts`, `app/api/shipments/[waybill]/checkpoint/route.ts`.
6. **Dashboard shell**: `app/(dashboard)/layout.tsx`, `components/dashboard/Sidebar.tsx`, `Topbar.tsx` — gate on session before building any page inside it.
7. **Dashboard screens**, in this order (each depends on the previous existing): Overview → Shipments List → Shipment Detail (build `LiveMap.tsx` and `MilestoneTimeline.tsx` here) → Create Shipment wizard → Notifications → Account.
8. **Public pages** (`(public)/*`) — lowest priority technically, independent of dashboard work.
9. **Polish pass**: loading skeletons, error states, empty states per §2.9 — apply last, across all screens at once.

Agents: if told to "start building," begin at step 1 and do not skip ahead to step 7 without
steps 2–6 existing and functioning.

---

## 10. Open Items

1. **Ops/Admin console** is not yet specced (roles/permissions exist in the User model, but no
   screens or routes are defined for `ops`/`admin` beyond the single checkpoint-push endpoint).
   Say the word if you want this added with the same level of detail as §2.
2. **Payments/billing processing** is referenced (invoices, saved payment methods) but no
   payment provider (Stripe, etc.) is specified yet — needed before §2.8 can be fully built.
3. If real GPS hardware/IoT integration is ever wanted instead of simulated telemetry, the
   `checkpoint` POST endpoint already supports it — the simulation in §4 is just what powers
   it in the meantime.
