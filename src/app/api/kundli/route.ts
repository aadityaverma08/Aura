import { NextResponse } from 'next/server';
import { Body, AstroTime, GeoVector, Ecliptic } from 'astronomy-engine';

// --- Vedic Constants ---

function getAyanamsha(date: Date): number {
  const year = date.getFullYear() + date.getMonth() / 12 + date.getDate() / 365;
  return 23.15 + (year - 1900) * 0.01396; // Lahiri approximation
}

const RASHIS = [
  { name: "Aries",       symbol: "♈", element: "Fire",  lord: "Mars"    },
  { name: "Taurus",      symbol: "♉", element: "Earth", lord: "Venus"   },
  { name: "Gemini",      symbol: "♊", element: "Air",   lord: "Mercury" },
  { name: "Cancer",      symbol: "♋", element: "Water", lord: "Moon"    },
  { name: "Leo",         symbol: "♌", element: "Fire",  lord: "Sun"     },
  { name: "Virgo",       symbol: "♍", element: "Earth", lord: "Mercury" },
  { name: "Libra",       symbol: "♎", element: "Air",   lord: "Venus"   },
  { name: "Scorpio",     symbol: "♏", element: "Water", lord: "Mars"    },
  { name: "Sagittarius", symbol: "♐", element: "Fire",  lord: "Jupiter" },
  { name: "Capricorn",   symbol: "♑", element: "Earth", lord: "Saturn"  },
  { name: "Aquarius",    symbol: "♒", element: "Air",   lord: "Saturn"  },
  { name: "Pisces",      symbol: "♓", element: "Water", lord: "Jupiter" },
];

const NAKSHATRAS = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
  "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
  "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha",
  "Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati",
];

// Each nakshatra's dasha ruler index (cycles Ketu→Venus→Sun→Moon→Mars→Rahu→Jupiter→Saturn→Mercury)
const NAKSHATRA_RULERS = [0,1,2,3,4,5,6,7,8, 0,1,2,3,4,5,6,7,8, 0,1,2,3,4,5,6,7,8];
const DASHA_PLANETS = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
const DASHA_YEARS   = [7, 20, 6, 10, 7, 18, 16, 19, 17]; // total = 120

const TITHIS = [
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami",
  "Shashthi","Saptami","Ashtami","Navami","Dashami",
  "Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima",
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami",
  "Shashthi","Saptami","Ashtami","Navami","Dashami",
  "Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya",
];

const YOGAS = [
  "Vishkambha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda",
  "Sukarma","Dhriti","Shula","Ganda","Vriddhi","Dhruva","Vyaghata",
  "Harshana","Vajra","Siddhi","Vyatipata","Variyan","Parigha","Shiva",
  "Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti",
];

const KARANAS = ["Bava","Balava","Kaulava","Taitila","Garaja","Vanija","Vishti","Shakuni","Chatushpada","Naga","Kimstughna"];

// --- Route Handler ---

export async function POST(request: Request) {
  try {
    const { name, dateOfBirth, timeOfBirth, location, lat, lon } = await request.json();

    if (!name || !dateOfBirth || !timeOfBirth || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dob = new Date(`${dateOfBirth}T${timeOfBirth}:00`);
    const latitude  = parseFloat(lat) || 0;
    const longitude = parseFloat(lon) || 0;
    const ayanamsha = getAyanamsha(dob);

    const toSidereal = (tropical: number) => ((tropical - ayanamsha) + 360) % 360;

    const CELESTIAL_BODIES = [
      { key: 'Sun',     symbol: '☉', body: Body.Sun     },
      { key: 'Moon',    symbol: '☽', body: Body.Moon    },
      { key: 'Mars',    symbol: '♂', body: Body.Mars    },
      { key: 'Mercury', symbol: '☿', body: Body.Mercury },
      { key: 'Jupiter', symbol: '♃', body: Body.Jupiter },
      { key: 'Venus',   symbol: '♀', body: Body.Venus   },
      { key: 'Saturn',  symbol: '♄', body: Body.Saturn  },
    ];

    const planetsData: Record<string, any> = {};

    const t = new AstroTime(dob);

    CELESTIAL_BODIES.forEach(b => {
      const vec = GeoVector(b.body, t, true);
      const ecl = Ecliptic(vec);
      const tropical = ecl.elon;
      const sidereal = toSidereal(tropical);
      const rashiIdx = Math.floor(sidereal / 30);
      const rashi    = RASHIS[rashiIdx];

      planetsData[b.key] = {
        symbol:      b.symbol,
        house:       rashiIdx + 1,
        degree:      (sidereal % 30).toFixed(2),
        totalDegree: sidereal.toFixed(2),
        rashi:       rashi.name,
        rashiSymbol: rashi.symbol,
        element:     rashi.element,
        rashiLord:   rashi.lord,
      };
    });

    // Rahu & Ketu (lunar nodes — Rahu is ~180° from Moon's north node approximation)
    const moonVec = GeoVector(Body.Moon, t, true);
    const moonEcl = Ecliptic(moonVec);
    const moonTropical = moonEcl.elon;
    const rahuTropical = (moonTropical + 180) % 360;
    const rahuSidereal = toSidereal(rahuTropical);
    const ketuSidereal = (rahuSidereal + 180) % 360;

    ['Rahu','Ketu'].forEach((key, i) => {
      const lon2  = i === 0 ? rahuSidereal : ketuSidereal;
      const rIdx  = Math.floor(lon2 / 30);
      const rashi = RASHIS[rIdx];
      planetsData[key] = {
        symbol: key === 'Rahu' ? '☊' : '☋',
        house:  rIdx + 1,
        degree: (lon2 % 30).toFixed(2),
        totalDegree: lon2.toFixed(2),
        rashi:       rashi.name,
        rashiSymbol: rashi.symbol,
        element:     rashi.element,
        rashiLord:   rashi.lord,
      };
    });

    // --- Panchang ---
    const moonSid = parseFloat(planetsData['Moon'].totalDegree);
    const sunSid  = parseFloat(planetsData['Sun'].totalDegree);
    const NAKSHATRA_SIZE = 360 / 27;

    const nakshatraIdx   = Math.floor(moonSid / NAKSHATRA_SIZE);
    const nakshatra      = NAKSHATRAS[nakshatraIdx];
    const nakshatraPada  = Math.floor((moonSid % NAKSHATRA_SIZE) / (NAKSHATRA_SIZE / 4)) + 1;

    const sunMoonAngle   = ((moonSid - sunSid) + 360) % 360;
    const tithi          = TITHIS[Math.floor(sunMoonAngle / 12)];
    const yoga           = YOGAS[Math.floor(((sunSid + moonSid) % 360) / (360 / 27))];
    const karana         = KARANAS[Math.floor(sunMoonAngle / 6) % 11];

    // --- Vimsottari Dasha ---
    const rulerIdx           = NAKSHATRA_RULERS[nakshatraIdx];
    const fracElapsed        = (moonSid % NAKSHATRA_SIZE) / NAKSHATRA_SIZE;
    const firstDashaYrsTotal = DASHA_YEARS[rulerIdx];
    const yearsRemaining     = firstDashaYrsTotal * (1 - fracElapsed);
    const MS_PER_YEAR        = 365.25 * 24 * 3600 * 1000;

    const dashaSequence: any[] = [];
    let nextDate = new Date(dob.getTime() + yearsRemaining * MS_PER_YEAR);

    dashaSequence.push({
      planet: DASHA_PLANETS[rulerIdx],
      years:  parseFloat(yearsRemaining.toFixed(1)),
      start:  dob.toISOString().split('T')[0],
      end:    nextDate.toISOString().split('T')[0],
    });

    for (let i = 1; i <= 8; i++) {
      const pIdx = (rulerIdx + i) % 9;
      const yrs  = DASHA_YEARS[pIdx];
      const endD = new Date(nextDate.getTime() + yrs * MS_PER_YEAR);
      dashaSequence.push({
        planet: DASHA_PLANETS[pIdx],
        years:  yrs,
        start:  nextDate.toISOString().split('T')[0],
        end:    endD.toISOString().split('T')[0],
      });
      nextDate = endD;
    }

    return NextResponse.json({
      success: true,
      data: {
        user:     { name, dob: dob.toISOString(), location, latitude, longitude },
        planets:  planetsData,
        panchang: { tithi, nakshatra, nakshatraPada, yoga, karana },
        dasha:    dashaSequence,
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
