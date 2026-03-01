# Layouts by Lenny - Development Prompt

## Project Overview

Build the "Layouts by Lenny" (LbL) website — a Next.js web application for a digital planner business selling GoodNotes-compatible planners through Etsy.

The site has multiple sections:
- **Landing page** (`/`) — Marketing, product info, FAQ
- **Planner Studio** (`/studio`) — Delivers pre-generated planner PDFs to customers (immediate priority)
- **Planner Generator** (`/generator`) — Custom planner builder (future phase)

This prompt focuses on the **landing page** and **Planner Studio** sections.

The Studio provides a wizard-based file selector and browse interface, tracks all downloads, and validates access via unique codes that customers receive after Etsy purchase.

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** MySQL (use Prisma ORM)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Deployment:** Self-hosted on Linux VPS (will use Docker/Coolify later)
- **File Storage:** Local filesystem on VPS

---

## Core Features

### 1. Access Code System

Customers receive an access code after Etsy purchase. Format: `LBL` + 8 hexadecimal characters (e.g., `LBL3A7F9C2B`).

- Single input field for code entry
- Codes grant access to specific languages and themes
- Codes can optionally expire
- Track code usage (but don't limit downloads)

### 2. Two Navigation Paths

After entering valid code, user chooses:

**"Help me pick"** → Wizard flow (step-by-step)
**"Browse all"** → Filter/grid view (all files at once)

### 3. Wizard Flow

Guides user through choices. Theme is already determined by their purchase — no theme selection needed.

1. **Language** — English / Nederlands (etc.)
   - Show flags or language names
   - Only show languages that have files for their theme
   
2. **Planner Type** — Full / Focus / Minimal
   - Show spread preview image (placeholder for now)
   - Show list of included template categories
   
3. **Week Start** — Monday / Sunday
   - Show spread preview comparing layouts
   - Skip this step for non-English languages (always Monday)
   
4. **Time Format** — 24h / AM/PM
   - Show spread preview comparing time columns
   - Skip this step for non-English languages (always 24h)
   
5. **Calendar Integration** — None / Google Calendar / Apple Calendar
   - Show icons only
   - Brief explanation of what this does

6. **Result** — Show summary + download button

### 4. Browse View

- Filter dropdowns: Theme, Planner Type, Week Start, Time Format, Calendar
- Grid of matching files with preview thumbnails
- Direct download buttons
- Filters remember state

### 5. Download Tracking

Log every download:
- Which file (full key path)
- Which access code
- IP address
- User agent
- Timestamp

### 6. Admin Dashboard

Protected admin area (`/admin`) to:
- View all purchases/access codes
- See download statistics (most popular files, downloads per day)
- Manually create access codes
- View individual code usage

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Purchase {
  id            Int       @id @default(autoincrement())
  accessCode    String    @unique @db.VarChar(12)
  email         String    @db.VarChar(255)
  theme         String    @db.VarChar(50) // Single theme: "dark-purple", "earth-natural", etc.
  etsyOrderId   String?   @db.VarChar(100)
  createdAt     DateTime  @default(now())
  expiresAt     DateTime?
  isActive      Boolean   @default(true)
  
  downloads     Download[]
  wizardSessions WizardSession[]
}

// Note: All purchases include ALL languages for the purchased theme

model Download {
  id           Int      @id @default(autoincrement())
  purchaseId   Int
  fileKey      String   @db.VarChar(150) // e.g., "en/dark-purple/full_mon_24h_google"
  ipAddress    String?  @db.VarChar(45)
  userAgent    String?  @db.Text
  downloadedAt DateTime @default(now())
  
  purchase     Purchase @relation(fields: [purchaseId], references: [id])
}

model WizardSession {
  id                  Int      @id @default(autoincrement())
  purchaseId          Int
  language            String?  @db.VarChar(10) // en, nl, de, etc.
  plannerType         String?  @db.VarChar(20) // full, focus, minimal
  weekStart           String?  @db.VarChar(10) // monday, sunday
  timeFormat          String?  @db.VarChar(10) // 24h, ampm
  calendarIntegration String?  @db.VarChar(20) // none, google, apple
  completed           Boolean  @default(false)
  createdAt           DateTime @default(now())
  
  purchase            Purchase @relation(fields: [purchaseId], references: [id])
}
```

---

## File Structure

### Application Structure

```
/lbl-website
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page (marketing)
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css
│   │   ├── studio/
│   │   │   ├── page.tsx                # Access code entry for studio
│   │   │   ├── [accessCode]/
│   │   │   │   ├── page.tsx            # Hub: wizard vs browse choice
│   │   │   │   ├── layout.tsx          # Validates code, provides context
│   │   │   │   ├── wizard/
│   │   │   │   │   └── page.tsx        # Wizard flow
│   │   │   │   └── browse/
│   │   │   │       └── page.tsx        # Filter/grid view
│   │   │   └── admin/
│   │   │       ├── page.tsx            # Admin dashboard
│   │   │       └── layout.tsx          # Admin auth check
│   │   ├── generator/                  # Future: custom planner builder
│   │   │   └── page.tsx                # Placeholder for now
│   │   └── api/
│   │       ├── studio/
│   │       │   ├── validate/route.ts   # POST: validate access code
│   │       │   ├── download/
│   │       │   │   └── [...fileKey]/route.ts  # GET: serve file + log
│   │       │   └── wizard/
│   │       │       └── session/route.ts    # POST: log wizard completion
│   │       └── admin/
│   │           ├── purchases/route.ts  # GET/POST purchases
│   │           └── stats/route.ts      # GET download stats
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   ├── landing/                    # Landing page components
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   └── FAQ.tsx
│   │   ├── studio/
│   │   │   ├── AccessCodeForm.tsx
│   │   │   ├── HubChoice.tsx
│   │   │   ├── wizard/
│   │   │   │   ├── WizardContainer.tsx
│   │   │   │   ├── StepLanguage.tsx
│   │   │   │   ├── StepPlannerType.tsx
│   │   │   │   ├── StepWeekStart.tsx
│   │   │   │   ├── StepTimeFormat.tsx
│   │   │   │   ├── StepCalendar.tsx
│   │   │   │   ├── StepResult.tsx
│   │   │   │   └── ProgressIndicator.tsx
│   │   │   ├── browse/
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   ├── FileGrid.tsx
│   │   │   │   └── FileCard.tsx
│   │   │   └── admin/
│   │   │       ├── PurchaseTable.tsx
│   │   │       ├── StatsCards.tsx
│   │   │       └── CreateCodeForm.tsx
│   │   └── shared/                     # Shared across studio/generator
│   │       ├── ThemePreview.tsx
│   │       └── PlannerTypeCard.tsx
│   ├── lib/
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   ├── auth.ts                     # Code validation helpers
│   │   ├── files.ts                    # File path resolution
│   │   ├── access-code.ts              # Generate LBL + hex codes
│   │   └── planner-configs.ts          # Template lists for each type
│   ├── types/
│   │   └── index.ts                    # TypeScript types
│   └── config/
│       ├── planner-types.ts            # Full/Focus/Minimal definitions
│       ├── themes.ts                   # Available themes
│       └── languages.ts                # Language configurations
├── public/
│   ├── images/                         # Landing page images
│   └── previews/                       # Planner preview images
├── files/                              # PDF files (outside public, served via API)
│   ├── en/
│   │   ├── dark-purple/
│   │   │   ├── full_mon_24h_none.pdf
│   │   │   ├── full_mon_24h_google.pdf
│   │   │   └── ...
│   │   └── ...
│   └── nl/
│       └── ...
├── .env.local
├── package.json
└── README.md
```

### File Naming Convention

PDFs: `{type}_{weekstart}_{timeformat}_{calendar}.pdf`

Examples:
- `full_mon_24h_none.pdf`
- `full_mon_24h_google.pdf`
- `full_mon_24h_apple.pdf`
- `full_mon_ampm_none.pdf`
- `full_sun_24h_google.pdf`
- `focus_mon_24h_none.pdf`
- `minimal_sun_ampm_apple.pdf`

Full path: `/files/{language}/{theme}/{filename}.pdf`

For non-English languages, only these variants exist:
- `{type}_mon_24h_none.pdf`
- `{type}_mon_24h_google.pdf`
- `{type}_mon_24h_apple.pdf`

---

## Configuration Data

### Planner Types (`/src/config/planner-types.ts`)

```typescript
export const plannerTypes = {
  full: {
    id: 'full',
    name: 'Full',
    tagline: 'Everything you need',
    description: 'Complete planner with 90+ templates including calendars, productivity tools, wellness trackers, finance pages, notes, paper types, and games.',
    templateCount: 90,
    categories: [
      'Yearly, Monthly, Weekly & Daily Calendars',
      'Productivity & To-Do Lists',
      'Finance & Budget Tracking',
      'Wellness & Meal Planning',
      'Habit & Goal Trackers',
      'Reflection & Journaling',
      'Notes (Ruled, Dotted, Cornell)',
      'Paper Types (Grid, Isometric, Music, Hex)',
      'Games (Tic-tac-toe, Connect Four, etc.)'
    ]
  },
  focus: {
    id: 'focus',
    name: 'Focus',
    tagline: 'Productivity essentials',
    description: 'Streamlined planner with 40+ templates focused on productivity, planning, and organization.',
    templateCount: 40,
    categories: [
      'Yearly, Monthly, Weekly & Daily Calendars',
      'Productivity & To-Do Lists',
      'Wellness & Meal Planning',
      'Habit & Goal Trackers',
      'Notes (Ruled, Dotted, Cornell)'
    ]
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Clean & simple',
    description: 'Essential planner with 17 core templates for straightforward planning.',
    templateCount: 17,
    categories: [
      'Yearly, Monthly, Weekly & Daily Calendars',
      'Basic To-Do Lists',
      'Simple Notes Pages'
    ]
  }
};
```

### Themes (`/src/config/themes.ts`)

```typescript
export const themes = {
  'earth-natural': {
    id: 'earth-natural',
    name: 'Earth Natural',
    description: 'Warm, organic tones',
    previewColor: '#8B7355'
  },
  'dark-purple': {
    id: 'dark-purple',
    name: 'Dark Purple',
    description: 'Deep purple dark mode',
    previewColor: '#2D1B4E'
  },
  'soft-rose': {
    id: 'soft-rose',
    name: 'Soft Rose',
    description: 'Gentle pink aesthetic',
    previewColor: '#E8B4B8'
  },
  'navy-professional': {
    id: 'navy-professional',
    name: 'Navy Professional',
    description: 'Clean, business-like',
    previewColor: '#1E3A5F'
  }
  // More themes can be added
};

export const themesByLanguage = {
  en: ['earth-natural', 'dark-purple', 'soft-rose', 'navy-professional'],
  nl: ['earth-natural', 'dark-purple', 'soft-rose', 'navy-professional']
};
```

### Languages (`/src/config/languages.ts`)

```typescript
export const languages = {
  en: {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    hasWeekStartOption: true,   // Can choose Monday or Sunday
    hasTimeFormatOption: true,  // Can choose 24h or AM/PM
    defaultWeekStart: 'monday',
    defaultTimeFormat: '24h'
  },
  nl: {
    id: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    hasWeekStartOption: false,  // Always Monday
    hasTimeFormatOption: false, // Always 24h
    defaultWeekStart: 'monday',
    defaultTimeFormat: '24h'
  }
  // Future: de, fr, es, it
};
```

---

## Key Implementation Details

### Access Code Generation

```typescript
// /src/lib/access-code.ts
import crypto from 'crypto';

export function generateAccessCode(): string {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `LBL${hex}`;
}

// Result: LBL3A7F9C2B
```

### Access Code Validation Flow

1. User enters code on `/studio` page
2. API validates code exists, is active, not expired
3. If valid, redirect to `/studio/[accessCode]` (hub page)
4. Layout for `[accessCode]` routes fetches purchase from DB
5. All child routes receive purchase context (including theme) via React Context
6. User has access to all languages, all variants, but only for their purchased theme

### File Serving

Files are NOT in `/public`. Served via API route that:
1. Validates access code from session/cookie
2. Checks requested file's theme matches user's purchased theme
3. Logs the download
4. Streams the file with proper headers

```typescript
// /src/app/api/studio/download/[...fileKey]/route.ts
// fileKey example: en/dark-purple/full_mon_24h_google

export async function GET(
  request: Request,
  { params }: { params: { fileKey: string[] } }
) {
  const fileKey = params.fileKey.join('/');
  const accessCode = request.headers.get('x-access-code'); // Or from cookie
  
  // 1. Validate access code
  // 2. Extract theme from fileKey, verify it matches purchase.theme
  // 3. Log download
  // 4. Stream file
}
```

### Wizard State Management

Use React state (useState/useReducer) in WizardContainer. On completion, log to wizard_sessions table for analytics.

```typescript
interface WizardState {
  step: number;
  language: 'en' | 'nl' | null; // More languages later
  plannerType: 'full' | 'focus' | 'minimal' | null;
  weekStart: 'monday' | 'sunday' | null;
  timeFormat: '24h' | 'ampm' | null;
  calendar: 'none' | 'google' | 'apple' | null;
}
```

### Conditional Wizard Steps

```typescript
function getWizardSteps(selectedLanguage: string | null) {
  const steps = ['language', 'plannerType'];
  
  if (selectedLanguage && languages[selectedLanguage]?.hasWeekStartOption) {
    steps.push('weekStart');
  }
  if (selectedLanguage && languages[selectedLanguage]?.hasTimeFormatOption) {
    steps.push('timeFormat');
  }
  
  steps.push('calendar', 'result');
  return steps;
}
```

---

## UI/UX Requirements

### Landing Page (`/`)

- Navigation: Logo + "Access Your Planners" button → `/studio`
- Hero section with headline, subheadline, and iPad mockup showing planner
- Brief features/benefits section (3-4 cards: "65+ Templates", "Calendar Integration", "Multiple Themes", "Works in GoodNotes & more")
- Theme preview strip (show the 4 launch themes)
- FAQ accordion (5-6 common questions)
- Footer with contact email and Etsy shop link

### Studio: Access Code Entry (`/studio`)

- Clean, centered layout
- LbL branding/logo at top
- Single input field for code
- "Access Your Planners" button
- Error state for invalid codes
- Loading state during validation
- Link back to landing page

### Studio: Hub Page (`/studio/[accessCode]`)

- Welcome message with their theme name displayed (e.g., "Welcome to your Dark Purple planner collection")
- Two large cards/buttons:
  - "Help me pick" — icon + description
  - "Browse all files" — icon + description
- Show theme preview/color

### Studio: Wizard (`/studio/[accessCode]/wizard`)

- Progress indicator at top (steps with icons)
- Large clickable cards for options
- Preview images where specified
- Back button on each step
- Smooth transitions between steps
- Mobile responsive (cards stack vertically)

### Studio: Browse View (`/studio/[accessCode]/browse`)

- Sticky filter bar at top
- Filter dropdowns: Language, Planner Type, Week Start, Time Format, Calendar
- No theme filter (already determined by purchase)
- Responsive grid (4 cols desktop, 2 tablet, 1 mobile)
- File cards show:
  - Language flag/label
  - Planner type badge
  - Options summary (Mon/24h/Google)
  - Download button
- "X files found" count

### Studio: Admin Dashboard (`/studio/admin`)

- Simple auth (environment variable password for now)
- Stats cards: Total purchases, Downloads today, Most popular file
- Table of recent purchases with search
- Form to create new access code

---

## Environment Variables

```env
DATABASE_URL="mysql://user:password@localhost:3306/lbl_website"
ADMIN_PASSWORD="your-secure-admin-password"
FILES_PATH="./files"
PREVIEWS_PATH="./public/previews"
NEXT_PUBLIC_APP_URL="https://layoutsbylenny.com"
```

Note: `FILES_PATH` and `PREVIEWS_PATH` use relative paths for development. In production with Coolify, these will be set to the appropriate absolute paths based on your deployment configuration.

---

## Development Phases

### Phase 1: Foundation
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Prisma with MySQL schema
- [ ] Install and configure shadcn/ui
- [ ] Create root layout with LbL branding
- [ ] Build basic landing page (`/`)
- [ ] Create studio access code entry page (`/studio`)
- [ ] Implement access code validation API

### Phase 2: Studio Core Flow
- [ ] Build hub page with two choices
- [ ] Implement wizard flow (all steps)
- [ ] Build browse view with filters
- [ ] Create file serving API with logging

### Phase 3: Polish
- [ ] Add preview images support
- [ ] Implement download tracking
- [ ] Build admin dashboard
- [ ] Add loading states and error handling
- [ ] Mobile responsiveness
- [ ] Expand landing page (FAQ, features)

### Phase 4: Future
- [ ] Planner Generator (`/generator`)
- [ ] User accounts (`/account`)
- [ ] Etsy API integration for automatic code generation
- [ ] Email delivery of access codes

---

## Notes

- This is a unified site: landing page, studio, and generator all in one Next.js app
- Preview images will be added later. Build the structure to support them but use placeholders initially.
- The spread preview images for wizard steps don't exist yet — use colored placeholder boxes with text for now.
- Preview images are organized by type:
  - Calendar pages (vary by variant): `/previews/{year}/{language}/{theme}/{category}/{subcategory}/{page}/{templateSet}/{weekStart}/{timeFormat}.png`
    - Example: `/previews/2026/en/default/calendar/daily/daily_overview/full/sun/ampm.png`
  - Standalone pages (same across variants): `/previews/{year}/{language}/{theme}/{category}/{subcategory}/{page}.png`
    - Example: `/previews/2026/en/default/standalone/notes_paper/cornell_ruled.png`
  - Use `src/lib/preview-paths.ts` utilities for building paths
- No authentication library needed yet — just cookie-based access code session and simple admin password.
- Keep the UI clean and minimal — target audience appreciates simplicity.
- Deployment will be via Coolify on a Linux VPS (paths handled via environment variables)

---

## Questions to Resolve During Development

1. Cookie vs URL-based access code persistence?
2. Should browse view show all themes user has access to, or filter by theme first?
3. Download button behavior: direct download or "preparing..." modal?
4. Landing page: minimal MVP or more complete marketing site first?


/data/lbl/planners/          ← shared volume on host

┌─────────────────────┐
│  calendar-generator │
│  (Python)           │
│  - batch jobs       │
│  - writes files     │
│  /app/output ───────┼──────┐
└─────────────────────┘      │
                             │
┌─────────────────────┐      │
│  calendar-gen-api   │      ├──→ same folder
│  (Python API)       │      │
│  - on-demand gen    │      │
│  /app/output ───────┼──────┤
└─────────────────────┘      │
                             │
┌─────────────────────┐      │
│  lbl-website        │      │
│  (Next.js)          │      │
│  - serves files     │      │
│  /app/files ────────┼──────┘
└─────────────────────┘