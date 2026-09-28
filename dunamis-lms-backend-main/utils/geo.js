const EARTH_RADIUS_M = 6371008.8;

// Branches saved before check-in existed have no stored radius, and lean reads
// skip schema defaults, so readers fall back to this too.
const DEFAULT_GEOFENCE_RADIUS_M = 200;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

// Great-circle distance in metres between two { lat, lng } points.
const haversineMeters = (a, b) => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

const hasPin = (geo) => Number.isFinite(geo?.lat) && Number.isFinite(geo?.lng);

module.exports = { DEFAULT_GEOFENCE_RADIUS_M, haversineMeters, hasPin };
