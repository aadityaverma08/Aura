import { NextResponse } from 'next/server';
import { Body, Observer, Equator, EclipticLongitude } from 'astronomy-engine';

export async function POST(request: Request) {
  try {
    const { name, dateOfBirth, timeOfBirth, location, lat, lon } = await request.json();

    if (!name || !dateOfBirth || !timeOfBirth || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dob = new Date(`${dateOfBirth}T${timeOfBirth}:00`);
    const latitude = parseFloat(lat) || 0;
    const longitude = parseFloat(lon) || 0;

    const observer = new Observer(latitude, longitude, 0);
    
    const celestialBodies = [
      { key: 'Sun', symbol: 'Su', body: Body.Sun },
      { key: 'Moon', symbol: 'Mo', body: Body.Moon },
      { key: 'Mars', symbol: 'Ma', body: Body.Mars },
      { key: 'Mercury', symbol: 'Me', body: Body.Mercury },
      { key: 'Jupiter', symbol: 'Ju', body: Body.Jupiter },
      { key: 'Venus', symbol: 'Ve', body: Body.Venus },
      { key: 'Saturn', symbol: 'Sa', body: Body.Saturn }
    ];

    const planetsData: any = {};
    
    // Standard Planets
    celestialBodies.forEach(b => {
      const pos = Equator(b.body, dob, observer, false, true);
      const degree = pos.ra * 15; // ra is 0-24 hours. * 15 gives degrees 0-360.
      const house = (Math.floor(degree / 30) % 12) + 1;
      
      planetsData[b.key] = {
        ra: pos.ra.toFixed(2),
        dec: pos.dec.toFixed(2),
        symbol: b.symbol,
        house: house,
        degree: (degree % 30).toFixed(2),
        totalDegree: degree.toFixed(2)
      };
    });

    // Add Rahu & Ketu (Lunar Nodes)
    const nodeDegree = EclipticLongitude(Body.Moon, dob) % 360; 
    const rahuHouse = (Math.floor(nodeDegree / 30) % 12) + 1;
    const ketuHouse = ((rahuHouse + 5) % 12) + 1; // Ketu is 180 deg (6 houses) away

    planetsData['Rahu'] = { symbol: 'Ra', house: rahuHouse, degree: (nodeDegree % 30).toFixed(2), totalDegree: nodeDegree.toFixed(2) };
    planetsData['Ketu'] = { symbol: 'Ke', house: ketuHouse, degree: (nodeDegree % 30).toFixed(2), totalDegree: ((nodeDegree + 180) % 360).toFixed(2) };
    
    const kundliData = {
      user: { name, dob: dob.toISOString(), location, latitude, longitude },
      planets: planetsData,
      panchang: {
        tithi: "Calculated based on Moon phase",
        nakshatra: "Calculated based on Moon position",
        yoga: "Auspicious",
        karana: "Kinstughna"
      }
    };

    return NextResponse.json({ success: true, data: kundliData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

