# LS Services App — IDE Context File
# Read this before writing any code. This is the source of truth.
# Last updated: April 2026 | Owner: Services Vertical, Livspace

---

## 1. WHAT THIS APP IS

A Progressive Web App (PWA) for Livspace's Services Vertical that digitizes:
1. Site validation requests (replaces Google Forms)
2. On-site validation (measurements, photos, checklists)
3. Quote generation using Master Rate Cards (MRC)
4. Project tracking across roles

This is a **logic-heavy, mobile-first internal tool**. UI polish matters less than correctness of business rules. Every rule must be enforced at both the UI layer and the database layer.

---

## 2. TECH STACK (NON-NEGOTIABLE)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | PWA support, file-based routing |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI, accessible components |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | Free tier, RLS, realtime |
| Offline | Dexie.js (IndexedDB wrapper) | Best-in-class for PWA offline |
| Data fetching | TanStack Query (React Query) | Cache + sync management |
| Forms | React Hook Form + Zod | Validation, TypeScript-safe |
| State | Zustand | Lightweight global state |
| PDF export | jsPDF + html2canvas | Client-side PDF generation |
| Excel export | SheetJS (xlsx) | Client-side Excel |
| Image compression | browser-image-compression | Client-side, works offline |
| Deployment | Vercel (Hobby → Pro as needed) | Zero-config Next.js |

---

## 3. LIVSPACE BRAND GUIDELINES

Apply these consistently across all UI components.

### Colors
```css
/* Primary brand */
--livspace-orange: #FF6B35;       /* Primary CTA, active states */
--livspace-orange-hover: #E85A24; /* Hover state */
--livspace-orange-light: #FFF0EB; /* Light background tint */

/* Neutrals */
--livspace-dark: #1A1A1A;         /* Primary text */
--livspace-gray-800: #2D2D2D;     /* Headings */
--livspace-gray-600: #6B6B6B;     /* Secondary text */
--livspace-gray-400: #A8A8A8;     /* Placeholder, disabled */
--livspace-gray-200: #E8E8E8;     /* Borders, dividers */
--livspace-gray-100: #F5F5F5;     /* Background surfaces */
--livspace-white: #FFFFFF;

/* Semantic */
--livspace-success: #27AE60;
--livspace-warning: #F39C12;
--livspace-error: #E74C3C;
--livspace-info: #2980B9;

/* Priority badges */
--priority-p0: #E74C3C;           /* P0 Urgent - Red */
--priority-p1: #F39C12;           /* P1 High - Amber */
--priority-p2: #27AE60;           /* P2 Normal - Green */
```

### Typography
```css
/* Font stack - use system fonts that match Livspace's feel */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Scale */
--text-xs: 11px;
--text-sm: 13px;
--text-base: 15px;
--text-lg: 17px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;
```

### Component rules
- All primary buttons: `bg-[#FF6B35] hover:bg-[#E85A24] text-white rounded-lg`
- Cards: `bg-white border border-[#E8E8E8] rounded-xl shadow-sm`
- Page headers: `text-[#1A1A1A] font-semibold text-xl`
- Section labels: `text-[#6B6B6B] text-sm font-medium uppercase tracking-wide`
- Input fields: `border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#FF6B35]`
- Sidebar (if used): `bg-[#1A1A1A] text-white`

---

## 4. AUTHENTICATION & ACCESS CONTROL

### Model: Invite-only (no self-registration)
- No public signup. Admin creates users from admin panel.
- Supabase Auth (email/password).
- On user creation, admin sets role, city, and active status.
- Users receive invite email with password set link.

### Roles (in order of access level)
```
super_admin     → Full access, can never be deleted
admin           → Full access except cannot delete super_admin
validation_manager (VM) → City-scoped: sees all requests in their city, assigns VLs
validation_lead (VL)    → Sees only their assigned projects
design_associate (DA)   → Upload designs, view validation reports (read-only on quotes)
designer                → Submit requests, view status + reports for their projects
supply_executive        → View post-order project details only
```

### Row Level Security (RLS) — enforce at DB level, not just UI
Every table must have RLS policies. Never trust the frontend alone.

Key policies to implement:
```sql
-- VL can only see their own validations
-- VM can see all validations in their city_id
-- Designer can only see their own submitted requests and resulting reports
-- Admin/super_admin can see everything
-- supply_executive can only see projects after order_confirmed = true
```

---

## 5. DATABASE SCHEMA (PHASE 1 FOCUS)

### Core tables for Phase 1

```sql
-- Cities master
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- e.g. 'BLR', 'MUM', 'DEL'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN (
    'super_admin', 'admin', 'validation_manager',
    'validation_lead', 'design_associate', 'designer', 'supply_executive'
  )),
  city_id UUID REFERENCES cities(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid TEXT UNIQUE NOT NULL,  -- Livspace Project ID e.g. LS-BLR-2026-045
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  address TEXT NOT NULL,
  city_id UUID NOT NULL REFERENCES cities(id),
  property_type TEXT CHECK (property_type IN ('apartment', 'villa', 'office', 'other')),
  carpet_area_sqft NUMERIC,  -- in sqft, stored as canonical unit
  floor_number INTEGER,
  total_floors INTEGER,
  designer_id UUID REFERENCES profiles(id),  -- the ID who owns this project
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  order_confirmed BOOLEAN DEFAULT false,  -- flips to true when supply team is triggered
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation requests
CREATE TABLE validation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,  -- VR-2026-XXXX, auto-generated
  project_id UUID NOT NULL REFERENCES projects(id),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('kws', 'services', 'both')),
  priority TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2')),
  priority_reason TEXT,  -- why this priority was set
  special_instructions TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'assigned', 'in_progress', 'completed', 'revision_required', 'cancelled'
  )),
  assigned_to UUID REFERENCES profiles(id),  -- VL
  assigned_by UUID REFERENCES profiles(id),  -- VM who assigned
  assigned_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,  -- calculated from priority + assigned_at
  completed_at TIMESTAMPTZ,
  city_id UUID NOT NULL REFERENCES cities(id),  -- denormalized for VM city-scoping
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validations (the actual on-site work)
CREATE TABLE validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES validation_requests(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  validated_by UUID NOT NULL REFERENCES profiles(id),
  checkin_lat NUMERIC,
  checkin_lng NUMERIC,
  checkin_time TIMESTAMPTZ,
  checkout_time TIMESTAMPTZ,
  selfie_url TEXT,
  preliminary_data JSONB DEFAULT '{}',  -- flat/plot num, carpet area confirmed, etc.
  society_constraints JSONB DEFAULT '{}',
  completion_status TEXT DEFAULT 'in_progress' CHECK (completion_status IN (
    'in_progress', 'submitted', 'report_generated'
  )),
  validation_excel_url TEXT,
  report_pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID NOT NULL REFERENCES validations(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_type TEXT,  -- 'living_room', 'master_bedroom', 'kitchen', etc.
  sequence_number INTEGER,  -- for ordering
  north_wall TEXT,  -- 'north', 'south', 'east', 'west' — helps with orientation
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Measurements (all in mm)
CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL,
  location TEXT NOT NULL,
  value_mm NUMERIC NOT NULL,  -- ALWAYS store in mm
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Measurement types and locations reference:
-- measurement_type: 'ceiling_height', 'diagonal', 'wall_distance', 'beam_depth', 
--                   'door_width', 'door_height', 'window_width', 'window_height',
--                   'column_projection', 'slab_thickness'
-- location examples:
--   ceiling_height: 'corner_nw', 'corner_ne', 'corner_se', 'corner_sw', 'center'
--   diagonal: 'd1_nw_se', 'd2_ne_sw'
--   wall_distance: 'north_2ft', 'north_4ft', 'north_6ft', 'south_2ft', etc.
--   beam_depth: 'beam_1', 'beam_2', etc.

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID NOT NULL REFERENCES validations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id),
  photo_category TEXT NOT NULL CHECK (photo_category IN (
    'wall_north', 'wall_south', 'wall_east', 'wall_west',
    'ceiling', 'floor', 'mep_electrical', 'mep_plumbing', 'mep_hvac',
    'defect', 'overview', 'society', 'selfie', 'other'
  )),
  storage_path TEXT NOT NULL,  -- path in Supabase Storage
  storage_url TEXT,  -- full public/signed URL
  thumbnail_path TEXT,
  marked_photo_path TEXT,  -- after canvas annotation
  annotations JSONB DEFAULT '[]',
  -- annotations format: [{"pin": 1, "x": 320, "y": 480, "note": "Dampness observed"}]
  file_size_bytes INTEGER,
  width_px INTEGER,
  height_px INTEGER,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  captured_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KT Questions (admin-configured)
CREATE TABLE kt_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('site_visit', 'designer_kt', 'general')),
  answer_type TEXT NOT NULL CHECK (answer_type IN ('text', 'yes_no', 'mcq', 'number', 'multi_select')),
  options JSONB,  -- for MCQ/multi_select: ["Option A", "Option B"]
  is_mandatory BOOLEAN DEFAULT false,
  applies_to_property_type TEXT[],  -- null = all types, else ['apartment', 'villa']
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KT Responses
CREATE TABLE kt_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID NOT NULL REFERENCES validations(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES kt_questions(id),
  response_text TEXT,
  response_bool BOOLEAN,
  response_number NUMERIC,
  response_options JSONB,  -- for multi_select
  answered_by UUID REFERENCES profiles(id),
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(validation_id, question_id)
);
```

---

## 6. BUSINESS LOGIC RULES (CRITICAL — enforce everywhere)

### 6.1 Measurement validation rules

```typescript
// All measurements stored in mm. Conversion on input only.
const MEASUREMENT_RULES = {
  ceiling_height: { min: 2000, max: 5000, unit: 'mm' },
  diagonal: { min: 1000, max: 20000, unit: 'mm' },
  wall_distance: { min: 500, max: 15000, unit: 'mm' },
  door_width: { min: 600, max: 2400, unit: 'mm' },
  door_height: { min: 1800, max: 3600, unit: 'mm' },
  window_width: { min: 300, max: 4000, unit: 'mm' },
  window_height: { min: 300, max: 3000, unit: 'mm' },
  beam_depth: { min: 50, max: 1000, unit: 'mm' },
  column_projection: { min: 50, max: 800, unit: 'mm' },
}

// If a value is outside range, show warning but DON'T block submission.
// Mark as flagged so VM can review.
```

### 6.2 Area/quantity calculation rules (PHASE 3 — quote engine)

These rules prevent impossible quantities in quotes. Implement as validation before quote submission.

```typescript
// carpet_area_sqft is the source of truth from the validation
// All area-based quantities must be physically possible

const AREA_RULES = {
  // Painting cannot exceed ~2.5x carpet area (walls + ceiling)
  // Standard rule: painting area = carpet_area * 2.5 (approx walls + ceiling)
  max_painting_area_sqft: (carpet_area_sqft: number) => carpet_area_sqft * 2.8,

  // False ceiling cannot exceed carpet area (you can't ceil more than the floor)
  max_false_ceiling_sqft: (carpet_area_sqft: number) => carpet_area_sqft * 1.05, // 5% tolerance for overlaps

  // Flooring cannot exceed carpet area significantly
  max_flooring_sqft: (carpet_area_sqft: number) => carpet_area_sqft * 1.15, // 15% for cuts/waste

  // Waterproofing in bathroom - max reasonable is 3x bathroom area (floor + walls)
  max_waterproofing_sqft: (bathroom_area_sqft: number) => bathroom_area_sqft * 3.5,
}

// When a quantity is entered that violates these rules, show a RED warning:
// "This quantity (X sqft) exceeds what is physically possible for this project 
//  (max Y sqft based on carpet area Z sqft). Please verify."
// Do NOT auto-correct. Flag and require manual confirmation.
```

### 6.3 Mandatory item dependencies (PHASE 3)

These rules are configured by admin but here are the core ones to hardcode as defaults:

```typescript
// If SKU A is in quote → SKU B is MANDATORY (cannot submit without it)
const MANDATORY_DEPENDENCIES = [
  // Electrical rewiring requires earthing
  { if: 'ELEC-REWIRE', then: 'ELEC-EARTHING', reason: 'Rewiring requires earthing wire' },

  // Modular kitchen installation requires kitchen plumbing
  { if: 'CARP-KITCHEN-INSTALL', then: 'PLUMB-KITCHEN-INLET', reason: 'Kitchen installation needs plumbing' },

  // False ceiling requires electrical provision inside ceiling
  { if: 'CARP-FALSE-CEILING', then: 'ELEC-LIGHT-PROVISION', reason: 'False ceiling needs light provisions' },

  // Tile/stone flooring requires levelling compound
  { if: 'FLOOR-TILE', then: 'FLOOR-LEVELLING', reason: 'Tile flooring requires levelling' },
  { if: 'FLOOR-STONE', then: 'FLOOR-LEVELLING', reason: 'Stone flooring requires levelling' },

  // Waterproofing membrane requires primer
  { if: 'WATERPROOF-MEMBRANE', then: 'WATERPROOF-PRIMER', reason: 'Membrane needs primer coat' },
]

// If SKU A is in quote → WARN that SKU B is typically also needed (but optional)
const SOFT_DEPENDENCIES = [
  { if: 'PAINT-WALL', then: 'PAINT-PUTTY', reason: 'Wall painting typically requires putty' },
  { if: 'CARP-WARDROBE', then: 'ELEC-MIRROR-LIGHT', reason: 'Wardrobes commonly include mirror lighting' },
]
```

### 6.4 Priority auto-assignment rules

```typescript
const determinePriority = (request: ValidationRequest): 'P0' | 'P1' | 'P2' => {
  // P0: Direct ID/BM request OR explicitly marked urgent
  if (request.direct_from_id_or_bm || request.is_urgent_flag) return 'P0';

  // P1: PID is in current month's planning cycle + KWS validation raised but Services not yet
  if (request.in_current_month_plan && request.kws_raised && !request.services_raised) return 'P1';

  // P2: Default - services scope exists in booking welcome email
  return 'P2';
}

// SLA durations from assignment (not from request creation)
const SLA_HOURS = {
  P0: { assignment: 1, completion: 24 },
  P1: { assignment: 4, completion: 48 },
  P2: { assignment: 8, completion: 72 },
}
```

### 6.5 Validation completion checklist (ENFORCED — cannot submit without all items)

```typescript
const COMPLETION_REQUIREMENTS = {
  // Mandatory
  checkin_done: true,
  selfie_uploaded: true,
  preliminary_data_complete: true,
  society_constraints_complete: true,
  at_least_one_room: true,
  
  per_room: {
    // All 5 ceiling heights (4 corners + center)
    ceiling_heights_count: 5,
    // Both diagonals
    diagonals_count: 2,
    // Minimum photos: all 4 walls + ceiling + floor = 6
    min_photos_per_room: 6,
    // North wall must be identified
    north_wall_identified: true,
  },
  
  // All mandatory KT questions answered
  mandatory_kt_questions_answered: true,
}
```

### 6.6 Photo compression rules

```typescript
const PHOTO_RULES = {
  max_width_px: 1250,
  max_size_kb: 800,
  format: 'webp', // fallback to jpeg
  quality: 0.82,
  // Photos queued for upload, never block the user if offline
  upload_strategy: 'background_sync',
}
```

---

## 7. OFFLINE-FIRST DATA FLOW

### IndexedDB Schema (Dexie.js)

```typescript
import Dexie, { Table } from 'dexie';

export interface LocalValidation {
  id: string;
  request_id: string;
  project_id: string;
  sync_status: 'pending' | 'synced' | 'failed';
  last_modified: number; // timestamp for conflict resolution
  data: any; // full validation object
}

export interface LocalPhoto {
  id: string;
  validation_id: string;
  room_id?: string;
  category: string;
  blob: Blob; // stored locally
  compressed_blob?: Blob;
  annotations: any[];
  marked_blob?: Blob; // after canvas markup
  sync_status: 'pending' | 'synced' | 'failed';
  retry_count: number;
  captured_at: number;
}

export class LSServicesDB extends Dexie {
  validations!: Table<LocalValidation>;
  rooms!: Table<any>;
  measurements!: Table<any>;
  photos!: Table<LocalPhoto>;
  photo_queue!: Table<any>; // upload queue
  mrc_cache!: Table<any>; // Master Rate Card local cache
  kt_questions_cache!: Table<any>; // KT questions cached for offline use

  constructor() {
    super('LSServicesApp');
    this.version(1).stores({
      validations: 'id, request_id, project_id, sync_status, last_modified',
      rooms: 'id, validation_id',
      measurements: 'id, room_id',
      photos: 'id, validation_id, room_id, sync_status',
      photo_queue: '++id, photo_id, retry_count',
      mrc_cache: 'id, city_id, category_id',
      kt_questions_cache: 'id, category',
    });
  }
}

export const db = new LSServicesDB();
```

### Sync strategy
1. Every keystroke → save to IndexedDB immediately
2. Show "Saved locally" / "⚠ Not synced" indicator always
3. On connection → sync in background (non-blocking)
4. Conflict resolution: last-write-wins by `last_modified` timestamp (MVP)
5. Photos upload separately, in order, with retry (max 3 attempts)

---

## 8. FOLDER STRUCTURE

```
ls-services-app/
├── app/                         # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   └── reset-password/
│   ├── (dashboard)/
│   │   ├── layout.tsx           # sidebar + nav
│   │   ├── page.tsx             # role-based redirect
│   │   ├── validation-requests/ # request list + form
│   │   ├── validations/         # VL checklist workflow
│   │   │   ├── [id]/
│   │   │   │   ├── checkin/
│   │   │   │   ├── rooms/
│   │   │   │   ├── society/
│   │   │   │   └── review/
│   │   ├── assignments/         # VM assignment board
│   │   ├── quotes/              # quote engine (Phase 3)
│   │   └── admin/               # admin panel
│   ├── api/
│   │   └── webhooks/            # order confirmed webhook (Phase 4)
│   └── layout.tsx
├── components/
│   ├── ui/                      # shadcn/ui base components
│   ├── validation/              # validation-specific components
│   │   ├── MeasurementInput.tsx
│   │   ├── PhotoCapture.tsx
│   │   ├── PhotoMarkup.tsx      # canvas overlay for pin annotations
│   │   ├── RoomCard.tsx
│   │   └── ChecklistProgress.tsx
│   ├── dashboard/
│   └── shared/                  # priority badge, sync indicator, etc.
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # browser client
│   │   ├── server.ts            # server actions client
│   │   └── middleware.ts        # auth middleware
│   ├── db/                      # IndexedDB / Dexie setup
│   ├── validations/             # Zod schemas
│   ├── business-logic/          # ALL business rules (see Section 6)
│   │   ├── measurement-rules.ts
│   │   ├── area-calculations.ts
│   │   ├── priority-rules.ts
│   │   ├── sla-calculator.ts
│   │   ├── completion-checker.ts
│   │   └── quote-dependencies.ts
│   ├── pdf/                     # report generation
│   └── utils.ts
├── hooks/
│   ├── useValidation.ts
│   ├── useOfflineSync.ts
│   ├── useGeolocation.ts
│   └── usePermissions.ts        # role-based feature flags
├── stores/                      # Zustand global state
│   ├── authStore.ts
│   ├── validationStore.ts       # active validation in progress
│   └── syncStore.ts
├── types/
│   └── index.ts                 # all TypeScript types
└── supabase/
    ├── migrations/              # SQL migration files
    └── seed.sql                 # seed data (cities, etc.)
```

---

## 9. KEY COMPONENTS TO BUILD (PHASE 1)

### 9.1 Validation Request Form
Fields required:
- PID (Project ID) — text, required
- Designer name (searchable dropdown from profiles) — required
- Customer name — required
- Property address — required, text
- City — dropdown from cities table
- Property type — radio: Apartment / Villa / Office / Other
- Carpet area (sqft) — number
- Request type — checkbox: KWS / Services
- Priority indicator — select (auto-calculates actual priority)
- Special instructions — textarea

### 9.2 Validation Checklist (VL workflow) — THE MOST COMPLEX COMPONENT

This is a multi-step wizard. Steps:
1. Check-in (geolocation + selfie) → Phase 2 adds geofencing
2. Preliminary details
3. Society constraints (11+ fields)
4. Room management → for each room:
   a. Room name + type + north wall
   b. Ceiling heights (5 inputs: NW, NE, SE, SW, center)
   c. Diagonals (2 inputs)
   d. Wall distances (each wall at 2ft, 4ft, 6ft = 12 inputs minimum for 4 walls)
   e. Beams (dynamic: add/remove beams, each needs depth + location description)
   f. Doors (dynamic: add/remove doors, each needs width + height)
   g. Windows (dynamic: add/remove windows, each needs width + height)
   h. MEP points (electrical, plumbing, HVAC — with XY coordinate capture)
   i. Photos (6 mandatory + optional)
   j. Room-level KT answers
5. Global KT questions
6. Review checklist (show all incomplete items)
7. Submit

IMPORTANT: Save to IndexedDB on every input change. Show save status.

### 9.3 Photo Markup Component

```
Canvas overlay approach:
1. Display photo in a canvas element
2. User taps anywhere → drops a numbered pin (red circle + number)
3. Tapping the pin opens a bottom sheet to enter text note
4. On save: draw pins + notes onto a second canvas → save as marked photo blob
5. Store both original blob and marked blob in IndexedDB
6. Upload both to Supabase Storage
```

### 9.4 Admin Panel (minimum for Phase 1)
- User management: create/edit/deactivate users, assign roles
- KT question management: add/edit/activate/deactivate questions
- City management: add/edit cities

---

## 10. SOCIETY CONSTRAINTS FIELDS

Store as JSONB. These are the fields to capture:

```typescript
interface SocietyConstraints {
  service_lift_available: boolean;
  service_lift_timings?: string;
  debris_loading_location?: string;
  demolition_allowed: boolean;
  demolition_restrictions?: string;
  vehicle_entry_allowed: boolean;
  vehicle_entry_notes?: string;
  water_available_on_site: boolean;
  electricity_available_on_site: boolean;
  noc_required: boolean;
  noc_from_whom?: string;
  permissible_work_start_time?: string;  // e.g. "08:00"
  permissible_work_end_time?: string;    // e.g. "19:00"
  working_days?: string[];               // ['monday', 'tuesday', ...]
  other_restrictions?: string;
  security_contact_name?: string;
  security_contact_phone?: string;
}
```

---

## 11. REPORT PDF STRUCTURE (Phase 1 deliverable)

The validation report PDF must include:

1. **Cover page**: Project ID, customer name, address, date, VL name
2. **Project summary**: Property type, carpet area, number of rooms, check-in time
3. **Society constraints**: All filled fields in a table
4. **Per-room section** (repeat for each room):
   - Room name + north wall direction
   - Measurement table (ceiling heights, diagonals, wall distances, beams, doors, windows)
   - Photos grid (2 per row): marked photos with pin annotations below
5. **KT responses**: Question + answer table
6. **Notes/observations**

Use `jsPDF` with `autoTable` plugin for tables. Compress to < 5MB.

---

## 12. ENVIRONMENT VARIABLES

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # server-only, never expose to client
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GEOFENCE_RADIUS_METERS=500
```

---

## 13. CURRENT PHASE SCOPE (PHASE 1 ONLY)

Build ONLY these features right now:

✅ Supabase project + database setup (all Phase 1 tables)
✅ Next.js PWA with Livspace branding
✅ Invite-only auth (admin creates users, no self-registration)
✅ Role-based routing and navigation
✅ Validation request submission form (Designers, VMs, VLs can submit)
✅ Validation checklist (VL workflow — full offline capable)
✅ Photo capture + canvas annotation (offline)
✅ IndexedDB offline storage + sync to Supabase
✅ Validation report PDF generation + download
✅ Admin panel: user management + KT questions + cities
✅ VL dashboard: simple list of assigned requests with status

DO NOT build yet:
❌ Geofencing / geolocation check-in (Phase 2)
❌ VM assignment board (Phase 2)
❌ Designer/DA portal (Phase 2)
❌ Quote engine / MRC (Phase 3)
❌ Supply team features (Phase 4)
❌ Analytics / reporting dashboards (Phase 4)
❌ Priority bucketing automation (Phase 2 — use manual priority for now)

---

## 14. NUDGES & ERROR PREVENTION (UX rules)

These are user nudges to build throughout the checklist. Logic matters more than visuals.

### Input nudges
- Measurement input: show the min/max range in placeholder. If value typed is outside range, turn border red + show "Value seems unusual. Normal range: X–Y mm"
- Carpet area entered: if sum of all room areas (calculated from measurements) deviates >15% from stated carpet area → warn: "Room measurements total ~X sqft, but stated carpet area is Y sqft. Please verify."
- Diagonal check: if D1 and D2 differ by more than 50mm → warn: "Large diagonal variance (Xmm). Room may not be square. Please re-measure."

### Completion nudges
- Show progress ring on each room card (e.g., 6/9 fields complete)
- "3 items remaining" chip on the submit button area
- Prevent room collapse/save if mandatory fields are empty

### Sync nudges
- Persistent banner when offline: "📵 Offline – data saving locally"
- Green checkmark per field when saved to IndexedDB
- Sync progress bar when back online
- "18 photos uploading (12/18)" progress indicator

### Photo nudges
- Counter: "6/6 mandatory photos ✓" per room
- If trying to submit room without all 6 mandatory photos: "Please add: ceiling, floor photos"

---

## 15. SECURITY CHECKLIST (verify before any deployment)

- [ ] All Supabase tables have RLS enabled
- [ ] No service role key exposed to client/browser
- [ ] File uploads validated (type: jpg/png/pdf only, size < 50MB)
- [ ] Input sanitization on all text fields (Zod schema)
- [ ] CORS configured to production domain only
- [ ] Admin routes protected by middleware (role check)
- [ ] Audit log: any data change records who/when in `updated_by`, `updated_at`
- [ ] Photos in Supabase Storage bucket: private (signed URLs, not public)
- [ ] Rate limiting on auth endpoints (Supabase handles, verify in dashboard)
- [ ] No PII logged to console in production

---

## 16. PROMPTING GUIDE FOR AI (HOW TO USE THIS FILE)

When starting a new coding session, prefix your prompt with:
```
Read CONTEXT.md first. We are building the LS Services App (Livspace internal tool).
[Then your specific task]
```

Example prompts for Phase 1:

**Setting up:**
"Read CONTEXT.md. Set up the Next.js project with Tailwind, shadcn/ui, Supabase client, and Dexie.js. Apply Livspace brand colors from the context file."

**Database:**
"Read CONTEXT.md. Write the Supabase SQL migration for all Phase 1 tables with RLS policies."

**Checklist component:**
"Read CONTEXT.md. Build the Room Validation component (step 4 of checklist). It must save every input to IndexedDB immediately. Include ceiling height inputs with the validation rules from Section 6.1."

**Photo markup:**
"Read CONTEXT.md. Build the PhotoMarkup component using HTML Canvas. User taps to drop numbered pins, taps pin to add note, saves a marked version as a Blob."

**Report:**
"Read CONTEXT.md. Build the PDF report generator using jsPDF. Follow the structure in Section 11."

---

## 17. KNOWN ISSUES IN EXISTING TOOLS (don't replicate)

Reference tools to learn from but NOT copy:
- Existing app: https://ankj89.github.io/Livspace-Validation_App/
- Existing report gen: https://ankj89.github.io/Livspace-Validation_Report_Generator/

Issues to avoid:
- No authentication/roles in existing tools → must add
- No offline support in existing tools → must add
- Measurements not stored in canonical unit (mm) → store as mm always
- No photo annotation persistence → persist to DB
- Manual calculation errors → automate all calculations

---

## 18. QUESTIONS TO CLARIFY BEFORE CODING

Before Phase 1 dev starts, get answers to:
1. What is the exact format of PID? (e.g., LS-BLR-2026-045 or different?)
2. Share the HTML checklist file referenced — AI needs to parse all logic from it
3. Which cities to seed initially?
4. What is the exact list of KT questions currently in use?
5. Does the selfie photo at check-in go into the validation report? (assume yes)
6. Can a VL self-assign requests, or only VMs can assign? (assume VM only for now)
7. What is the exact format/template of the current validation Excel? (share file)

---

*End of context file. Version: 1.0 | April 2026*
*Do not modify this file without updating the version and date.*
