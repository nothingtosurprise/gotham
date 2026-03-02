# GOTHAM — Intelligence Platform
> Palantir Gotham-inspired full-stack intelligence dashboard

---

## STACK
- **Frontend**: React + Vite + Three.js (3D Globe) + D3.js (Entity Graph)
- **Backend**: Node.js + Express + Socket.IO (WebSocket real-time)
- **APIs**: OpenSky (flights), USGS (earthquakes), NASA EONET (events), AbuseIPDB (threats), Celestrak (satellites)

---

## QUICK START

### 1. Clone & setup

```bash
# Backend
cd backend
cp .env.example .env
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Get API Keys (all free)

| API | URL | Notes |
|-----|-----|-------|
| NASA | https://api.nasa.gov | Instant, free |
| AbuseIPDB | https://www.abuseipdb.com/register | Free 1000 req/day |
| OpenSky | https://opensky-network.org/index.php?option=com_users&view=registration | Optional, works without |

Add keys to `backend/.env`:
```
NASA_API_KEY=your_key_here
ABUSEIPDB_KEY=your_key_here
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password
```

### 3. Run

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Running at http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Running at http://localhost:5173
```

Open http://localhost:5173

---

## FEATURES

### 🌍 3D Globe (Three.js)
- Interactive WebGL globe with drag rotation
- Live flight positions (OpenSky Network)
- Earthquake locations (USGS real-time feed)
- Cyber threat origins by country
- Satellite positions (Celestrak)
- Layer toggle: flights / earthquakes / threats / satellites / all
- Stars background, atmospheric glow, grid overlay

### 🕸️ Entity Graph (D3.js force simulation)
- Interactive node-link graph
- Entity types: Person, Organization, IP, Domain, Location, Transaction, Device
- Risk levels: CRITICAL / HIGH / MEDIUM / LOW with color coding
- Drag nodes, zoom/pan
- Filter by entity type
- Object Inspector panel — click node to see all linked entities & metadata
- Pulsing animation on CRITICAL nodes

### 🛡️ Threat Intelligence Board
- Live threat feed (AbuseIPDB when key provided, simulated otherwise)
- IP addresses, countries, threat types, confidence scores
- Sortable table: by score / reports / country
- Visual score bars per entry
- Real-time WebSocket updates

### 📹 CCTV / Camera Grid
- Public traffic & landmark camera feeds
- 12 global locations: Times Square, Tokyo Shibuya, London Eye, etc.
- Grid layouts: 2×2, 2×3, 2×4
- Click camera to expand fullscreen with HUD overlay
- Live/buffering/offline status indicators
- Corner bracket HUD aesthetic

### 🔔 Alert Feed
- Real-time alert push via WebSocket every 8 seconds
- Severity levels: CRITICAL / HIGH / MEDIUM / LOW
- Acknowledge alerts
- Source classification: SIGINT / OSINT / HUMINT / GEOINT / CYBER
- Live scrolling ticker at bottom of globe view

### ✈️ Flight Tracking
- Full table view of all tracked aircraft
- Callsign, ICAO24, country, altitude, velocity, heading, status
- AIRBORNE / GROUND status badges
- Auto-refreshes every 15 seconds via OpenSky API

---

## API ENDPOINTS

```
GET  /api/health          — System health check
GET  /api/flights         — Flight positions (OpenSky)
GET  /api/satellites      — Satellite positions (Celestrak)
GET  /api/earthquakes     — Earthquake feed (USGS)
GET  /api/threats         — Threat IPs (AbuseIPDB)
GET  /api/nasa/events     — Earth events (NASA EONET)
GET  /api/cameras         — Public camera list
GET  /api/graph           — Entity relationship graph
GET  /api/alerts          — Alert feed

WS  socket.io            — Real-time alerts, threats, flight updates
```

---

## DEPLOY TO VERCEL + RAILWAY

**Backend → Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli
railway login
cd backend
railway up
```

**Frontend → Vercel:**
```bash
# Update vite.config.js proxy target to your Railway URL
cd frontend
npx vercel
```

---

## ARCHITECTURE

```
gotham/
├── backend/
│   ├── server.js        ← Express + Socket.IO + all API routes
│   ├── .env.example     ← API keys template
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Globe3D.jsx       ← Three.js 3D globe
    │   │   ├── EntityGraph.jsx   ← D3 force graph
    │   │   ├── CameraGrid.jsx    ← CCTV feed grid
    │   │   └── AlertThreat.jsx   ← Alerts + threat board
    │   ├── hooks/
    │   │   └── useData.js        ← All API + WebSocket hooks
    │   ├── styles/
    │   │   └── globals.css       ← Palantir aesthetic tokens
    │   ├── App.jsx               ← Main layout + navigation
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js   ← Proxy config
    └── package.json
```

---

## NOTES ON CCTV CAMERAS
All cameras listed are **publicly accessible streams only** — EarthCam public feeds, public traffic cameras, and YouTube live streams. No private or unauthorized access.

---

Built with ❤️ — Full stack Palantir Gotham dupe
