const a = require('astronomy-engine');
const keys = Object.keys(a);
console.log("EclipticLongitude:", typeof a.EclipticLongitude);
console.log("Ecliptic:", typeof a.Ecliptic);
console.log("SunPosition:", typeof a.SunPosition);
console.log("Equator:", typeof a.Equator);
console.log("Body:", typeof a.Body);

// Try calling EclipticLongitude
try {
  const d = new Date("1995-10-15T14:30:00");
  const result = a.EclipticLongitude(a.Body.Sun, d);
  console.log("Sun EclipticLongitude:", result);
} catch(e) {
  console.log("EclipticLongitude error:", e.message);
}

// Try Ecliptic
try {
  const d = new Date("1995-10-15T14:30:00");
  const result = a.Ecliptic(a.Body.Sun, d);
  console.log("Sun Ecliptic:", result);
} catch(e) {
  console.log("Ecliptic error:", e.message);
}
