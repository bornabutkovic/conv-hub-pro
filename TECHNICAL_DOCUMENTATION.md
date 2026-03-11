# Conwayo Admin Panel — Technical Documentation

> **Project:** Conwayo (congressOS)  
> **Supabase Project ID:** `yqusqfdaikkvvjflgmmh`  
> **Stack:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Supabase + TanStack Query  
> **Last Updated:** 2026-03-11

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Pages & Features](#3-pages--features)
4. [Data Flow & Supabase Integration](#4-data-flow--supabase-integration)
5. [Database Schema & Table Usage](#5-database-schema--table-usage)
6. [Business Central (ERP) Integration](#6-business-central-erp-integration)
7. [Invoice & Payment Management](#7-invoice--payment-management)
8. [External Integrations (n8n / Webhooks)](#8-external-integrations-n8n--webhooks)
9. [Pending / Missing Features](#9-pending--missing-features)
10. [File Structure Reference](#10-file-structure-reference)

---

## 1. Architecture Overview

Conwayo is a **multi-tenant B2B event management platform** with a deep purple design system. The frontend is a React SPA that communicates exclusively with Supabase (PostgreSQL + Auth + Edge Functions + Storage).

### Multi-Tenancy Model
- **Tenant = Institution** (`institutions` table)
- All data scoped via `institution_uuid` foreign key
- Row-Level Security (RLS) enforces isolation at the database level
- Admin roles bypass tenant scoping via `is_admin_user()` security definer function

### Key Architectural Patterns
- **State Management:** TanStack Query for server state, React Context for auth
- **Routing:** React Router v6 with two route guards (`ProtectedRoute`, `AdminRoute`)
- **Role Helpers:** Centralized in `src/lib/roles.ts` — `isAdmin()`, `isElevatedRole()`, `getRoleDisplayName()`
- **Form Handling:** react-hook-form + Zod validation
- **Notifications:** Sonner toasts + shadcn toast system

---

## 2. Authentication & Authorization

### Auth Flow

```
/auth (login only, no self-registration)
  ↓ signInWithPassword()
  ↓ AuthContext fetches profile from `profiles` table
  ↓ ProtectedRoute evaluates:
     1. loading || profileLoading → spinner (no redirects)
     2. no user → /auth
     3. isAdmin(role) → ALLOW (bypass institution check)
     4. no institution_uuid → /pending-approval
     5. else → ALLOW
```

### Files
| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Manages session, profile fetch, signIn/signUp/signOut. Uses `fetchIdRef` to prevent stale profile race conditions. |
| `src/components/ProtectedRoute.tsx` | Guards all authenticated routes. Waits for both `loading` AND `profileLoading` before any redirect. |
| `src/components/AdminRoute.tsx` | Guards `/admin/*` routes. Only `admin` or `super_admin` roles allowed. |
| `src/lib/roles.ts` | `isAdmin()`, `isElevatedRole()`, `getRoleDisplayName()` |
| `src/pages/Auth.tsx` | Login-only page (no signup form). "Forgot password" tells user to contact admin. |
| `src/pages/PendingApproval.tsx` | Waiting room for unapproved users. Has working Sign Out button. |
| `src/pages/UpdatePassword.tsx` | Password reset landing page (for invited users). |

### Roles

| DB Role | Display Name | Access Level |
|---------|-------------|-------------|
| `admin` | Admin | Global — sees all institutions, all events, all users. Can invite users, approve pending users, manage institutions, access WhatsApp Inspector. |
| `super_admin` (legacy) | Admin | Same as `admin` — treated identically everywhere via `isAdmin()` check. |
| `event_organizer` | Event Organizer | Scoped to own `institution_uuid`. Can create/edit events, manage attendees, view dashboard for own institution only. |
| `organizer_admin` (legacy) | Event Organizer | Same scope as `event_organizer`. |
| `user` | User | Minimal access. Typically WhatsApp attendees with profiles. |

### RLS Enforcement
- Most tables use RESTRICTIVE policies checking `is_admin_user(auth.uid())` OR institution match via subquery on `profiles.institution_uuid`
- `is_admin_user()` is a `SECURITY DEFINER` function that checks `profiles.role IN ('admin', 'super_admin')`

### User Invitation Flow
1. Admin opens "Invite User" modal (`InviteUserModal.tsx`)
2. Calls `supabase.rpc('create_user_wizard', {...})` — creates auth.users + profiles record
3. Sends password reset email via `supabase.auth.resetPasswordForEmail()`
4. Alternative: Edge Function `invite-user` uses `supabaseAdmin.auth.admin.inviteUserByEmail()`

### User Approval Flow
1. New user signs up → gets `role: 'user'`, no `institution_uuid`
2. User sees `/pending-approval` page
3. Admin goes to `/admin/users` → "Pending Approvals" tab
4. Clicks "Approve" → `ApproveUserModal` assigns `role: 'event_organizer'` + `institution_uuid`
5. User can now access dashboard

---

## 3. Pages & Features

### `/` — Dashboard (`src/pages/Dashboard.tsx`)
**Access:** All authenticated users (with institution or admin)

**Features:**
- Event selector dropdown (auto-selects most recent active event)
- **Financial Overview** component with metric selector (Total/Tickets/Add-ons) and Paid vs Pending donut chart
- **KPI Cards:** Total Attendees, Pending Income (clickable, links to pre-filtered attendee lists)
- **Registration Timeline:** 14-day line chart from attendees `created_at`
- **Ticket Distribution:** Pie chart by `ticket_tiers.name`
- **Activity Feed:** Last 5 registrations
- **Recent Events:** Last 3 events with status badges

**Role-specific behavior:**
- Admins see "Total Platform Volume (GMV)" label
- Organizers see "Managing: [Institution Name]" indicator
- Revenue = SUM of `attendees.price_paid` where `payment_status = 'paid'`

**Data sources:** `events`, `attendees`, `ticket_tiers`, `institutions`

---

### `/events` — Events List (`src/pages/Events.tsx`)
**Access:** All authenticated users

**Features:**
- Grid of `EventCard` components
- Status filter tabs: All | Draft | Pending Approval (admin only) | Active | Completed
- "Create Event" button → `CreateEventModal`

**Data source:** `useEvents()` hook → `events` table with `institutions` join. RLS handles scoping.

---

### `/events/:id` — Event Details (`src/pages/EventDetails.tsx`)
**Access:** All authenticated users (RLS-scoped)

**Features:**
- Event header with status badge and action buttons
- **Status transitions:**
  - Organizer: Draft → "Submit for Review" → `pending_approval`
  - Admin: `pending_approval` → "Approve Event" → `active` | "Return to Draft" → `draft`
- **Stats cards:** Total Revenue (from `event_memberships.price_paid`), Total Attendees
- **Tabs:**
  1. **Attendees** (`EventAttendeesTable`) — table with name, phone, email, registration date, status. "Add Attendee Manually" button.
  2. **Ticket Tiers** (`TicketTiersTable`) — CRUD for `ticket_tiers`. Shows name, price, capacity, sales period, computed status (Upcoming/Active/Expired). Has `erp_code` field.
  3. **Services** (`EventServicesTable`) — CRUD for `event_services`. Shows name, description, price, capacity. Has `erp_code` field.
- "Edit Event" button → `EditEventModal`

**Data sources:** `events`, `attendees`, `profiles`, `event_memberships`, `ticket_tiers`, `event_services`

---

### `/attendees` — Global Attendees (`src/pages/Attendees.tsx`)
**Access:** All authenticated users

**Features:**
- Search by name, email, phone (server-side `ilike` filter)
- Event filter dropdown
- Status filter (from URL params, e.g., `?status=pending&event=uuid`)
- Table columns: Name, Contact, Event, Institution (admin only), Status, Checked In, Registered date
- "Manage Services" action per attendee → `AttendeeServicesModal`
- **CSV Export** — European format (semicolon delimiter, UTF-8 BOM, comma decimal separator, Croatian headers)
- Admin sees Institution column; organizer does not

**Data sources:** `useAttendees()` → `attendees` with `events` + `institutions` joins

---

### `/settings` — User Settings (`src/pages/Settings.tsx`)
**Access:** All authenticated users

**Features:**
- **User Profile card:** Edit first name, last name, phone. Email and role are read-only.
- **My Institution card:** Read-only display of linked institution (name, OIB, address, invoice email)

**Data sources:** `profiles`, `institutions`

---

### `/admin` — Admin Panel (`src/pages/Admin.tsx`)
**Access:** Admin only (`AdminRoute`)

**Features:**
- **Institutions tab** (`InstitutionsTable`):
  - Read-only table of all institutions (name, OIB, address, city, country, invoice email)
  - "Create Institution" button → `CreateInstitutionModal` (inserts into `institutions`)
- **Users tab** (`UsersManager`):
  - Table of all `profiles` with inline institution assignment dropdown
  - Can reassign any user's `institution_uuid`

---

### `/admin/users` — User Directory (`src/pages/AdminUsers.tsx`)
**Access:** Admin only

**Features:**
- **Stats cards:** Pending Approval, Platform Clients, WhatsApp Attendees, Conveyo Team
- **Global search** across all tabs (auto-switches to matching tab)
- **4 tabs:**
  1. **Pending Approvals** — users without `institution_uuid` and not admin. "Approve" button → `ApproveUserModal`
  2. **Platform Clients** — `event_organizer`/`admin`/`organizer_admin` with institution. Shows org name, contact person, impersonate/edit buttons (stubs)
  3. **WhatsApp Attendees** — `user` role with institution. Shows phone, WhatsApp ID.
  4. **Conveyo Team** — admin/super_admin users.
- "Invite User" button → `InviteUserModal`

**Data sources:** `profiles` with `institutions` join

---

### `/admin/chats` — WhatsApp Inspector (`src/pages/AdminChats.tsx`)
**Access:** Admin only

**Features:**
- Read-only WhatsApp conversation viewer
- Left panel: conversation list grouped by phone number, sorted by last message
- Right panel: chat bubbles (user messages left, bot/AI messages right)
- Shows user name, institution, phone number per conversation

**Data source:** `admin_chat_full_view` (database view joining `chat_messages` with profile/institution data)

---

## 4. Data Flow & Supabase Integration

### Client Configuration
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
// Uses VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from .env
```

### Query Pattern
All data fetching uses TanStack Query with Supabase client:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['resource-name', ...dependencies],
  queryFn: async () => {
    const { data, error } = await supabase.from('table').select('...').eq('col', val);
    if (error) throw error;
    return data;
  },
  enabled: !!dependency,
});
```

### Mutation Pattern
```typescript
const mutation = useMutation({
  mutationFn: async (input) => {
    const { error } = await supabase.from('table').insert/update/delete(input);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource-name'] });
    toast.success('Done!');
  },
});
```

### Custom Hooks
| Hook | Tables | Purpose |
|------|--------|---------|
| `useEvents()` | `events` + `institutions` | Fetch events with status filter. RLS handles scoping. |
| `useAttendees()` | `attendees` + `events` + `institutions` | Fetch attendees with search. Client-side institution filter for organizers. |
| `useDashboardStats()` | `events`, `attendees`, `ticket_tiers` | Aggregated dashboard KPIs, charts, activity feed. |
| `useAttendeeServices` | `order_items` + `event_services` | CRUD for attendee service purchases. |

### Database Functions (RPC)
| Function | Usage |
|----------|-------|
| `create_user_wizard(email, first_name, last_name, role, institution_id)` | Called from `InviteUserModal` to create auth user + profile in one transaction |
| `is_admin_user(user_id)` | Used in RLS policies to check admin status |
| `auto_complete_past_events()` | Called by pg_cron hourly to transition active→completed |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `invite-user` | Alternative user invitation via `supabaseAdmin.auth.admin.inviteUserByEmail()`. Checks caller is super_admin. |

### Database Triggers
| Trigger | Table | Purpose |
|---------|-------|---------|
| `handle_new_user()` | `auth.users` (on insert) | Auto-creates `profiles` row with metadata from signup |
| `set_price_from_tier()` | `attendees` (before insert/update) | Copies `price` from `ticket_tiers` into `attendees.price_paid` when `ticket_tier_id` is set |

---

## 5. Database Schema & Table Usage

### Core Tables

| Table | Read By | Written By | Key Fields |
|-------|---------|-----------|------------|
| `events` | Dashboard, Events list, Event details, Attendees | CreateEventModal, EditEventModal, status change buttons | `name, slug, status, start_date, end_date, institution_uuid, currency, bc_reference, bc_position, vat_rate, tax_location` |
| `attendees` | Dashboard, Attendees page, Event details | AddAttendeeModal, WhatsApp bot (external) | `first_name, last_name, email, event_id, ticket_tier_id, price_paid, payment_status, status, checked_in, erp_sku` |
| `ticket_tiers` | Event details, Dashboard charts | TicketTierModal (create/edit/delete) | `name, price, capacity, sales_start, sales_end, event_id, erp_code, status` |
| `event_services` | Event details, AttendeeServicesModal | AddServiceModal (create/edit/delete) | `name, price, capacity, event_id, erp_code, currency, description` |
| `profiles` | Auth, Settings, Admin panels, Dashboard | Settings (self-update), ApproveUserModal, UsersManager, create_user_wizard | `id, email, first_name, last_name, role, institution_uuid, phone` |
| `institutions` | Admin panel, Dashboard, Event creation, Settings | CreateInstitutionModal | `name, oib, address, city, country, invoice_email, bc_generic_customer_id, bc_payment_method_bank, bc_payment_method_card, stripe_connect_id` |
| `orders` | Not directly displayed in UI | External (n8n/BC) | `order_number, payer_name, payer_type, status, total_amount, event_id, bc_invoice_id, bc_invoice_number, bc_customer_no, pdf_url` |
| `order_items` | AttendeeServicesModal (via useAttendeePurchases) | useAddPurchase, useRemovePurchase | `description, unit_price, total_price, vat_amount, attendee_id, service_id, ticket_type_id, order_id` |
| `event_memberships` | Event details (revenue calc) | CreateEventModal (auto-creates for creator) | `event_id, user_id, role, ticket_tier_id` |
| `chat_messages` | AdminChats (via view) | External (WhatsApp bot) | `session_id, message (JSONB)` |
| `admin_chat_full_view` | AdminChats page | N/A (database view) | `user_name, phone_number, institution_name, message_content, sender_type` |
| `sessions` | Not used in UI | External | `title, event_id, start_time, end_time, speaker_names, location` |
| `exhibitors` | Not used in UI | External | `company_name, event_id, tier` |
| `leads` | Not used in UI | External (scanner) | `attendee_id, exhibitor_id, notes, scanned_at` |
| `payment_method_mappings` | Not used in UI | External (BC sync) | `stripe_brand, bc_code` |

---

## 6. Business Central (ERP) Integration

### BC Fields on Events
| Field | Location | Managed By |
|-------|----------|-----------|
| `bc_reference` | `events` table | Admin only (visible in Create/Edit Event modal, Section 4: "Financials & Business Central") |
| `bc_position` | `events` table | Admin only (same section) |

These fields appear in the event form under "Section 4: Financials & Business Central" and are editable by all users in the form, though conceptually they're admin-managed.

### BC Fields on Ticket Tiers
| Field | Location | Managed By |
|-------|----------|-----------|
| `erp_code` | `ticket_tiers` table | Created/edited via `TicketTierModal`. Available to admins and organizers. |

### BC Fields on Event Services
| Field | Location | Managed By |
|-------|----------|-----------|
| `erp_code` | `event_services` table | Created/edited via `AddServiceModal`. Default value: `'USL-RAZNO'`. |
| `event_code` | `event_services` table | Default: `'DEFAULT-EVENT'`. Not exposed in UI. |

### BC Fields on Orders (External Write)
| Field | Purpose |
|-------|---------|
| `bc_invoice_id` | Business Central invoice UUID |
| `bc_invoice_number` | Human-readable BC invoice number |
| `bc_customer_no` | BC customer identifier |

### BC Fields on Institutions
| Field | Default | Purpose |
|-------|---------|---------|
| `bc_generic_customer_id` | `'WEB-KUPAC'` | Default BC customer ID for walk-in customers |
| `bc_payment_method_bank` | `'VIRMAN'` | BC payment method code for bank transfers |
| `bc_payment_method_card` | `'KARTICE'` | BC payment method code for card payments |

### BC Sync Flow
The admin panel does NOT directly call Business Central. The sync is handled externally:
1. **n8n** watches for changes in Supabase tables (likely via webhooks or polling)
2. n8n reads `erp_code`, `bc_reference`, `bc_position` from events/tiers/services
3. n8n creates/updates BC records and writes back `bc_invoice_id`, `bc_invoice_number`, `bc_customer_no` to `orders`
4. `payment_method_mappings` table maps Stripe brands to BC payment method codes

---

## 7. Invoice & Payment Management

### Payment Status Flow
The `orders` table uses the `payment_status` enum: `draft → issued → paid → overdue → refunded`

### How Payment Status is Displayed
- **Attendees table:** Shows `attendees.status` (registration_status enum: pending/approved/cancelled) — NOT payment status
- **Dashboard KPIs:** Revenue calculated from `attendees.price_paid` grouped by `attendees.payment_status` (paid vs pending)
- **Orders table:** Not directly displayed in the admin panel UI

### Price Inheritance
1. Admin/organizer creates `ticket_tiers` with `price` and `erp_code`
2. When attendee is registered with a `ticket_tier_id`, the `set_price_from_tier()` trigger copies `price` → `attendees.price_paid`
3. `attendees.erp_sku` can be set independently

### Invoice Fields (on `orders`)
| Field | Purpose | UI Exposure |
|-------|---------|-------------|
| `pdf_url` | Link to generated invoice PDF (stored in `invoices` storage bucket) | Not shown in admin panel |
| `bc_invoice_number` | BC-generated invoice number | Not shown in admin panel |
| `payer_name`, `payer_oib`, `payer_address` | Invoice billing details | Not shown in admin panel |
| `payer_type` | `individual` / `company` / `sponsor` | Not shown in admin panel |

**Note:** The `orders` and `order_items` tables are primarily written by external systems (n8n, WhatsApp bot) and are only read in the admin panel through `useAttendeeServices.ts` for the service purchases view.

---

## 8. External Integrations (n8n / Webhooks)

### No Direct Webhook Calls From This App
The admin panel does **NOT** make any direct n8n webhook calls or trigger external integrations. All external integration is handled by:

1. **n8n workflows** that poll/watch Supabase tables
2. **WhatsApp bot** that writes to `chat_messages`, `attendees`, and `orders` tables
3. **Business Central sync** via n8n reading `erp_code`/`bc_*` fields

### Data Written by External Systems
| System | Tables Written |
|--------|---------------|
| WhatsApp Bot | `chat_messages`, `attendees`, `orders`, `order_items` |
| n8n / BC Sync | `orders` (bc_invoice_id, bc_invoice_number, bc_customer_no) |
| pg_cron | `events` (status: active→completed via `auto_complete_past_events()`) |

### Edge Function: `invite-user`
- Deployed at: `https://yqusqfdaikkvvjflgmmh.supabase.co/functions/v1/invite-user`
- Called by: Currently **not called from the frontend** (the frontend uses `create_user_wizard` RPC + `resetPasswordForEmail` instead)
- Purpose: Alternative invitation flow using `supabaseAdmin.auth.admin.inviteUserByEmail()`

---

## 9. Pending / Missing Features

### Visible Stubs / TODOs in Code

| Feature | Location | Status |
|---------|----------|--------|
| **Impersonate User** | `AdminUsers.tsx` line 163 | Stub: `toast.info('Impersonation feature coming soon')` |
| **Edit User Settings** | `AdminUsers.tsx` line 167 | Stub: `toast.info('Edit settings for...')` |
| **Ticket Sold Count** | `TicketTiersTable.tsx` line 115 | `// TODO: Add sold count when we track ticket sales` |
| **Purchase Status Update** | `useAttendeeServices.ts` line 137 | No-op: `// order_items doesn't have a status column` |
| **Add-on Revenue Tracking** | `useDashboardStats.ts` line 97 | `// No separate add-on tracking yet` — addonRevenue always 0 |
| **Forgot Password** | `Auth.tsx` line 100 | Shows toast telling user to contact admin (no actual reset flow) |
| **Self-Registration** | `Auth.tsx` | No signup form — login only. Users must be invited. |
| **Orders Page** | N/A | No dedicated orders management page exists. Orders are only viewed through attendee services. |
| **Invoice Viewer** | N/A | `orders.pdf_url` exists but no UI to view/download invoices |
| **Event Delete** | RLS policy exists (`events_delete` for admins) but no delete button in UI |
| **Attendee Delete** | No RLS DELETE policy exists for `attendees` table |
| **Sessions/Agenda** | `sessions` table exists but no UI |
| **Exhibitors/Leads** | `exhibitors` and `leads` tables exist but no UI |
| **Badge Printing** | `attendees.badge_printed` field exists but no UI |
| **Ticket Sending** | `attendees.ticket_sent_at` field exists but no UI |
| **Invoice Sending** | `attendees.invoice_sent_at` field exists but no UI |
| **Institution Edit** | Admin can create institutions but no edit/delete UI |
| **Stripe Integration** | `institutions.stripe_connect_id` and `events.stripe_tax_rate_id` exist but no Stripe UI |
| **Early Bird Pricing** | `events.early_bird_deadline` field exists but no UI logic |
| **Revenue from event_memberships** | `EventDetails.tsx` calculates revenue from `event_memberships` but this table doesn't have `price_paid` — always returns 0 |

### Architectural Gaps
1. **Role stored on profiles table** — The `profiles.role` column stores the user's role directly. Per security best practices, roles should be in a separate `user_roles` table to prevent privilege escalation.
2. **BC fields editable by organizers** — `bc_reference` and `bc_position` are in the event form accessible to all users, not just admins.
3. **Client-side institution filtering** — `useAttendees()` fetches all attendees (RLS-filtered) then does additional client-side filtering for organizers, which could be moved to the query.
4. **invite-user edge function not used** — The frontend uses `create_user_wizard` RPC instead, making the edge function orphaned.

---

## 10. File Structure Reference

```
src/
├── App.tsx                           # Routes definition
├── contexts/
│   └── AuthContext.tsx                # Auth state management
├── lib/
│   ├── roles.ts                      # Role helpers (isAdmin, isElevatedRole)
│   └── utils.ts                      # cn() utility
├── hooks/
│   ├── useEvents.ts                  # Events data hook
│   ├── useAttendees.ts               # Attendees data hook
│   ├── useDashboardStats.ts          # Dashboard aggregation hook
│   └── useAttendeeServices.ts        # Attendee purchases hook
├── pages/
│   ├── Auth.tsx                      # Login page
│   ├── Dashboard.tsx                 # Main dashboard
│   ├── Events.tsx                    # Events list
│   ├── EventDetails.tsx              # Single event view
│   ├── Attendees.tsx                 # Global attendees
│   ├── Settings.tsx                  # User settings
│   ├── Admin.tsx                     # Institutions + Users management
│   ├── AdminUsers.tsx                # User directory (4 tabs)
│   ├── AdminChats.tsx                # WhatsApp inspector
│   ├── PendingApproval.tsx           # Waiting room
│   ├── UpdatePassword.tsx            # Password reset
│   └── NotFound.tsx                  # 404
├── components/
│   ├── ProtectedRoute.tsx            # Auth guard (all users)
│   ├── AdminRoute.tsx                # Auth guard (admin only)
│   ├── AppLayout.tsx                 # Sidebar + content layout
│   ├── AppSidebar.tsx                # Navigation sidebar
│   ├── NavLink.tsx                   # Active link component
│   ├── admin/
│   │   ├── InstitutionsTable.tsx     # Institution list
│   │   ├── CreateInstitutionModal.tsx # Institution creation form
│   │   ├── UsersManager.tsx          # User table with institution assignment
│   │   ├── UserDetailsModal.tsx      # User detail view
│   │   ├── InviteUserModal.tsx       # User invitation form
│   │   └── ApproveUserModal.tsx      # Pending user approval
│   ├── events/
│   │   ├── EventCard.tsx             # Event grid card
│   │   ├── CreateEventModal.tsx      # Event creation (6 sections)
│   │   ├── EditEventModal.tsx        # Event editing (mirrors create)
│   │   ├── EventAttendeesTable.tsx   # Attendee list per event
│   │   ├── AddAttendeeModal.tsx      # Manual attendee registration
│   │   ├── TicketTiersTable.tsx      # Ticket tier CRUD
│   │   ├── TicketTierModal.tsx       # Ticket tier form
│   │   ├── EventServicesTable.tsx    # Service CRUD
│   │   ├── AddServiceModal.tsx       # Service form
│   │   └── PriceTierRow.tsx          # Price display component
│   ├── attendees/
│   │   └── AttendeeServicesModal.tsx  # Service purchases per attendee
│   └── dashboard/
│       ├── KPICard.tsx               # Clickable KPI card
│       ├── FinancialOverview.tsx      # Revenue donut chart
│       ├── RegistrationChart.tsx     # 14-day registration chart
│       ├── TicketDistributionChart.tsx # Ticket tier pie chart
│       └── ActivityFeed.tsx          # Recent activity list
├── integrations/supabase/
│   ├── client.ts                     # Supabase client instance
│   └── types.ts                      # Auto-generated DB types (read-only)
└── index.css                         # Design system tokens
```

### Supabase Resources
```
supabase/
├── config.toml                       # Supabase local config
├── functions/
│   └── invite-user/index.ts          # Edge function for user invitation
└── migrations/                       # SQL migrations (read-only)
```
