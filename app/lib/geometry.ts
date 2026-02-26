import { GeoJsonGeometry } from "../types";
import { clamp } from "./utils";

export const getPrimaryRing = (geometry: GeoJsonGeometry | null | undefined): number[][] | null => {
  if (!geometry) return null;
  if (geometry.type === "Polygon") return geometry.coordinates?.[0] ?? null;
  if (geometry.type === "MultiPolygon") return geometry.coordinates?.[0]?.[0] ?? null;
  return null;
};

export const metersToDegreesLat = (meters: number) => meters / 111320;
export const metersToDegreesLon = (meters: number, latitude: number) => {
  const latRad = (latitude * Math.PI) / 180;
  return meters / (111320 * Math.cos(latRad || 0.00001));
};

export const calculateBuildingFootprint = (
  geometry: GeoJsonGeometry,
  coverageRatio: number
): { footprint: number[]; area: number; coords: [number, number][] } | null => {
  const ring = getPrimaryRing(geometry);
  if (!ring || ring.length < 4) return null;

  let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
  ring.forEach(([lon, lat]) => {
    if (lon < lonMin) lonMin = lon;
    if (lon > lonMax) lonMax = lon;
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
  });

  const centerLon = (lonMin + lonMax) / 2;
  const centerLat = (latMin + latMax) / 2;
  const lonSpan = Math.max(lonMax - lonMin, 0.0001);
  const latSpan = Math.max(latMax - latMin, 0.0001);
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180 || 0.00001);

  const ringMeters: [number, number][] = ring.map(([lon, lat]) => [
    (lon - centerLon) * mPerDegLon,
    (lat - centerLat) * mPerDegLat,
  ]);

  const bboxWidthM = lonSpan * mPerDegLon;
  const bboxHeightM = latSpan * mPerDegLat;
  const baseShrink = Math.sqrt(clamp(coverageRatio, 0.2, 0.8));
  const baseHalfWidth = (bboxWidthM * baseShrink) / 2;
  const baseHalfHeight = (bboxHeightM * baseShrink) / 2;

  const isInsidePolygon = (point: [number, number]) => {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = ringMeters.length - 1; i < ringMeters.length; j = i++) {
      const [xi, yi] = ringMeters[i];
      const [xj, yj] = ringMeters[j];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const angles = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165];
  
  for (const angle of angles) {
    const rad = (angle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    for (let scale = 1; scale >= 0.2; scale -= 0.1) {
      const hw = baseHalfWidth * scale;
      const hh = baseHalfHeight * scale;
      const localRect: [number, number][] = [
        [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh],
      ].map(([x, y]) => [x * cosA - y * sinA, x * sinA + y * cosA]);

      if (localRect.every((p) => isInsidePolygon(p))) {
        const area = Math.abs(localRect.reduce((sum, [x1, y1], idx) => {
          const [x2, y2] = localRect[(idx + 1) % localRect.length];
          return sum + x1 * y2 - x2 * y1;
        }, 0)) / 2;

        const footprint = localRect.map(([x, y]) => [
          centerLon + x / mPerDegLon,
          centerLat + y / mPerDegLat,
        ]).flat();

        // Reconstituer les coords tuples pour le plan d'étage
        const coords: [number, number][] = [];
        for (let i = 0; i < footprint.length; i += 2) {
          coords.push([footprint[i], footprint[i+1]]);
        }

        return { footprint, area, coords };
      }
    }
  }

  // Fallback
  const halfSizeM = Math.min(bboxWidthM, bboxHeightM) * 0.15;
  const localRectFallback: [number, number][] = [[-halfSizeM, -halfSizeM], [halfSizeM, -halfSizeM], [halfSizeM, halfSizeM], [-halfSizeM, halfSizeM]];
  const areaFallback = Math.abs(localRectFallback.reduce((sum, [x1, y1], idx) => {
      const [x2, y2] = localRectFallback[(idx + 1) % localRectFallback.length];
      return sum + x1 * y2 - x2 * y1;
  }, 0)) / 2;
  const footprintFallback = localRectFallback.map(([x, y]) => [centerLon + x / mPerDegLon, centerLat + y / mPerDegLat]).flat();
  const coordsFallback: [number, number][] = [];
  for (let i = 0; i < footprintFallback.length; i += 2) {
      coordsFallback.push([footprintFallback[i], footprintFallback[i+1]]);
  }

  return { footprint: footprintFallback, area: areaFallback, coords: coordsFallback };
};