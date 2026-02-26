export type GpuFeature = {
    properties?: Record<string, any>;
  };
  
  export type GeoJsonGeometry = {
    type: string;
    coordinates: any;
  };
  
  export type BuildingConstraints = {
    maxHeight: number;
    floors: number;
    spacingMeters: number;
    coverageRatio: number;
  };
  
  export type PanelMode = "parcel" | "building";