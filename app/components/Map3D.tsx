"use client";
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { CESIUM_TOKEN } from "../lib/constants";
import { BuildingConstraints, GeoJsonGeometry } from "../types";
import { calculateBuildingFootprint, metersToDegreesLon } from "../lib/geometry";
import { clamp } from "../lib/utils";

Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;

export type Map3DRef = {
  zoomToParcel: (geometry: GeoJsonGeometry, parcelId: string, parcelProps: any) => Promise<void>;
  buildVirtualBuilding: (geometry: GeoJsonGeometry, constraints: BuildingConstraints, forcedFloors?: number) => Promise<{ floors: number, maxFloors: number, footprintArea: number, coords: [number, number][] }>;
  clearEntities: () => void;
  deleteVirtualBuilding: () => void;
  captureScreenshot: () => Promise<string | null>;
  updateBuildingTransform: (rotation: number, scaleWidth: number, scaleLength: number) => void;
};

type Map3DProps = {
  active: boolean;
  onEntitySelected: (type: "parcel" | "virtualBuilding" | null, data?: any) => void;
};

const Map3D = forwardRef<Map3DRef, Map3DProps>(({ active, onEntitySelected }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const buildingEntityRef = useRef<Cesium.Entity | null>(null);
  const scaleEntityRef = useRef<Cesium.Entity | null>(null);
  const floorEntitiesRef = useRef<Cesium.Entity[]>([]);
  const osmBuildingsRef = useRef<any>(null);
  const cesium3DTilesetRef = useRef<any>(null);
  const initialBuildingCoordsRef = useRef<[number, number][] | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    (window as any).CESIUM_BASE_URL = "/cesium";

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      timeline: false,
      animation: false,
      selectionIndicator: true,
      infoBox: false,
    });
    viewerRef.current = viewer;

    Cesium.createOsmBuildingsAsync().then(tiles => {
      osmBuildingsRef.current = viewer.scene.primitives.add(tiles);
    }).catch(error => {
      console.warn("Failed to load OSM Buildings:", error);
    });

    Cesium.Cesium3DTileset.fromUrl("https://assets.cesium.com/96188/tileset.json" as any).then(tileset => {
      cesium3DTilesetRef.current = viewer.scene.primitives.add(tileset);
    }).catch(error => {
      console.warn("Failed to load Cesium 3D Tileset:", error);
    });

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.position);
      if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity) {
        const entity = picked.id;
        const type = entity.properties?.type?.getValue?.() || entity.properties?.type;
        if (type === "virtualBuilding") {
          onEntitySelected("virtualBuilding");
        } else {
          const info = entity.properties?.parcelInfo?.getValue();
          onEntitySelected("parcel", info);
        }
      } else {
        onEntitySelected(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => { if (!viewer.isDestroyed()) viewer.destroy(); };
  }, []);

  useImperativeHandle(ref, () => ({
    clearEntities: () => {
      if (!viewerRef.current) return;
      viewerRef.current.entities.removeAll();
      buildingEntityRef.current = null;
    },
    deleteVirtualBuilding: () => {
      if (!viewerRef.current) return;
      if (buildingEntityRef.current) {
        viewerRef.current.entities.remove(buildingEntityRef.current);
        buildingEntityRef.current = null;
      }
      floorEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
      floorEntitiesRef.current = [];
      if (scaleEntityRef.current) {
        viewerRef.current.entities.remove(scaleEntityRef.current);
        scaleEntityRef.current = null;
      }
    },
    captureScreenshot: async () => {
      if (!viewerRef.current) return null;

      try {
        viewerRef.current.render();

        const canvas = viewerRef.current.scene.canvas;
        return canvas.toDataURL('image/png');
      } catch (error) {
        console.error('Error capturing screenshot:', error);
        return null;
      }
    },


    zoomToParcel: async (geometry, parcelId, parcelProps) => {
      if (!viewerRef.current) return;

      const coordinates = geometry.type === "MultiPolygon" ? geometry.coordinates[0][0] : geometry.coordinates[0];
      const positionsCarto = coordinates.map((c: any) => new Cesium.Cartographic(Cesium.Math.toRadians(c[0]), Cesium.Math.toRadians(c[1])));

      const terrainProvider = viewerRef.current.terrainProvider;
      let positionsWithHeight;
      try {
        const updated = await Cesium.sampleTerrainMostDetailed(terrainProvider, positionsCarto);
        positionsWithHeight = updated.map(p => [Cesium.Math.toDegrees(p.longitude), Cesium.Math.toDegrees(p.latitude), (p.height || 0) + 0.5]).flat();
      } catch {
        positionsWithHeight = coordinates.map((c: any) => [c[0], c[1], 0.5]).flat();
      }

      const entity = viewerRef.current.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights(positionsWithHeight),
          material: Cesium.Color.fromCssColorString("#2d3748").withAlpha(0.9),
          outline: true, outlineColor: Cesium.Color.LIME,
          perPositionHeight: true
        },
        properties: { type: "parcel", parcelInfo: parcelProps, olFeatureId: parcelId }
      });
      viewerRef.current.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(coordinates[0][0], coordinates[0][1], 200) });
    },
    buildVirtualBuilding: async (geometry, constraints, forcedFloors) => {
      if (!viewerRef.current) throw new Error("No viewer");

      if (buildingEntityRef.current) viewerRef.current.entities.remove(buildingEntityRef.current);
      floorEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
      floorEntitiesRef.current = [];
      if (scaleEntityRef.current) viewerRef.current.entities.remove(scaleEntityRef.current);

      const res = calculateBuildingFootprint(geometry, constraints.coverageRatio);
      if (!res) throw new Error("Géométrie incompatible");
      const { footprint, area, coords } = res;

      const centerLon = coords[0][0], centerLat = coords[0][1];
      const [sample] = await Cesium.sampleTerrainMostDetailed(viewerRef.current.terrainProvider, [new Cesium.Cartographic(Cesium.Math.toRadians(centerLon), Cesium.Math.toRadians(centerLat))]);
      const groundHeight = sample?.height ?? 0;

      const approxFloorHeight = 3;
      const maxFromHeight = Math.max(1, Math.floor(constraints.maxHeight / approxFloorHeight));
      const maxFloors = Math.min(Math.max(1, constraints.floors), maxFromHeight);
      const floorsForBuild = clamp(forcedFloors ?? maxFloors, 1, maxFloors);
      const heightFromFloors = floorsForBuild * approxFloorHeight;
      const allowedHeight = Math.min(heightFromFloors, constraints.maxHeight);
      const extrudedHeight = groundHeight + allowedHeight;

      buildingEntityRef.current = viewerRef.current.entities.add({
        name: "Bâtiment projeté",
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(footprint),
          height: groundHeight, extrudedHeight,
          material: Cesium.Color.fromCssColorString("#2563eb").withAlpha(1.0),
          outline: true, outlineColor: Cesium.Color.WHITE
        },
        properties: { type: "virtualBuilding", constraints }
      });

      for (let i = 1; i < floorsForBuild; i++) {
        const h = groundHeight + i * approxFloorHeight;
        if (h >= extrudedHeight - 0.5) break;
        const loopHeights = [];
        coords.forEach(c => loopHeights.push(c[0], c[1], h));
        loopHeights.push(coords[0][0], coords[0][1], h);
        floorEntitiesRef.current.push(viewerRef.current.entities.add({
          polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(loopHeights), width: 1.5, material: Cesium.Color.WHITE.withAlpha(0.6) }
        }));
      }

      const scaleLon = centerLon + metersToDegreesLon(5, centerLat);
      scaleEntityRef.current = viewerRef.current.entities.add({
        position: Cesium.Cartesian3.fromDegrees(scaleLon, centerLat, extrudedHeight),
        polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights([scaleLon, centerLat, groundHeight, scaleLon, centerLat, extrudedHeight]), width: 2, material: Cesium.Color.YELLOW },
        label: { text: `${Math.round(allowedHeight)} m`, font: "14px sans-serif", fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -10) }
      });

      viewerRef.current.flyTo(buildingEntityRef.current, { duration: 1.8 });

      initialBuildingCoordsRef.current = coords;

      return { floors: floorsForBuild, maxFloors, footprintArea: area, coords };
    },
    updateBuildingTransform: async (rotation: number, scaleWidth: number, scaleLength: number) => {
      if (!viewerRef.current || !buildingEntityRef.current || !initialBuildingCoordsRef.current) return;

      const coords = initialBuildingCoordsRef.current;
      if (coords.length === 0) return;

      let sumLon = 0, sumLat = 0;
      coords.forEach((c: [number, number]) => { sumLon += c[0]; sumLat += c[1]; });
      const centerLon = sumLon / coords.length;
      const centerLat = sumLat / coords.length;

      const mPerDegLat = 111320;
      const mPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);

      const rad = (rotation * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      const newCoords = coords.map(([lon, lat]: [number, number]) => {
        const dx = (lon - centerLon) * mPerDegLon * scaleWidth;
        const dy = (lat - centerLat) * mPerDegLat * scaleLength;

        const rDx = dx * cosA - dy * sinA;
        const rDy = dx * sinA + dy * cosA;

        return [
          centerLon + rDx / mPerDegLon,
          centerLat + rDy / mPerDegLat
        ] as [number, number];
      });

      const footprint = newCoords.flat();

      const oldEntity = buildingEntityRef.current;
      if (!oldEntity || !oldEntity.polygon) return;

      const polygon = oldEntity.polygon;
      const groundHeight = (polygon.height?.getValue(Cesium.JulianDate.now()) as number) || 0;
      const extrudedHeight = (polygon.extrudedHeight?.getValue(Cesium.JulianDate.now()) as number) || 0;
      const constraints = oldEntity.properties?.constraints?.getValue();

      viewerRef.current.entities.remove(oldEntity);

      buildingEntityRef.current = viewerRef.current.entities.add({
        name: "Bâtiment projeté",
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(footprint),
          height: groundHeight,
          extrudedHeight: extrudedHeight,
          material: Cesium.Color.fromCssColorString("#2563eb").withAlpha(1.0),
          outline: true,
          outlineColor: Cesium.Color.WHITE
        },
        properties: { type: "virtualBuilding", constraints }
      });

      const approxFloorHeight = 3;
      const numFloors = Math.floor((extrudedHeight - groundHeight) / approxFloorHeight); // Estimate or store

      floorEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
      floorEntitiesRef.current = [];

      for (let i = 1; i < numFloors; i++) {
        const h = groundHeight + i * approxFloorHeight;
        if (h >= extrudedHeight - 0.5) break;
        const loopHeights: number[] = [];
        newCoords.forEach((c: [number, number]) => loopHeights.push(c[0], c[1], h));
        loopHeights.push(newCoords[0][0], newCoords[0][1], h); // Close loop

        floorEntitiesRef.current.push(viewerRef.current.entities.add({
          polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(loopHeights), width: 1.5, material: Cesium.Color.WHITE.withAlpha(0.6) }
        }));
      }

      if (scaleEntityRef.current) {
        const scaleLon = centerLon + metersToDegreesLon(5, centerLat);
        scaleEntityRef.current.position = new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromDegrees(scaleLon, centerLat, extrudedHeight));
        scaleEntityRef.current.polyline!.positions = new Cesium.ConstantProperty(Cesium.Cartesian3.fromDegreesArrayHeights([scaleLon, centerLat, groundHeight, scaleLon, centerLat, extrudedHeight]));
      }
    }
  }));

  return <div className={active ? "w-3/4 h-full relative" : "hidden"} ref={containerRef} />;
});

Map3D.displayName = "Map3D";
export default Map3D;