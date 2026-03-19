# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-screen family dashboard for always-on home display (1920x1200 landscape).
Built with Next.js 14 App Router, Prisma 7 + SQLite (via better-sqlite3 adapter), Tailwind CSS.

## Common Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma migrate dev --name <name>  # Create and apply a new migration
npx prisma generate  # Regenerate Prisma client
npx prisma db seed   # Seed the database with default family members
npx prisma studio    # Open Prisma Studio (database GUI)
```

## Project Structure

```
/
├── app/
│   ├── api/
│   │   ├── events/         # Calendar events CRUD
│   │   ├── ha/             # Home Assistant proxy (states, service calls)
│   │   ├── init/           # Scheduler initialization endpoint
│   │   ├── meals/          # Meal plan CRUD
│   │   ├── members/        # Family member CRUD
│   │   ├── schedules/      # Weekly schedules CRUD
│   │   ├── todos/          # To-do & chores CRUD
│   │   └── weather/        # Weather proxy (Met.no)
│   ├── globals.css         # Global styles + Tailwind
│   ├── layout.tsx          # Root layout (dark mode, viewport)
│   └── page.tsx            # Main dashboard page
├── components/
│   ├── Calendar.tsx        # Month/list calendar view
│   ├── Clock.tsx           # Live clock (client-side)
│   ├── FamilyMembers.tsx   # Member avatar grid + add form
│   ├── FamilySchedule.tsx  # Today's schedule
│   ├── MealPlanner.tsx     # Weekly meal grid
│   ├── Screensaver.tsx     # 5-min dimmer with clock overlay
│   ├── SmartHomePanel.tsx  # HA Cast device controls
│   ├── TodoList.tsx        # To-do / chore list (reusable)
│   └── WeatherWidget.tsx   # Current weather + 5-day forecast
├── lib/
│   ├── ha.ts               # Home Assistant API client
│   ├── prisma.ts           # Prisma client singleton (better-sqlite3 adapter)
│   ├── scheduler.ts        # node-schedule reminder checker
│   └── weather.ts          # Met.no weather fetcher + helpers
├── prisma/
│   ├── migrations/         # SQL migrations
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Default family member seed
├── prisma.config.ts        # Prisma 7 config (datasource URL)
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose for Pi deployment
└── deploy.sh               # rsync + docker deploy script
```

## Architecture Notes

### Prisma 7 (important)
Prisma 7 no longer accepts `url` in `schema.prisma`. The datasource URL is configured in `prisma.config.ts`. The `PrismaClient` must be instantiated with a driver adapter:

```ts
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'
const db = new Database(dbPath)
const adapter = new PrismaBetterSqlite3(db)
const prisma = new PrismaClient({ adapter })
```

### Layout
The main page uses a CSS Grid (12-column, 2-row) layout optimized for 1920x1200:
- Calendar: col-span-4, row-span-2 (left)
- Weather + Schedule: col-span-3 (middle-left)
- Smart Home: col-span-2, row-span-2 (middle-right)
- Todos + Chores: col-span-3 each (right)
- Meal Planner + Family: bottom row full width

### Weather
Uses Met.no Locationforecast API (no API key needed). Location is hardcoded in `lib/weather.ts` (Taylors, SC). Change `LAT`/`LON` constants to your location.

### Home Assistant
The HA panel shows `media_player` entities matching Cast/TV/speaker heuristics. Calls are proxied through `/api/ha/states` and `/api/ha/service` to keep the HA token server-side.

### Screensaver
Activates after 5 minutes of no touch/mouse/keyboard activity. Shows large clock on black background. Any interaction restores the dashboard.

### Reminder Scheduler
`lib/scheduler.ts` uses `node-schedule` to check for pending reminders every minute. Initialize via GET `/api/init` on app startup. Currently logs to console; FCM push notification sending is a TODO.

## Key Design Decisions

- Dark theme (`#0a0a0f` background) for always-on display
- Touch targets: `min-height: 60px` on all buttons (CSS global)
- No external auth — intended for trusted home network
- SQLite for zero-ops simplicity; data volume is tiny
- `output: 'standalone'` for Docker/Pi deployment

## Deployment Target

Raspberry Pi running Docker, connected to a 1920x1200 touchscreen display via HDMI. Browser runs in kiosk mode (Chromium `--kiosk http://localhost:3000`).
