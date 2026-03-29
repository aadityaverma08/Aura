import React from 'react';

export default function KundliChart({ planets }: { planets: any }) {
  // Input planets: { Sun: { symbol: 'Su', house: 1 }, Moon: ... }
  
  // create mapping of house number to array of symbols
  const houseMap: { [key: number]: string[] } = {};
  for (let i = 1; i <= 12; i++) houseMap[i] = [];
  
  if (planets) {
    Object.keys(planets).forEach(key => {
       const p = planets[key];
       if (p.house && houseMap[p.house]) {
           houseMap[p.house].push(p.symbol);
       }
    });
  }

  const housePositions: any = {
    1: { x: 150, y: 75 },
    2: { x: 75, y: 50 },
    3: { x: 50, y: 75 },
    4: { x: 75, y: 150 },
    5: { x: 50, y: 225 },
    6: { x: 75, y: 250 },
    7: { x: 150, y: 225 },
    8: { x: 225, y: 250 },
    9: { x: 250, y: 225 },
    10: { x: 225, y: 150 },
    11: { x: 250, y: 75 },
    12: { x: 225, y: 50 }
  };

  return (
    <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto', padding: '10px' }}>
      <svg viewBox="0 0 300 300" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <style>
            {`
              .kundli-line { stroke: var(--color-accent); stroke-width: 1.5; fill: none; }
              .planet-text { fill: var(--color-text); font-size: 14px; font-weight: bold; text-anchor: middle; dominant-baseline: middle; }
              .house-num { fill: rgba(255,255,255,0.3); font-size: 12px; text-anchor: middle; dominant-baseline: middle; }
            `}
          </style>
        </defs>
        
        {/* Outer Square */}
        <rect x="0" y="0" width="300" height="300" className="kundli-line" />
        
        {/* Diagonals */}
        <line x1="0" y1="0" x2="300" y2="300" className="kundli-line" />
        <line x1="300" y1="0" x2="0" y2="300" className="kundli-line" />
        
        {/* Inner Diamond connecting midpoints */}
        <polygon points="150,0 300,150 150,300 0,150" className="kundli-line" />

        {/* Placing house numbers and planets */}
        {Object.keys(housePositions).map((hStr) => {
          const h = parseInt(hStr);
          const pos = housePositions[h];
          const planetsInHouse = houseMap[h].join(' ');
          
          return (
            <g key={h}>
              <text x={pos.x} y={pos.y - 14} className="house-num">{h}</text>
              <text x={pos.x} y={pos.y + 4} className="planet-text">
                {planetsInHouse}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
