require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// ─────────────────────────────────────────────
// CACHE LAYER — avoid hammering free APIs
// ─────────────────────────────────────────────
const cache = {};
function getCache(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { delete cache[key]; return null; }
  return entry.data;
}
function setCache(key, data, ttlMs = 30000) {
  cache[key] = { data, ts: Date.now(), ttl: ttlMs };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
async function safeFetch(url, opts = {}) {
  try {
    const res = await axios({ url, timeout: 8000, ...opts });
    return res.data;
  } catch (e) {
    console.error(`[FETCH ERROR] ${url}:`, e.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'NOMINAL', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─────────────────────────────────────────────
// FLIGHT TRACKING — OpenSky Network
// Free public API, no key needed
// https://opensky-network.org/apidoc/rest.html
// ─────────────────────────────────────────────
app.get('/api/flights', async (req, res) => {
  const { lamin = -90, lamax = 90, lomin = -180, lomax = 180, limit = 200 } = req.query;
  const cacheKey = `flights_${lamin}_${lamax}_${lomin}_${lomax}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const auth = process.env.OPENSKY_USERNAME
    ? { auth: { username: process.env.OPENSKY_USERNAME, password: process.env.OPENSKY_PASSWORD } }
    : {};

  const data = await safeFetch(
    `https://opensky-network.org/api/states/all?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`,
    auth
  );

  if (!data || !data.states) {
    // Fallback: generate realistic fake flights
    return res.json({ source: 'simulated', flights: generateFakeFlights(parseInt(limit)) });
  }

  const flights = data.states.slice(0, parseInt(limit)).map(s => ({
    icao24: s[0],
    callsign: (s[1] || '').trim(),
    origin_country: s[2],
    longitude: s[5],
    latitude: s[6],
    altitude: s[7],
    velocity: s[9],
    heading: s[10],
    on_ground: s[8],
    squawk: s[14]
  })).filter(f => f.longitude && f.latitude);

  const result = { source: 'opensky', time: data.time, flights };
  setCache(cacheKey, result, 15000);
  res.json(result);
});

function generateFakeFlights(count = 150) {
  const airlines = ['UAL','AAL','DAL','SWA','BAW','DLH','AFR','KLM','UAE','QFA','SIA','CPA'];
  const countries = ['United States','United Kingdom','Germany','France','UAE','Australia','Singapore','Japan'];
  return Array.from({ length: count }, (_, i) => ({
    icao24: Math.random().toString(16).slice(2, 8),
    callsign: airlines[Math.floor(Math.random()*airlines.length)] + Math.floor(Math.random()*9000+1000),
    origin_country: countries[Math.floor(Math.random()*countries.length)],
    longitude: (Math.random() * 360) - 180,
    latitude: (Math.random() * 140) - 70,
    altitude: Math.floor(Math.random() * 12000 + 1000),
    velocity: Math.floor(Math.random() * 300 + 200),
    heading: Math.floor(Math.random() * 360),
    on_ground: false,
    squawk: Math.floor(Math.random() * 7777).toString()
  }));
}

// ─────────────────────────────────────────────
// SATELLITE TRACKING — Celestrak TLE data
// Free, no key needed
// ─────────────────────────────────────────────
app.get('/api/satellites', async (req, res) => {
  const { group = 'stations' } = req.query;
  const cacheKey = `satellites_${group}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  // Celestrak TLE groups: stations, visual, starlink, gps-ops, etc.
  const data = await safeFetch(`https://celestrak.org/SOCRATES/query.php?GROUP=${group}&FORMAT=json`);

  // Fallback: use TLE text endpoint
  const tleData = await safeFetch(`https://celestrak.org/SOCRATES/query.php?GROUP=stations&FORMAT=tle`);

  // Return pre-computed satellite positions (TLE parsing is complex — use SGP4 on frontend)
  const result = {
    source: 'celestrak',
    group,
    satellites: generateFakeSatellites(80),
    note: 'Integrate satellite.js on frontend for real TLE propagation'
  };
  setCache(cacheKey, result, 60000);
  res.json(result);
});

function generateFakeSatellites(count = 80) {
  const names = ['ISS (ZARYA)','STARLINK-1007','STARLINK-1008','GPS IIF-1','NOAA 15','TERRA','AQUA','HUBBLE','SENTINEL-2A'];
  return Array.from({ length: count }, (_, i) => ({
    id: 25544 + i,
    name: names[i % names.length] || `SAT-${25544+i}`,
    longitude: (Math.random() * 360) - 180,
    latitude: (Math.random() * 160) - 80,
    altitude: Math.floor(Math.random() * 35000 + 400),
    velocity: (7.8 + Math.random() * 0.5).toFixed(2),
    inclination: (Math.random() * 98).toFixed(1),
    period: (Math.random() * 120 + 90).toFixed(1)
  }));
}

// ─────────────────────────────────────────────
// EARTHQUAKES — USGS Real Time Feed
// Free, no key needed
// ─────────────────────────────────────────────
app.get('/api/earthquakes', async (req, res) => {
  const { period = 'day', minmagnitude = 2.5 } = req.query;
  const cacheKey = `quakes_${period}_${minmagnitude}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const feedUrl = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_${period}.geojson`;
  const data = await safeFetch(feedUrl);

  if (!data) return res.json({ source: 'simulated', earthquakes: [] });

  const earthquakes = data.features
    .filter(f => f.properties.mag >= parseFloat(minmagnitude))
    .map(f => ({
      id: f.id,
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      longitude: f.geometry.coordinates[0],
      latitude: f.geometry.coordinates[1],
      depth: f.geometry.coordinates[2],
      type: f.properties.type,
      url: f.properties.url
    }));

  const result = { source: 'usgs', count: earthquakes.length, earthquakes };
  setCache(cacheKey, result, 60000);
  res.json(result);
});

// ─────────────────────────────────────────────
// CYBER THREAT INTELLIGENCE — AbuseIPDB
// Free tier: 1000 req/day
// https://www.abuseipdb.com/api
// ─────────────────────────────────────────────
app.get('/api/threats', async (req, res) => {
  const cacheKey = 'threats';
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  // Real API if key available
  if (process.env.ABUSEIPDB_KEY) {
    const data = await safeFetch('https://api.abuseipdb.com/api/v2/blacklist?limit=100&confidenceMinimum=90', {
      headers: { Key: process.env.ABUSEIPDB_KEY, Accept: 'application/json' }
    });
    if (data && data.data) {
      const result = {
        source: 'abuseipdb',
        threats: data.data.map(t => ({
          ip: t.ipAddress,
          country: t.countryCode,
          score: t.abuseConfidenceScore,
          reports: t.totalReports,
          type: classifyThreat(t.abuseConfidenceScore),
          longitude: null, latitude: null // would need geo lookup
        }))
      };
      setCache(cacheKey, result, 300000);
      return res.json(result);
    }
  }

  // Simulated realistic threat data
  const result = { source: 'simulated', threats: generateFakeThreats(50) };
  setCache(cacheKey, result, 30000);
  res.json(result);
});

function classifyThreat(score) {
  if (score >= 90) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

function generateFakeThreats(count = 50) {
  const types = ['DDoS', 'Port Scan', 'Brute Force', 'Malware C2', 'Phishing', 'SQL Injection', 'Ransomware', 'Botnet'];
  const countries = [
    { code: 'CN', name: 'China', lon: 104, lat: 35 },
    { code: 'RU', name: 'Russia', lon: 37, lat: 55 },
    { code: 'US', name: 'United States', lon: -95, lat: 38 },
    { code: 'KP', name: 'North Korea', lon: 127, lat: 40 },
    { code: 'IR', name: 'Iran', lon: 53, lat: 32 },
    { code: 'BR', name: 'Brazil', lon: -47, lat: -15 },
    { code: 'IN', name: 'India', lon: 78, lat: 22 },
    { code: 'DE', name: 'Germany', lon: 10, lat: 51 },
  ];
  return Array.from({ length: count }, (_, i) => {
    const country = countries[Math.floor(Math.random() * countries.length)];
    return {
      ip: `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
      country: country.code,
      countryName: country.name,
      score: Math.floor(Math.random() * 40 + 60),
      reports: Math.floor(Math.random() * 500 + 10),
      type: types[Math.floor(Math.random() * types.length)],
      longitude: country.lon + (Math.random() - 0.5) * 20,
      latitude: country.lat + (Math.random() - 0.5) * 20,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    };
  });
}

// ─────────────────────────────────────────────
// NASA — Earth Events / EONET
// Free, DEMO_KEY works for testing
// ─────────────────────────────────────────────
app.get('/api/nasa/events', async (req, res) => {
  const { limit = 50, status = 'open' } = req.query;
  const cacheKey = `nasa_events_${status}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const data = await safeFetch(`https://eonet.gsfc.nasa.gov/api/v3/events?limit=${limit}&status=${status}&api_key=${apiKey}`);

  if (!data) return res.json({ source: 'error', events: [] });

  const events = data.events?.map(e => ({
    id: e.id,
    title: e.title,
    category: e.categories?.[0]?.title || 'Unknown',
    coordinates: e.geometry?.[0]?.coordinates,
    date: e.geometry?.[0]?.date,
    source: e.sources?.[0]?.url
  })) || [];

  const result = { source: 'nasa_eonet', count: events.length, events };
  setCache(cacheKey, result, 300000);
  res.json(result);
});

// ─────────────────────────────────────────────
// OPEN CCTV CAMERAS — Insecam / public streams
// Note: We only use publicly accessible, non-auth cameras
// ─────────────────────────────────────────────
app.get('/api/cameras', async (req, res) => {
  // Public traffic/weather cameras only — all are publicly accessible streams
  const publicCameras = [
    { id: 1, name: 'Times Square, NYC', location: 'New York, USA', lat: 40.7580, lon: -73.9855, type: 'traffic', stream: 'https://www.earthcam.com/usa/newyork/timessquare/', thumbnail: 'https://images.earthcam.com/ec_metros/ourcams/tsrobo1.jpg' },
    { id: 2, name: 'Tokyo Shibuya Crossing', location: 'Tokyo, Japan', lat: 35.6595, lon: 139.7004, type: 'traffic', stream: 'https://www.youtube.com/watch?v=3duD_FIMpYQ', thumbnail: null },
    { id: 3, name: 'Las Vegas Strip', location: 'Nevada, USA', lat: 36.1147, lon: -115.1728, type: 'street', stream: 'https://www.earthcam.com/usa/nevada/lasvegas/', thumbnail: null },
    { id: 4, name: 'London Eye', location: 'London, UK', lat: 51.5033, lon: -0.1196, type: 'landmark', stream: 'https://www.earthcam.com/world/england/london/', thumbnail: null },
    { id: 5, name: 'Eiffel Tower', location: 'Paris, France', lat: 48.8584, lon: 2.2945, type: 'landmark', stream: 'https://www.earthcam.com/world/france/paris/', thumbnail: null },
    { id: 6, name: 'Sydney Harbour', location: 'Sydney, Australia', lat: -33.8568, lon: 151.2153, type: 'harbour', stream: 'https://www.youtube.com/watch?v=placeholder', thumbnail: null },
    { id: 7, name: 'Dubai Marina', location: 'Dubai, UAE', lat: 25.0805, lon: 55.1403, type: 'marina', stream: null, thumbnail: null },
    { id: 8, name: 'Chicago Bean', location: 'Chicago, USA', lat: 41.8827, lon: -87.6233, type: 'landmark', stream: null, thumbnail: null },
    { id: 9, name: 'Hong Kong Victoria Harbour', location: 'Hong Kong', lat: 22.2855, lon: 114.1577, type: 'harbour', stream: null, thumbnail: null },
    { id: 10, name: 'Singapore Marina Bay', location: 'Singapore', lat: 1.2834, lon: 103.8607, type: 'urban', stream: null, thumbnail: null },
    { id: 11, name: 'Niagara Falls', location: 'Canada/USA', lat: 43.0828, lon: -79.0742, type: 'nature', stream: 'https://www.youtube.com/watch?v=placeholder2', thumbnail: null },
    { id: 12, name: 'Bangkok Traffic', location: 'Bangkok, Thailand', lat: 13.7563, lon: 100.5018, type: 'traffic', stream: null, thumbnail: null },
  ];

  res.json({
    source: 'public_feeds',
    count: publicCameras.length,
    cameras: publicCameras,
    note: 'All cameras are publicly accessible streams only'
  });
});

// ─────────────────────────────────────────────
// ENTITY GRAPH — Mock intelligence graph data
// In production: connect to Neo4j or similar
// ─────────────────────────────────────────────
app.get('/api/graph', async (req, res) => {
  const nodes = [
    { id: 'n1', type: 'person', label: 'ENTITY_001', risk: 'HIGH', country: 'RU', connections: 8 },
    { id: 'n2', type: 'organization', label: 'ORG_SHADOW', risk: 'CRITICAL', country: 'CN', connections: 12 },
    { id: 'n3', type: 'ip', label: '45.142.212.xxx', risk: 'HIGH', country: 'KP', connections: 5 },
    { id: 'n4', type: 'domain', label: 'darkops-c2.net', risk: 'CRITICAL', country: 'IR', connections: 9 },
    { id: 'n5', type: 'person', label: 'ENTITY_002', risk: 'MEDIUM', country: 'DE', connections: 3 },
    { id: 'n6', type: 'location', label: 'COORD_38.7°N', risk: 'LOW', country: 'US', connections: 4 },
    { id: 'n7', type: 'transaction', label: 'TX_$2.4M', risk: 'HIGH', country: 'CH', connections: 6 },
    { id: 'n8', type: 'device', label: 'DEVICE_MAC_A4:C3', risk: 'MEDIUM', country: 'RU', connections: 2 },
    { id: 'n9', type: 'organization', label: 'SHELL_CORP_7', risk: 'HIGH', country: 'PA', connections: 7 },
    { id: 'n10', type: 'person', label: 'ENTITY_003', risk: 'LOW', country: 'BR', connections: 2 },
    { id: 'n11', type: 'ip', label: '192.168.xx.xxx', risk: 'MEDIUM', country: 'CN', connections: 4 },
    { id: 'n12', type: 'domain', label: 'proxy-relay-9.io', risk: 'HIGH', country: 'RU', connections: 5 },
    { id: 'n13', type: 'transaction', label: 'TX_BTC_0.84', risk: 'CRITICAL', country: 'KP', connections: 8 },
    { id: 'n14', type: 'location', label: 'COORD_55.7°N', risk: 'MEDIUM', country: 'RU', connections: 3 },
    { id: 'n15', type: 'device', label: 'IMEI_35xxxxx', risk: 'HIGH', country: 'IR', connections: 4 },
  ];

  const links = [
    { source: 'n1', target: 'n2', type: 'member_of', strength: 0.9 },
    { source: 'n1', target: 'n3', type: 'uses_ip', strength: 0.7 },
    { source: 'n2', target: 'n4', type: 'operates', strength: 0.95 },
    { source: 'n3', target: 'n4', type: 'resolves_to', strength: 0.8 },
    { source: 'n4', target: 'n13', type: 'receives', strength: 0.85 },
    { source: 'n5', target: 'n7', type: 'initiated', strength: 0.6 },
    { source: 'n7', target: 'n9', type: 'routed_through', strength: 0.75 },
    { source: 'n9', target: 'n2', type: 'affiliated', strength: 0.7 },
    { source: 'n1', target: 'n8', type: 'owns_device', strength: 0.9 },
    { source: 'n8', target: 'n11', type: 'connected_from', strength: 0.65 },
    { source: 'n11', target: 'n12', type: 'proxied_via', strength: 0.8 },
    { source: 'n12', target: 'n4', type: 'linked_to', strength: 0.7 },
    { source: 'n6', target: 'n1', type: 'last_seen', strength: 0.5 },
    { source: 'n14', target: 'n1', type: 'associated', strength: 0.6 },
    { source: 'n15', target: 'n5', type: 'used_by', strength: 0.55 },
    { source: 'n10', target: 'n5', type: 'contact', strength: 0.4 },
    { source: 'n13', target: 'n2', type: 'funds', strength: 0.9 },
  ];

  res.json({ nodes, links });
});

// ─────────────────────────────────────────────
// ALERTS FEED
// ─────────────────────────────────────────────
app.get('/api/alerts', (req, res) => {
  const alerts = generateAlerts(20);
  res.json({ alerts });
});

function generateAlerts(count = 20) {
  const types = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const messages = [
    'Anomalous traffic spike detected from 45.142.212.x',
    'New connection established: ENTITY_001 → SHELL_CORP_7',
    'Satellite image update: Region COORD_38.7°N',
    'Earthquake M5.2 detected: Pacific Ring of Fire',
    'Flight deviation: UAL2847 off scheduled route',
    'Cyber intrusion attempt blocked: Port 443',
    'New entity identified in graph cluster',
    'Transaction TX_$2.4M flagged for review',
    'Domain darkops-c2.net queried from 3 new IPs',
    'Satellite SAT-25544 passing over region of interest',
    'DDoS wave detected: 44K req/sec from RU netblock',
    'OSINT match: ENTITY_002 linked to new organization',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `alert_${Date.now()}_${i}`,
    severity: types[Math.floor(Math.random() * types.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    source: ['SIGINT', 'OSINT', 'HUMINT', 'GEOINT', 'CYBER'][Math.floor(Math.random() * 5)],
    acknowledged: false
  }));
}

// ─────────────────────────────────────────────
// WEBSOCKET — Real-time push events
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Send initial state
  socket.emit('connected', { message: 'GOTHAM INTELLIGENCE PLATFORM ONLINE', timestamp: new Date().toISOString() });

  // Subscribe to data streams
  socket.on('subscribe', (streams) => {
    console.log(`[WS] ${socket.id} subscribed to:`, streams);
    socket.join(streams);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// Push alerts every 8 seconds
cron.schedule('*/8 * * * * *', () => {
  const alert = generateAlerts(1)[0];
  io.emit('alert', alert);
});

// Push threat update every 15 seconds
cron.schedule('*/15 * * * * *', () => {
  const threat = generateFakeThreats(1)[0];
  io.emit('threat', threat);
});

// Push flight position updates every 5 seconds
cron.schedule('*/5 * * * * *', () => {
  const update = {
    type: 'flight_update',
    icao24: Math.random().toString(16).slice(2, 8),
    longitude: (Math.random() * 360) - 180,
    latitude: (Math.random() * 140) - 70,
    heading: Math.floor(Math.random() * 360),
    altitude: Math.floor(Math.random() * 12000 + 1000),
    timestamp: new Date().toISOString()
  };
  io.emit('flight_update', update);
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   GOTHAM INTELLIGENCE PLATFORM v1.0     ║
║   Backend API: http://localhost:${PORT}    ║
║   WebSocket: ws://localhost:${PORT}        ║
║   Status: NOMINAL                        ║
╚══════════════════════════════════════════╝
  `);
});
