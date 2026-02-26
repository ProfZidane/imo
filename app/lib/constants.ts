export const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN || "";
export const GPU_BASE_URL = "https://apicarto.ign.fr";

export const GPU_ENDPOINTS = [
  { key: "zoneUrba", label: "Zonage PLU", path: "/api/gpu/zone-urba" },
  { key: "prescriptions", label: "Prescriptions", path: "/api/gpu/prescription-surf" },
  { key: "infos", label: "Informations réglementaires", path: "/api/gpu/info-surf" },
  { key: "servitudes", label: "Servitudes (SUP)", path: "/api/gpu/assiette-sup-s" },
] as const;

export type GpuSectionKey = (typeof GPU_ENDPOINTS)[number]["key"];

export const DEFAULT_BUILDING_CONSTRAINTS = {
  maxHeight: 12,
  floors: 4,
  spacingMeters: 4,
  coverageRatio: 0.65,
};