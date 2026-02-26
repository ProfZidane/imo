import { BuildingConstraints, GeoJsonGeometry, GpuFeature } from "../types";
import { GPU_BASE_URL, GPU_ENDPOINTS, GpuSectionKey, DEFAULT_BUILDING_CONSTRAINTS } from "./constants";
import { clamp, parseNumeric } from "./utils";

export const fetchGpuData = async (geometry: GeoJsonGeometry) => {
  const geomParam = encodeURIComponent(JSON.stringify(geometry));
  const aggregated: Record<GpuSectionKey, GpuFeature[]> = {} as any;
  const errors: string[] = [];

  await Promise.all(
    GPU_ENDPOINTS.map(async (endpoint) => {
      try {
        const response = await fetch(`${GPU_BASE_URL}${endpoint.path}?geom=${geomParam}`);
        if (!response.ok) throw new Error(`${response.status}`);
        const data = await response.json();
        aggregated[endpoint.key] = data?.features ?? [];
      } catch (err) {
        errors.push(endpoint.label);
        aggregated[endpoint.key] = [];
      }
    })
  );

  return { data: aggregated, errors };
};

export const deriveBuildingConstraints = (gpuData: Record<string, GpuFeature[]>): BuildingConstraints => {
  const allFeatures = Object.values(gpuData || {}).flat();

  const searchNumeric = (matcher: (key: string, value: any, text: string) => boolean): number | null => {
    for (const feature of allFeatures) {
      if (!feature?.properties) continue;
      for (const [key, value] of Object.entries(feature.properties)) {
        const text = `${key} ${String(value ?? "")}`;
        if (!matcher(key, value, text)) continue;
        const num = parseNumeric(value ?? text);
        if (num !== null) return num;
      }
    }
    return null;
  };

  const heightVal =
    searchNumeric((key, _v, text) => /hauteur|max/i.test(key) || /hauteur|max/i.test(text)) ??
    searchNumeric((_k, _v, text) => /hauteur\s+maximale/i.test(text));

  const floorVal = (() => {
    for (const feature of allFeatures) {
      const props = feature?.properties;
      if (!props) continue;
      for (const value of Object.values(props)) {
        if (typeof value !== "string") continue;
        const match = value.match(/R\s*\+\s*(\d+)/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!Number.isNaN(n)) return n + 1;
        }
      }
    }
    const numeric = searchNumeric((key, _v, text) => /etage|niveau/i.test(key) || /étage|niveau/i.test(text));
    return numeric;
  })();

  const spacingVal = searchNumeric((key, _v, text) =>
    /retrait|alignement|espacement|distance|marge/i.test(key) ||
    /retrait|alignement|espacement|distance|marge/i.test(text)
  );

  const coverageVal = searchNumeric((key, _v, text) =>
    /emprise|occupation|couverture|ces|cos/i.test(key) ||
    /emprise|occupation|couverture|CES|COS|%/i.test(text)
  );

  const maxHeight = clamp(heightVal ?? DEFAULT_BUILDING_CONSTRAINTS.maxHeight, 6, 60);
  const floors = Math.max(1, Math.round(floorVal ?? maxHeight / 3));
  const spacingMeters = clamp(spacingVal ?? DEFAULT_BUILDING_CONSTRAINTS.spacingMeters, 0, 20);
  let coverageRatio = coverageVal ?? DEFAULT_BUILDING_CONSTRAINTS.coverageRatio;
  
  if (coverageRatio > 1.5) coverageRatio = clamp(coverageRatio / 100, 0.2, 0.9);
  else coverageRatio = clamp(coverageRatio, 0.2, 0.9);

  return { maxHeight, floors, spacingMeters, coverageRatio };
};