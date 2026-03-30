'use client';
import React, { useState } from 'react';

const SIGNS = [
  { name: 'Aries',       sym: '♈', el: '#ef4444' },
  { name: 'Taurus',      sym: '♉', el: '#84cc16' },
  { name: 'Gemini',      sym: '♊', el: '#60a5fa' },
  { name: 'Cancer',      sym: '♋', el: '#06b6d4' },
  { name: 'Leo',         sym: '♌', el: '#ef4444' },
  { name: 'Virgo',       sym: '♍', el: '#84cc16' },
  { name: 'Libra',       sym: '♎', el: '#60a5fa' },
  { name: 'Scorpio',     sym: '♏', el: '#06b6d4' },
  { name: 'Sagittarius', sym: '♐', el: '#ef4444' },
  { name: 'Capricorn',   sym: '♑', el: '#84cc16' },
  { name: 'Aquarius',    sym: '♒', el: '#60a5fa' },
  { name: 'Pisces',      sym: '♓', el: '#06b6d4' },
];

const GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

const CX = 160, CY = 160;
const R_OUTER = 155, R_INNER = 110, R_HOUSE = 78, R_CENTER = 28;

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function polar(angle: number, r: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

// angle for sign index i: Aries starts at top (-90°)
function signAngle(i: number) { return toRad(-90 + i * 30); }

function donutPath(startDeg: number, endDeg: number, r1: number, r2: number) {
  const s = toRad(startDeg), e = toRad(endDeg);
  const os = polar(s, r2), oe = polar(e, r2);
  const is = polar(s, r1), ie = polar(e, r1);
  return `M ${os.x} ${os.y} A ${r2} ${r2} 0 0 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${r1} ${r1} 0 0 0 ${is.x} ${is.y} Z`;
}

export default function KundliChart({ planets }: { planets: any }) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Map house → list of planet names
  const houseMap: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) houseMap[i] = [];
  if (planets) {
    Object.keys(planets).forEach(k => {
      const p = planets[k];
      if (p.house && houseMap[p.house]) houseMap[p.house].push(k);
    });
  }

  return (
    <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto', position: 'relative', userSelect: 'none' }}>
      <svg viewBox="0 0 320 320" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>

        {/* Zodiac ring segments */}
        {SIGNS.map((sign, i) => {
          const startDeg = -90 + i * 30;
          const endDeg   = startDeg + 30;
          const midAngle = toRad(startDeg + 15);
          const labelPos = polar(midAngle, (R_OUTER + R_INNER) / 2);
          return (
            <g key={sign.name}>
              <path d={donutPath(startDeg, endDeg, R_INNER, R_OUTER)}
                fill={sign.el + '18'} stroke={sign.el + '55'} strokeWidth="0.8" />
              <text x={labelPos.x} y={labelPos.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="13" fill={sign.el} style={{ pointerEvents: 'none' }}>
                {sign.sym}
              </text>
            </g>
          );
        })}

        {/* House division lines (inner ring) */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = signAngle(i);
          const p1 = polar(a, R_HOUSE);
          const p2 = polar(a, R_INNER);
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke="rgba(139,92,246,0.25)" strokeWidth="1" />;
        })}

        {/* House number labels */}
        {Array.from({ length: 12 }, (_, i) => {
          const midAngle = toRad(-90 + i * 30 + 15);
          const pos = polar(midAngle, (R_HOUSE + R_INNER) / 2);
          return (
            <text key={i} x={pos.x} y={pos.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fill="rgba(255,255,255,0.3)" style={{ pointerEvents: 'none' }}>
              {i + 1}
            </text>
          );
        })}

        {/* Inner ring + center */}
        <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="rgba(139,92,246,0.4)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_HOUSE} fill="rgba(9,9,11,0.85)" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={R_CENTER} fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />
        <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
          fontSize="16" fill="rgba(139,92,246,0.6)">ॐ</text>

        {/* Planets */}
        {Object.entries(houseMap).map(([houseStr, names]) =>
          names.map((pName, idx) => {
            const h       = parseInt(houseStr);
            const count   = names.length;
            const spread  = count > 1 ? 12 : 0;
            const offset  = count > 1 ? -spread * (count - 1) / 2 + idx * spread : 0;
            const midAngle = toRad(-90 + (h - 1) * 30 + 15 + offset);
            const pos      = polar(midAngle, (R_HOUSE + R_CENTER) / 2 + 4);
            const glyph    = GLYPHS[pName] || pName.slice(0, 2);
            const isHov    = hovered === pName;
            return (
              <g key={`${houseStr}-${pName}`}
                onMouseEnter={() => setHovered(pName)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}>
                <circle cx={pos.x} cy={pos.y} r="14"
                  fill={isHov ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.12)'}
                  stroke={isHov ? 'rgba(192,132,252,0.9)' : 'rgba(139,92,246,0.5)'}
                  strokeWidth="1.2"
                  style={{ transition: 'all 0.2s' }} />
                <text x={pos.x} y={pos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="12" fill="white" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                  {glyph}
                </text>
              </g>
            );
          })
        )}
      </svg>

      {/* Hover Tooltip */}
      {hovered && planets[hovered] && (
        <div style={{
          position: 'absolute', top: '8px', right: '-8px',
          background: 'rgba(9,9,11,0.97)', border: '1px solid rgba(139,92,246,0.6)',
          borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.8rem',
          minWidth: '160px', pointerEvents: 'none', zIndex: 10,
          boxShadow: '0 4px 24px rgba(139,92,246,0.3)',
        }}>
          <div style={{ fontWeight: 700, color: '#c084fc', fontSize: '0.95rem' }}>
            {GLYPHS[hovered]} {hovered}
          </div>
          <div style={{ opacity: 0.7, marginTop: '0.3rem' }}>
            {planets[hovered].rashiSymbol} {planets[hovered].rashi}
          </div>
          <div style={{ opacity: 0.6, marginTop: '0.15rem' }}>
            House {planets[hovered].house} · {planets[hovered].degree}°
          </div>
          <div style={{ opacity: 0.5, marginTop: '0.15rem', fontSize: '0.72rem' }}>
            {planets[hovered].element} · Lord: {planets[hovered].rashiLord}
          </div>
        </div>
      )}
    </div>
  );
}
