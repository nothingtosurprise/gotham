import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const SEV_COLORS = { CRITICAL: '#fc8181', HIGH: '#f6ad55', MEDIUM: '#f6e05e', LOW: '#68d391' };

export function AlertFeed({ alerts = [], liveAlerts = [] }) {
  const [filter, setFilter] = useState('ALL');
  const [acknowledged, setAcknowledged] = useState(new Set());

  const all = [...liveAlerts, ...alerts]
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  const filtered = filter === 'ALL' ? all : all.filter(a => a.severity === filter);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filter */}
      <div style={{ display: 'flex', gap: 3, padding: '5px 8px', borderBottom: '1px solid rgba(99,179,237,0.12)', background: 'rgba(0,0,0,0.2)', flexWrap: 'wrap' }}>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '2px 7px', fontSize: '0.48rem', letterSpacing: '0.1em',
            fontFamily: 'JetBrains Mono, monospace',
            border: `1px solid ${filter === s ? (SEV_COLORS[s] || '#63b3ed') : 'rgba(99,179,237,0.15)'}`,
            color: filter === s ? (SEV_COLORS[s] || '#63b3ed') : '#4a5568',
            background: filter === s ? `${(SEV_COLORS[s] || '#63b3ed')}12` : 'transparent',
            cursor: 'pointer'
          }}>{s}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.48rem', color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', alignSelf: 'center' }}>
          {filtered.filter(a => !acknowledged.has(a.id)).length} UNREAD
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, padding: '4px' }}>
        {filtered.slice(0, 40).map((alert, i) => {
          const ack = acknowledged.has(alert.id);
          return (
            <div key={alert.id || i}
              style={{
                padding: '7px 10px',
                border: `1px solid ${ack ? 'rgba(99,179,237,0.06)' : `${SEV_COLORS[alert.severity]}22`}`,
                background: ack ? 'rgba(0,0,0,0.1)' : `${SEV_COLORS[alert.severity]}06`,
                display: 'flex', gap: 8, alignItems: 'flex-start',
                transition: 'all 0.2s',
                animation: i === 0 && liveAlerts.includes(alert) ? 'feed-flash 0.5s ease' : 'none',
              }}>
              {/* Severity dot */}
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                background: ack ? '#2d3748' : SEV_COLORS[alert.severity],
                boxShadow: ack ? 'none' : `0 0 5px ${SEV_COLORS[alert.severity]}`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: '0.48rem', color: ack ? '#4a5568' : SEV_COLORS[alert.severity], letterSpacing: '0.12em', fontFamily: 'JetBrains Mono, monospace' }}>
                    {alert.severity} · {alert.source}
                  </span>
                  <span style={{ fontSize: '0.45rem', color: '#4a5568', fontFamily: 'JetBrains Mono, monospace' }}>
                    {tryFormat(alert.timestamp)}
                  </span>
                </div>
                <div style={{ fontSize: '0.58rem', color: ack ? '#4a5568' : '#a0aec0', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.4 }}>
                  {alert.message}
                </div>
              </div>
              <button
                onClick={() => setAcknowledged(prev => new Set([...prev, alert.id]))}
                style={{ fontSize: '0.42rem', color: ack ? '#2d3748' : '#4a5568', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', border: '1px solid', borderColor: ack ? '#1a2030' : '#2d3748', padding: '1px 5px', cursor: 'pointer', background: 'none', flexShrink: 0, transition: 'all 0.15s' }}
              >{ack ? 'ACK' : 'ACK'}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ThreatBoard({ threats = [] }) {
  const [sort, setSort] = useState('score');

  const sorted = [...threats].sort((a, b) => sort === 'score' ? b.score - a.score : sort === 'country' ? a.countryName?.localeCompare(b.countryName) : b.reports - a.reports);

  const countByType = threats.reduce((acc, t) => { acc[t.type] = (acc[t.type] || 0) + 1; return acc; }, {});

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 4, padding: '5px 8px', borderBottom: '1px solid rgba(99,179,237,0.12)', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)' }}>
        {Object.entries(countByType).slice(0, 5).map(([type, count]) => (
          <div key={type} style={{ padding: '1px 7px', fontSize: '0.45rem', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', border: '1px solid rgba(252,129,129,0.2)', color: '#fc8181', background: 'rgba(252,129,129,0.04)' }}>
            {type}: <b>{count}</b>
          </div>
        ))}
      </div>
      {/* Sort */}
      <div style={{ display: 'flex', gap: 3, padding: '4px 8px', borderBottom: '1px solid rgba(99,179,237,0.08)' }}>
        {['score', 'reports', 'country'].map(s => (
          <button key={s} onClick={() => setSort(s)} style={{
            padding: '1px 6px', fontSize: '0.45rem', letterSpacing: '0.1em',
            fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase',
            border: `1px solid ${sort === s ? '#63b3ed' : 'rgba(99,179,237,0.15)'}`,
            color: sort === s ? '#63b3ed' : '#4a5568',
            background: sort === s ? 'rgba(99,179,237,0.06)' : 'transparent', cursor: 'pointer'
          }}>SORT: {s}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.55rem', fontFamily: 'JetBrains Mono, monospace' }}>
          <thead>
            <tr style={{ background: 'rgba(99,179,237,0.03)', borderBottom: '1px solid rgba(99,179,237,0.1)' }}>
              {['IP ADDRESS', 'COUNTRY', 'TYPE', 'SCORE', 'REPORTS'].map(h => (
                <th key={h} style={{ padding: '5px 8px', textAlign: 'left', color: '#4a5568', letterSpacing: '0.1em', fontSize: '0.45rem', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 30).map((t, i) => {
              const color = t.score >= 90 ? '#fc8181' : t.score >= 70 ? '#f6ad55' : '#f6e05e';
              return (
                <tr key={i} style={{ borderBottom: '1px solid rgba(99,179,237,0.05)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,179,237,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '5px 8px', color: '#a0aec0', letterSpacing: '0.05em' }}>{t.ip}</td>
                  <td style={{ padding: '5px 8px', color: '#718096' }}>
                    <span style={{ padding: '1px 5px', border: '1px solid rgba(99,179,237,0.15)', color: '#63b3ed', fontSize: '0.45rem' }}>{t.country}</span>
                  </td>
                  <td style={{ padding: '5px 8px', color: '#718096', fontSize: '0.5rem' }}>{t.type}</td>
                  <td style={{ padding: '5px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ flex: 1, height: 2, background: 'rgba(99,179,237,0.1)' }}>
                        <div style={{ width: `${t.score}%`, height: '100%', background: color, boxShadow: `0 0 4px ${color}` }} />
                      </div>
                      <span style={{ color, width: 24, textAlign: 'right' }}>{t.score}</span>
                    </div>
                  </td>
                  <td style={{ padding: '5px 8px', color: '#718096' }}>{t.reports?.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function tryFormat(ts) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); }
  catch { return 'just now'; }
}
