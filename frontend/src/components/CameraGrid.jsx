import { useState } from 'react';

const STATUS = ['LIVE', 'LIVE', 'LIVE', 'BUFFERING', 'LIVE', 'OFFLINE', 'LIVE', 'LIVE', 'LIVE', 'LIVE', 'LIVE', 'LIVE'];

export default function CameraGrid({ cameras = [] }) {
  const [selected, setSelected] = useState(null);
  const [grid, setGrid] = useState('2x3');

  const gridCols = grid === '2x2' ? 2 : grid === '2x3' ? 3 : 4;

  if (selected) {
    const cam = cameras.find(c => c.id === selected);
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid rgba(99,179,237,0.12)', background: 'rgba(99,179,237,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setSelected(null)} style={{ color: '#63b3ed', fontSize: '0.6rem', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace', padding: '2px 8px', border: '1px solid rgba(99,179,237,0.3)', cursor: 'pointer', background: 'none' }}>← BACK</button>
            <span style={{ fontSize: '0.6rem', color: '#e2e8f0', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>{cam?.name?.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fc8181', boxShadow: '0 0 6px #fc8181', animation: 'blink-anim 1.2s infinite' }} />
            <span style={{ fontSize: '0.5rem', color: '#fc8181', letterSpacing: '0.15em', fontFamily: 'JetBrains Mono, monospace' }}>LIVE</span>
          </div>
        </div>

        {/* Main feed */}
        <div style={{ flex: 1, position: 'relative', background: '#050c14' }}>
          {cam?.stream ? (
            <iframe
              src={cam.stream}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={cam.name}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <FakeVideoFeed name={cam?.name} large />
          )}

          {/* HUD overlay */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              <HUDText>{cam?.name?.toUpperCase()}</HUDText>
              <HUDText>{cam?.location}</HUDText>
            </div>
            <div style={{ position: 'absolute', top: 10, right: 10, textAlign: 'right' }}>
              <HUDText>{new Date().toUTCString().slice(0, 25)}</HUDText>
              <HUDText>LAT {cam?.lat?.toFixed(4)}° LON {cam?.lon?.toFixed(4)}°</HUDText>
            </div>
            <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
              <HUDText>TYPE: {cam?.type?.toUpperCase()}</HUDText>
            </div>
            {/* Corner brackets */}
            {[['top:0,left:0','border-top:1px,border-left:1px'], ['top:0,right:0','border-top:1px,border-right:1px'],
              ['bottom:0,left:0','border-bottom:1px,border-left:1px'], ['bottom:0,right:0','border-bottom:1px,border-right:1px']
            ].map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                ...(i===0&&{top:6,left:6}), ...(i===1&&{top:6,right:6}),
                ...(i===2&&{bottom:6,left:6}), ...(i===3&&{bottom:6,right:6}),
                width: 20, height: 20,
                borderTop: i < 2 ? '1px solid rgba(99,179,237,0.5)' : 'none',
                borderBottom: i >= 2 ? '1px solid rgba(99,179,237,0.5)' : 'none',
                borderLeft: i === 0 || i === 2 ? '1px solid rgba(99,179,237,0.5)' : 'none',
                borderRight: i === 1 || i === 3 ? '1px solid rgba(99,179,237,0.5)' : 'none',
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 4, padding: '5px 10px', borderBottom: '1px solid rgba(99,179,237,0.12)', background: 'rgba(99,179,237,0.02)', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.5rem', color: '#718096', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>
          {cameras.length} FEEDS AVAILABLE — <span style={{ color: '#68d391' }}>{cameras.filter((_, i) => STATUS[i] === 'LIVE').length} LIVE</span>
        </span>
        <div style={{ display: 'flex', gap: 3 }}>
          {['2x2', '2x3', '2x4'].map(g => (
            <button key={g} onClick={() => setGrid(g)} style={{
              padding: '2px 6px', fontSize: '0.48rem', letterSpacing: '0.08em',
              fontFamily: 'JetBrains Mono, monospace',
              border: `1px solid ${grid === g ? '#63b3ed' : 'rgba(99,179,237,0.2)'}`,
              color: grid === g ? '#63b3ed' : '#4a5568',
              background: grid === g ? 'rgba(99,179,237,0.08)' : 'transparent',
              cursor: 'pointer'
            }}>{g}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 6,
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gap: 4,
      }}>
        {cameras.map((cam, i) => {
          const status = STATUS[i] || 'LIVE';
          return (
            <div key={cam.id} onClick={() => setSelected(cam.id)}
              style={{
                position: 'relative', cursor: 'pointer', aspectRatio: '16/9',
                background: '#050c14', border: '1px solid rgba(99,179,237,0.1)',
                overflow: 'hidden', transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,179,237,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(99,179,237,0.1)'}
            >
              <FakeVideoFeed name={cam.name} status={status} />

              {/* Info overlay */}
              <div style={{ position: 'absolute', inset: 0, padding: 5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: status === 'LIVE' ? '#fc8181' : status === 'BUFFERING' ? '#f6ad55' : '#4a5568',
                      boxShadow: status === 'LIVE' ? '0 0 4px #fc8181' : 'none',
                      animation: status === 'LIVE' ? 'blink-anim 1.2s infinite' : 'none',
                    }} />
                    <span style={{ fontSize: '0.42rem', color: status === 'LIVE' ? '#fc8181' : '#4a5568', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>{status}</span>
                  </div>
                  <span style={{ fontSize: '0.4rem', color: 'rgba(99,179,237,0.5)', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>CAM-{String(cam.id).padStart(3,'0')}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.45rem', color: '#a0aec0', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', textShadow: '0 1px 3px #000' }}>{cam.name}</div>
                  <div style={{ fontSize: '0.38rem', color: '#4a5568', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>{cam.location}</div>
                </div>
              </div>

              {/* Corner brackets */}
              <div style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 8, borderTop: '1px solid rgba(99,179,237,0.4)', borderLeft: '1px solid rgba(99,179,237,0.4)' }} />
              <div style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderTop: '1px solid rgba(99,179,237,0.4)', borderRight: '1px solid rgba(99,179,237,0.4)' }} />
              <div style={{ position: 'absolute', bottom: 3, left: 3, width: 8, height: 8, borderBottom: '1px solid rgba(99,179,237,0.4)', borderLeft: '1px solid rgba(99,179,237,0.4)' }} />
              <div style={{ position: 'absolute', bottom: 3, right: 3, width: 8, height: 8, borderBottom: '1px solid rgba(99,179,237,0.4)', borderRight: '1px solid rgba(99,179,237,0.4)' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FakeVideoFeed({ name = '', status = 'LIVE', large = false }) {
  // Simulated video noise / scanline effect
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(135deg, #050c14 0%, #0a1628 50%, #060e1a 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
        pointerEvents: 'none', zIndex: 1
      }} />
      {/* Noise dots */}
      {status === 'LIVE' && Array.from({ length: large ? 12 : 5 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: Math.random() * 3 + 1, height: Math.random() * 3 + 1,
          background: `rgba(${Math.floor(Math.random()*50+50)},${Math.floor(Math.random()*80+100)},${Math.floor(Math.random()*80+130)},${Math.random()*0.4+0.1})`,
          borderRadius: '50%',
          animation: `blink-anim ${Math.random()*2+1}s ${Math.random()}s step-end infinite`,
        }} />
      ))}
      {/* Center content */}
      {status === 'OFFLINE' ? (
        <div style={{ textAlign: 'center', zIndex: 2 }}>
          <div style={{ fontSize: large ? '1rem' : '0.55rem', color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>NO SIGNAL</div>
          <div style={{ fontSize: large ? '0.7rem' : '0.38rem', color: '#2d3748', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>CONNECTION LOST</div>
        </div>
      ) : status === 'BUFFERING' ? (
        <div style={{ fontSize: large ? '0.8rem' : '0.48rem', color: '#f6ad55', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', zIndex: 2 }}>BUFFERING...</div>
      ) : (
        <div style={{ width: large ? '60%' : '70%', textAlign: 'center', zIndex: 2 }}>
          <div style={{
            width: '100%', paddingBottom: '56.25%', position: 'relative',
            border: '1px solid rgba(99,179,237,0.08)', background: 'rgba(99,179,237,0.02)'
          }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: large ? '0.65rem' : '0.38rem', color: 'rgba(99,179,237,0.25)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>
                {name?.toUpperCase().slice(0, 16)}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)', zIndex: 1, pointerEvents: 'none' }} />
    </div>
  );
}

function HUDText({ children }) {
  return (
    <div style={{
      fontSize: '0.5rem', color: 'rgba(99,179,237,0.7)',
      fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
      textShadow: '0 0 8px rgba(99,179,237,0.5)', lineHeight: 1.6,
      background: 'rgba(0,0,0,0.4)', padding: '1px 4px',
    }}>{children}</div>
  );
}
