import React from "react";
import { BuildingConstraints, GpuFeature, PanelMode } from "../types";
import { GPU_ENDPOINTS, GpuSectionKey } from "../lib/constants";

type SidebarProps = {
  mode: PanelMode;
  selectedEntity: any;
  parcelInfo: any;
  area: number;
  gpuData: Record<GpuSectionKey, GpuFeature[]>;
  gpuLoading: boolean;
  gpuError: string | null;
  buildingConstraints: BuildingConstraints | null;
  buildingFloors: number | null;
  buildingMaxFloors: number | null;
  buildingFootprintArea: number | null;
  buildingLoading: boolean;
  buildingError: string | null;
  onChangeFloors: (delta: number) => void;
  onBuild: () => void;
  onDeleteBuilding: () => void;

  buildingRotation: number;
  buildingScaleWidth: number;
  buildingScaleLength: number;
  onChangeTransform: (rotation: number, scaleWidth: number, scaleLength: number) => void;
};

export default function Sidebar({
  mode,
  selectedEntity,
  parcelInfo,
  area,
  gpuData,
  gpuLoading,
  gpuError,
  buildingConstraints,
  buildingFloors,
  buildingMaxFloors,
  buildingFootprintArea,
  buildingLoading,
  buildingError,
  onChangeFloors,
  onBuild,
  onDeleteBuilding,

  buildingRotation,
  buildingScaleWidth,
  buildingScaleLength,
  onChangeTransform
}: SidebarProps) {
  if (!selectedEntity) {
    return (
      <div className="p-4 text-sm text-slate-500">
        Cliquez sur une parcelle dans la vue 2D pour afficher ici les informations PLU et le modèle 3D.
      </div>
    );
  }

  return (
    <div className="w-1/4 h-full bg-white border-l border-slate-200 shadow-inner overflow-y-auto text-black p-4">
      {mode === "building" && buildingFloors && buildingFootprintArea ? (
        <>
          <h3 className="font-bold mb-2 text-slate-800">Immeuble projeté</h3>
          <div className="mb-3 text-sm border-b pb-2 space-y-1">
            <div><strong>Emprise au sol:</strong> {Math.round(buildingFootprintArea)} m²</div>
            <div><strong>Nombre d'étages:</strong> {buildingFloors} {buildingMaxFloors && <span className="text-xs text-slate-500">/ {buildingMaxFloors} max</span>}</div>
            <div><strong>Surface totale (approx.):</strong> {Math.round(buildingFootprintArea * buildingFloors)} m²</div>
          </div>

          <div className="mb-4 space-y-3 p-3 bg-slate-50 rounded border text-sm">
            <div className="font-semibold text-slate-700 mb-1">Dimensions & Orientation</div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Rotation</span>
                <span>{buildingRotation}°</span>
              </div>
              <input
                type="range" min="-180" max="180" step="1"
                value={buildingRotation}
                onChange={(e) => onChangeTransform(parseInt(e.target.value), buildingScaleWidth, buildingScaleLength)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Largeur (Facteur)</span>
                <span>x{buildingScaleWidth.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0.5" max="1.5" step="0.05"
                value={buildingScaleWidth}
                onChange={(e) => onChangeTransform(buildingRotation, parseFloat(e.target.value), buildingScaleLength)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Profondeur (Facteur)</span>
                <span>x{buildingScaleLength.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0.5" max="1.5" step="0.05"
                value={buildingScaleLength}
                onChange={(e) => onChangeTransform(buildingRotation, buildingScaleWidth, parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
          </div>

          {buildingConstraints && (
            <div className="mt-2 text-xs grid grid-cols-2 gap-x-3 gap-y-1 border rounded p-2 bg-slate-50 text-gray-700">
              <div><strong>Hauteur max</strong><br />{buildingConstraints.maxHeight} m</div>
              <div><strong>Recul min</strong><br />{buildingConstraints.spacingMeters} m</div>
              <div><strong>Emprise PLU</strong><br />{Math.round(buildingConstraints.coverageRatio * 100)}%</div>
            </div>
          )}

          <div className="mt-4 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-700">Étage(s)</span>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 rounded border text-xs disabled:opacity-40" onClick={() => onChangeFloors(-1)} disabled={buildingFloors <= 1 || buildingLoading}>-</button>
                <span className="text-sm font-semibold">{buildingFloors}</span>
                <button className="px-2 py-1 rounded border text-xs disabled:opacity-40" onClick={() => onChangeFloors(1)} disabled={!!buildingMaxFloors && buildingFloors >= buildingMaxFloors || buildingLoading}>+</button>
              </div>
            </div>
            {buildingError && <div className="mt-1 text-xs text-red-600">{buildingError}</div>}
          </div>

          <div className="mt-3 space-y-3">
            <button className="w-full py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-sm font-medium disabled:opacity-50" onClick={onBuild} disabled={buildingLoading}>
              {buildingLoading ? "Construction…" : "Build"}
            </button>
            <button className="w-full py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium disabled:opacity-50" onClick={onDeleteBuilding}>
              Supprimer bâtiment
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="font-bold mb-2 text-slate-800">Parcelle sélectionnée</h3>
          {parcelInfo && (
            <div className="mb-3 text-sm border-b pb-2">
              <div><strong>Commune:</strong> {parcelInfo.nom_com}</div>
              <div><strong>Section:</strong> {parcelInfo.section}</div>
              <div><strong>Numéro:</strong> {parcelInfo.numero}</div>
            </div>
          )}
          <div className="text-sm text-gray-500 mt-1">Surface: {area} m²</div>
          {buildingConstraints && (
            <div className="mt-3 text-xs grid grid-cols-2 gap-x-3 gap-y-1 border rounded p-2 bg-slate-50 text-gray-700">
              <div><strong>Hauteur max</strong><br />{buildingConstraints.maxHeight} m</div>
              <div><strong>Niveaux</strong><br />{buildingConstraints.floors}</div>
              <div><strong>Recul min</strong><br />{buildingConstraints.spacingMeters} m</div>
              <div><strong>Emprise</strong><br />{Math.round(buildingConstraints.coverageRatio * 100)}%</div>
            </div>
          )}
          {buildingError && <div className="mt-2 text-xs text-red-600">{buildingError}</div>}

          <div className="mt-3">
            {gpuLoading && <div className="text-xs text-gray-500 mb-2">Chargement données PLU…</div>}
            {gpuError && <div className="text-xs text-red-600 mb-2">{gpuError}</div>}
            <div className="max-h-90 overflow-y-auto space-y-3 pr-2 text-xs">
              {GPU_ENDPOINTS.map((section) => {
                const features = gpuData?.[section.key] || [];
                if (!gpuLoading && !features.length) {
                  return <div key={section.key}><div className="font-semibold text-gray-700">{section.label}</div><div className="text-gray-400">Aucune info</div></div>;
                }
                return (
                  <div key={section.key}>
                    <div className="font-semibold text-gray-700">{section.label}</div>
                    <div className="mt-1 space-y-1">
                      {features.map((f, i) => f.properties?.libelle && (
                        <div key={i} className="rounded border p-2 bg-gray-50 text-gray-700">{f.properties.libelle}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-3">
            <button className="w-full py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-sm font-medium disabled:opacity-50" onClick={onBuild} disabled={!buildingConstraints || buildingLoading}>
              {buildingLoading ? "Construction…" : "Build"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}