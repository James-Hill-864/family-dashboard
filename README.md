# Family Dashboard

A full-screen family dashboard web app built with Next.js 14, designed for always-on display on a touchscreen (e.g., Raspberry Pi with a 1920x1200 display).

## Features

- Live clock with screensaver (dims after 5 minutes of inactivity)
- Weather widget (powered by Met.no, no API key required)
- Monthly/list calendar view with color-coded events per family member
- Daily schedule view
- Smart Home panel (Home Assistant Cast device control)
- To-Do and Chore lists with assignees
- Weekly meal planner
- Family member management

## Prerequisites

- Node.js 20+
- npm
- Docker & Docker Compose (for deployment)
- Home Assistant instance (optional, for Smart Home panel)

## Local Development

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Edit `.env` with your values (see Environment Variables below).

4. Run the database migration and seed:

```bash
npx prisma migrate dev
npx prisma db seed
```

5. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite file path | `file:./dev.db` |
| `HA_BASE_URL` | Home Assistant base URL | `http://homeassistant.local:8123` |
| `HA_TOKEN` | Home Assistant long-lived access token | - |
| `NEXT_PUBLIC_FAMILY_NAME` | Family name shown in header | `Our Family` |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase config for push notifications | - |

## Raspberry Pi Deployment

1. Set environment variables on your Pi (copy `.env` or use `PI_HOST`, `PI_USER` env vars).

2. Run the deploy script from your development machine:

```bash
PI_HOST=raspberrypi.local PI_USER=pi ./deploy.sh
```

This will rsync the project files and rebuild the Docker container on the Pi.

## Home Assistant Setup

1. In Home Assistant, go to **Profile -> Long-Lived Access Tokens** and create a token.
2. Set `HA_TOKEN` in your `.env`.
3. Set `HA_BASE_URL` to your Home Assistant URL.
4. The Smart Home panel will show `media_player` entities that are Cast devices, TVs, or speakers.

## Docker

Build and run manually:

```bash
docker compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

SQLite data is persisted in a Docker volume (`dashboard-data`).
