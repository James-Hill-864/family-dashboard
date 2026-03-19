# Family Dashboard

A full-screen family dashboard for always-on home displays. Built for Home Assistant.

## Features

- **Calendar** — Month/list views with Google Calendar sync (auto-syncs every 15 min)
- **Weather** — Current conditions + 7-day forecast (Met.no API)
- **Meal Planner** — Weekly meal grid with recipe picker
- **Recipe Box** — Save, import from URL, discover new recipes online
- **Grocery List** — Categorized shopping list, auto-generate from meal plan
- **Smart Home** — Media player controls via Home Assistant
- **Family Notes** — Shared sticky notes for the household
- **Chores & Todos** — Task management with assignments
- **Screensaver** — Photo slideshow from Google Drive with clock overlay
- **Notifications** — SMS (Twilio) and email (Gmail) alerts
- **Mobile App** — Dedicated mobile view at /mobile (installable as PWA)

## Configuration

### Required
| Option | Description |
|--------|-------------|
| `ha_base_url` | Your Home Assistant URL (e.g. `http://192.168.86.44:8123`) |
| `ha_token` | Long-lived access token from HA (Profile → Security → Long-Lived Access Tokens) |
| `family_name` | Your family name shown on the dashboard |

### Google Calendar & Photos
| Option | Description |
|--------|-------------|
| `google_client_id` | OAuth 2.0 Client ID from Google Cloud Console |
| `google_client_secret` | OAuth 2.0 Client Secret |
| `google_redirect_uri` | Set to `http://localhost:3000/api/google/callback` |

### Email Notifications
| Option | Description |
|--------|-------------|
| `gmail_user` | Your Gmail address |
| `gmail_app_password` | Gmail App Password (16 chars, from myaccount.google.com/apppasswords) |

### SMS Notifications
| Option | Description |
|--------|-------------|
| `twilio_account_sid` | Twilio Account SID |
| `twilio_auth_token` | Twilio Auth Token |
| `twilio_from_number` | Your Twilio phone number (e.g. `+18431234567`) |

### Push Notifications (optional)
| Option | Description |
|--------|-------------|
| `vapid_public_key` | VAPID public key (requires HTTPS to work) |
| `vapid_private_key` | VAPID private key |

## Access

- **Dashboard**: `http://YOUR_PI_IP:3000`
- **Mobile**: `http://YOUR_PI_IP:3000/mobile`
- **Settings**: Click the gear icon on the dashboard

## First-Time Setup

1. Install the add-on and configure `ha_base_url` and `ha_token`
2. Open the dashboard and go to Settings → Family to add family members and upload photos
3. To connect Google Calendar: Settings → Google Cal → Connect (follow the code paste flow)
4. For email: set `gmail_user` and `gmail_app_password` in add-on config, restart
5. For SMS: set Twilio credentials in add-on config, restart, then configure phone numbers in Settings → Notifications
