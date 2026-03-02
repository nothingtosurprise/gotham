import { useState, useEffect } from 'react';
import Globe3D from './components/Globe3D';
import EntityGraph from './components/EntityGraph';
import CameraGrid from './components/CameraGrid';
import { AlertFeed, ThreatBoard } from './components/AlertThreat';
import {
  useFlights, useSatellites, useEarthquakes, useThreats,
  useNasaEvents, useCameras, useGraph, useAlerts, useSocket
} from './hooks/useData';
import './styles/globals.css';

// Nav icons as SVG strings
const ICONS = {
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  graph: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>,
  threat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  camera: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  alerts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  flights: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>,
};

const LAYERS = ['all', 'flights', 'earthquakes', 'threats', 'satellites'];

export default function App() {
  const [view, setView] = useState('globe');
  const [globeLayer, setGlobeLayer] = useState('all');
  const [selectedNode, setSelectedNode] = useState(null);
  const [sysTime, setSysTime] = useState(new Date());
  const [apiStatus, setApiStatus] = useState('CONNECTING');

  // Data hooks
  const { data: flightData } = useFlights();
  const { data: satData } = useSatellites();
  const { data: quakeData } = useEarthquakes();
  const { data: threatData } = useThreats();
  const { data: nasaData } = useNasaEvents();
  const { data: cameraData } = useCameras();
  const { data: graphData } = useGraph();
  const { data: alertData } = useAlerts();
  const { connected, liveAlerts, liveThreats } = useSocket();

  const flights = flightData?.flights || [];
  const satellites = satData?.satellites || [];
  const earthquakes = quakeData?.earthquakes || [];
  const threats = [...(threatData?.threats || []), ...liveThreats].slice(0, 80);
  const cameras = cameraData?.cameras || [];
  const alerts = alertData?.alerts || [];

  useEffect(() => {
    const t = setInterval(() => setSysTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setApiStatus(d.status || 'NOMINAL'))
      .catch(() => setApiStatus('DEGRADED'));
  }, []);

  const fmtTime = (d) => [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
    .map(v => String(v).padStart(2, '0')).join(':');

  const navItems = [
    { id: 'globe', label: 'GLOBE', icon: ICONS.globe },
    { id: 'graph', label: 'ENTITY', icon: ICONS.graph },
    { id: 'threats', label: 'THREAT', icon: ICONS.threat },
    { id: 'cameras', label: 'CCTV', icon: ICONS.camera },
    { id: 'alerts', label: 'ALERTS', icon: ICONS.alerts },
    { id: 'flights', label: 'FLIGHT', icon: ICONS.flights },
  ];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#080c10' }}>

      {/* ── TOP BAR ── */}
      <div style={{
        height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: '1px solid rgba(99,179,237,0.12)',
        background: '#0a0f18', flexShrink: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 22, height: 22, border: '1px solid #63b3ed', display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 10, height: 10, background: 'transparent', border: '1px solid #63b3ed', transform: 'rotate(45deg)' }} />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.25em', color: '#e2e8f0' }}>GOTHAM</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.5rem', color: '#4a5568', letterSpacing: '0.15em' }}>INTELLIGENCE PLATFORM</span>
        </div>

        {/* Center — sys info */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <StatusPill label="WS" value={connected ? 'CONNECTED' : 'DISCONNECTED'} ok={connected} />
          <StatusPill label="API" value={apiStatus} ok={apiStatus === 'NOMINAL'} />
          <StatusPill label="FLIGHTS" value={flights.length.toLocaleString()} ok={true} />
          <StatusPill label="THREATS" value={threats.length.toLocaleString()} ok={true} warn />
          <StatusPill label="ALERTS" value={`${liveAlerts.length + alerts.length}`} ok={false} crit />
        </div>

        {/* Right — clock */}
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#63b3ed', letterSpacing: '0.12em' }}>
          {fmtTime(sysTime)} UTC
          <span style={{ marginLeft: 12, fontSize: '0.5rem', color: '#4a5568' }}>{sysTime.toISOString().slice(0, 10)}</span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT NAV ── */}
        <div style={{ width: 52, borderRight: '1px solid rgba(99,179,237,0.12)', background: '#090d15', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 2, flexShrink: 0 }}>
          {navItems.map(item => (
            <button key={item.id} className={`nav-btn ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
              {item.icon}
              {item.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Alert badge */}
          {liveAlerts.length > 0 && (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.4)', display: 'grid', placeItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '0.5rem', color: '#fc8181', fontFamily: 'JetBrains Mono, monospace', animation: 'blink-anim 1.2s infinite' }}>{liveAlerts.length}</span>
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── GLOBE VIEW ── */}
          {view === 'globe' && (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 260px', gridTemplateRows: '1fr 180px', overflow: 'hidden' }}>
              {/* Globe */}
              <div style={{ gridRow: '1 / 3', position: 'relative', background: '#060a10' }}>
                <Globe3D
                  flights={flights}
                  satellites={satellites}
                  earthquakes={earthquakes}
                  threats={threats}
                  activeLayer={globeLayer}
                />
                {/* Layer controls */}
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {LAYERS.map(l => (
                    <button key={l} onClick={() => setGlobeLayer(l)} style={{
                      padding: '3px 10px', fontSize: '0.48rem', letterSpacing: '0.12em',
                      fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase',
                      border: `1px solid ${globeLayer === l ? '#63b3ed' : 'rgba(99,179,237,0.2)'}`,
                      color: globeLayer === l ? '#90cdf4' : '#4a5568',
                      background: globeLayer === l ? 'rgba(99,179,237,0.1)' : 'rgba(8,12,16,0.8)',
                      cursor: 'pointer', backdropFilter: 'blur(4px)',
                    }}>{l}</button>
                  ))}
                </div>
                {/* Stats overlay bottom left */}
                <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 12 }}>
                  <MiniStat label="AIRCRAFT" value={flights.length} color="#63b3ed" />
                  <MiniStat label="SATELLITES" value={satellites.length} color="#68d391" />
                  <MiniStat label="EARTHQUAKES" value={earthquakes.length} color="#f6e05e" />
                  <MiniStat label="THREATS" value={threats.length} color="#fc8181" />
                </div>
              </div>

              {/* Right panels */}
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(99,179,237,0.12)' }}>
                {/* Flight list */}
                <div className="panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div className="panel-header">
                    <span className="panel-title">FLIGHT TRACK</span>
                    <span className="badge badge-live">● LIVE</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
                    {flights.slice(0, 40).map((f, i) => (
                      <div key={i} style={{ padding: '4px 8px', borderBottom: '1px solid rgba(99,179,237,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.52rem', fontFamily: 'JetBrains Mono, monospace' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,179,237,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div>
                          <div style={{ color: '#a0aec0', letterSpacing: '0.06em' }}>{f.callsign || f.icao24}</div>
                          <div style={{ color: '#4a5568', fontSize: '0.45rem' }}>{f.origin_country}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#63b3ed' }}>{f.altitude ? Math.round(f.altitude).toLocaleString() + 'm' : '—'}</div>
                          <div style={{ color: '#4a5568', fontSize: '0.45rem' }}>{f.velocity ? Math.round(f.velocity) + 'kts' : '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NASA Events */}
                <div className="panel" style={{ height: 160, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(99,179,237,0.12)' }}>
                  <div className="panel-header">
                    <span className="panel-title">NASA EVENTS</span>
                    <span className="badge badge-nominal">EONET</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
                    {(nasaData?.events || []).slice(0, 10).map((e, i) => (
                      <div key={i} style={{ padding: '4px 8px', borderBottom: '1px solid rgba(99,179,237,0.05)', fontSize: '0.52rem', fontFamily: 'JetBrains Mono, monospace' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#a0aec0' }}>{e.title?.slice(0, 22)}</span>
                          <span style={{ fontSize: '0.45rem', padding: '1px 4px', border: '1px solid rgba(99,179,237,0.2)', color: '#63b3ed' }}>{e.category}</span>
                        </div>
                      </div>
                    ))}
                    {!nasaData && <div style={{ padding: '8px', fontSize: '0.5rem', color: '#4a5568', fontFamily: 'JetBrains Mono, monospace' }}>LOADING NASA FEED...</div>}
                  </div>
                </div>
              </div>

              {/* Bottom live alerts ticker */}
              <div style={{ gridColumn: '1', borderTop: '1px solid rgba(99,179,237,0.12)', overflow: 'hidden', display: 'flex', alignItems: 'center', background: '#060a10' }}>
                <div style={{ padding: '0 12px', background: 'rgba(252,129,129,0.08)', borderRight: '1px solid rgba(252,129,129,0.2)', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.5rem', color: '#fc8181', letterSpacing: '0.15em', fontFamily: 'JetBrains Mono, monospace' }} className="blink">● ALERTS</span>
                </div>
                <div style={{ flex: 1, overflow: 'hidden', padding: '0 12px' }}>
                  <div style={{ display: 'flex', gap: 32, animation: 'ticker-scroll 40s linear infinite', whiteSpace: 'nowrap' }}>
                    {[...liveAlerts, ...alerts].slice(0, 10).map((a, i) => (
                      <span key={i} style={{ fontSize: '0.55rem', color: '#718096', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>
                        <span style={{ color: a.severity === 'CRITICAL' ? '#fc8181' : a.severity === 'HIGH' ? '#f6ad55' : '#63b3ed' }}>[{a.severity}]</span>
                        {' '}{a.message}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ENTITY GRAPH VIEW ── */}
          {view === 'graph' && (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px', overflow: 'hidden' }}>
              <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header">
                  <span className="panel-title">ENTITY RELATIONSHIP GRAPH</span>
                  <span className="badge badge-active">{graphData?.nodes?.length || 0} NODES</span>
                </div>
                <div style={{ flex: 1 }}>
                  {graphData ? <EntityGraph data={graphData} onNodeSelect={setSelectedNode} /> : <LoadingPanel />}
                </div>
              </div>
              {/* Inspector */}
              <div className="panel" style={{ borderLeft: '1px solid rgba(99,179,237,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="panel-header">
                  <span className="panel-title">OBJECT INSPECTOR</span>
                </div>
                <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
                  {selectedNode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ padding: '8px 10px', border: '1px solid rgba(99,179,237,0.2)', background: 'rgba(99,179,237,0.03)' }}>
                        <div style={{ fontSize: '0.5rem', color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', marginBottom: 4 }}>ENTITY ID</div>
                        <div style={{ fontSize: '0.75rem', color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace' }}>{selectedNode.label}</div>
                      </div>
                      {[
                        ['TYPE', selectedNode.type],
                        ['RISK LEVEL', selectedNode.risk],
                        ['COUNTRY', selectedNode.country],
                        ['CONNECTIONS', selectedNode.connections],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid rgba(99,179,237,0.06)', fontSize: '0.55rem', fontFamily: 'JetBrains Mono, monospace' }}>
                          <span style={{ color: '#4a5568', letterSpacing: '0.1em' }}>{k}</span>
                          <span style={{ color: k === 'RISK LEVEL' ? ({ CRITICAL: '#fc8181', HIGH: '#f6ad55', MEDIUM: '#f6e05e', LOW: '#68d391' }[v]) : '#a0aec0' }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: '0.48rem', color: '#4a5568', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>LINKED ENTITIES</div>
                        {(graphData?.links || []).filter(l => l.source === selectedNode.id || l.target === selectedNode.id).map((l, i) => (
                          <div key={i} style={{ padding: '4px 8px', marginBottom: 2, border: '1px solid rgba(99,179,237,0.08)', fontSize: '0.5rem', fontFamily: 'JetBrains Mono, monospace', color: '#718096' }}>
                            {l.type.replace(/_/g,' ')} → {l.source === selectedNode.id ? l.target : l.source}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#4a5568', fontSize: '0.6rem', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', marginTop: 40 }}>
                      SELECT A NODE<br />TO INSPECT
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── THREAT VIEW ── */}
          {view === 'threats' && (
            <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="panel-header">
                <span className="panel-title">THREAT INTELLIGENCE BOARD</span>
                <span className="badge badge-live">● LIVE</span>
              </div>
              <ThreatBoard threats={threats} />
            </div>
          )}

          {/* ── CAMERAS VIEW ── */}
          {view === 'cameras' && (
            <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="panel-header">
                <span className="panel-title">GLOBAL SURVEILLANCE — PUBLIC FEEDS</span>
                <span className="badge badge-live">● MONITORING</span>
              </div>
              <CameraGrid cameras={cameras} />
            </div>
          )}

          {/* ── ALERTS VIEW ── */}
          {view === 'alerts' && (
            <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="panel-header">
                <span className="panel-title">ALERT FEED</span>
                <span className="badge badge-live">● {liveAlerts.length + alerts.length} ACTIVE</span>
              </div>
              <AlertFeed alerts={alerts} liveAlerts={liveAlerts} />
            </div>
          )}

          {/* ── FLIGHTS VIEW ── */}
          {view === 'flights' && (
            <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="panel-header">
                <span className="panel-title">GLOBAL FLIGHT TRACKING — OPENSKY NETWORK</span>
                <span className="badge badge-live">● {flights.length} AIRCRAFT</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.57rem', fontFamily: 'JetBrains Mono, monospace' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#0a0f18', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid rgba(99,179,237,0.12)' }}>
                      {['CALLSIGN', 'ICAO24', 'COUNTRY', 'ALTITUDE', 'VELOCITY', 'HEADING', 'STATUS'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#4a5568', letterSpacing: '0.1em', fontSize: '0.48rem', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {flights.map((f, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(99,179,237,0.04)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,179,237,0.025)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '5px 10px', color: '#90cdf4', letterSpacing: '0.06em' }}>{f.callsign || '——'}</td>
                        <td style={{ padding: '5px 10px', color: '#718096' }}>{f.icao24}</td>
                        <td style={{ padding: '5px 10px', color: '#718096' }}>{f.origin_country}</td>
                        <td style={{ padding: '5px 10px', color: '#a0aec0' }}>{f.altitude ? `${Math.round(f.altitude).toLocaleString()}m` : '—'}</td>
                        <td style={{ padding: '5px 10px', color: '#a0aec0' }}>{f.velocity ? `${Math.round(f.velocity)} kt` : '—'}</td>
                        <td style={{ padding: '5px 10px', color: '#718096' }}>{f.heading ? `${Math.round(f.heading)}°` : '—'}</td>
                        <td style={{ padding: '5px 10px' }}>
                          <span style={{ fontSize: '0.45rem', padding: '1px 5px', border: `1px solid ${f.on_ground ? 'rgba(104,211,145,0.3)' : 'rgba(99,179,237,0.3)'}`, color: f.on_ground ? '#68d391' : '#63b3ed' }}>
                            {f.on_ground ? 'GROUND' : 'AIRBORNE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ── */}
      <div style={{ height: 24, display: 'flex', alignItems: 'center', padding: '0 12px', borderTop: '1px solid rgba(99,179,237,0.08)', background: '#070b12', flexShrink: 0, gap: 20 }}>
        <span style={{ fontSize: '0.48rem', color: '#2d3748', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>GOTHAM v1.0.0</span>
        <span style={{ fontSize: '0.48rem', color: '#2d3748', fontFamily: 'JetBrains Mono, monospace' }}>|</span>
        <span style={{ fontSize: '0.48rem', color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>
          DATA: OPENSKY · USGS · NASA EONET · ABUSEIPDB · CELESTRAK
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.48rem', color: connected ? '#68d391' : '#fc8181', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
          {connected ? '● LIVE' : '○ OFFLINE'}
        </span>
      </div>

      <style>{`
        @keyframes ticker-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
}

function StatusPill({ label, value, ok, warn, crit }) {
  const color = crit ? '#fc8181' : warn ? '#f6ad55' : ok ? '#68d391' : '#fc8181';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.5rem', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>
      <span style={{ color: '#4a5568' }}>{label}</span>
      <span style={{ color, padding: '1px 5px', border: `1px solid ${color}40`, background: `${color}0a` }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: 'rgba(8,12,16,0.85)', padding: '5px 10px', border: `1px solid ${color}30`, backdropFilter: 'blur(4px)' }}>
      <div style={{ fontSize: '0.45rem', color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color, fontFamily: 'JetBrains Mono, monospace' }}>{value.toLocaleString()}</div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: 32, height: 32, border: '1px solid rgba(99,179,237,0.3)', borderTop: '1px solid #63b3ed', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.55rem', color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em' }}>LOADING DATA...</span>
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
