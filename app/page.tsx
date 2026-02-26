"use client";
import './globals.css';
import React, { useRef, useState } from "react";
import { Feature } from "ol";
import { Geometry } from "ol/geom";
import VectorSource from "ol/source/Vector";
import OpenAI from 'openai';

import { GpuFeature, BuildingConstraints, PanelMode, GeoJsonGeometry } from "./types";
import { fetchGpuData, deriveBuildingConstraints } from "./lib/api";
import { GpuSectionKey } from "./lib/constants";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Map2D from "./components/Map2D";
import Map3D, { Map3DRef } from "./components/Map3D";
import PerspectiveModal from "./components/PerspectiveModal";



export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"2D" | "3D">("2D");
  const [panelMode, setPanelMode] = useState<PanelMode>("parcel");

  const [parcelInfo, setParcelInfo] = useState<any>(null);
  const [area, setArea] = useState(0);
  const [gpuData, setGpuData] = useState<Record<GpuSectionKey, GpuFeature[]>>({} as any);
  const [gpuLoading, setGpuLoading] = useState(false);
  const [gpuError, setGpuError] = useState<string | null>(null);

  const [buildingConstraints, setBuildingConstraints] = useState<BuildingConstraints | null>(null);
  const [buildingFloors, setBuildingFloors] = useState<number | null>(null);
  const [buildingMaxFloors, setBuildingMaxFloors] = useState<number | null>(null);
  const [buildingFootprintArea, setBuildingFootprintArea] = useState<number | null>(null);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [buildingError, setBuildingError] = useState<string | null>(null);


  const [buildingRotation, setBuildingRotation] = useState(0);
  const [buildingScaleWidth, setBuildingScaleWidth] = useState(1);
  const [buildingScaleLength, setBuildingScaleLength] = useState(1);

  const [perspectiveModalOpen, setPerspectiveModalOpen] = useState(false);
  const [perspectiveImage, setPerspectiveImage] = useState<string | null>(null);
  const [perspectiveLoading, setPerspectiveLoading] = useState(false);

  const vectorSourceRef = useRef<VectorSource | null>(null);
  const map3dRef = useRef<Map3DRef>(null);
  const parcelGeometryRef = useRef<GeoJsonGeometry | null>(null);




  const clearAll = () => {
    vectorSourceRef.current?.clear();
    map3dRef.current?.clearEntities();
    setArea(0);
    setParcelInfo(null);
    setGpuData({} as any);
    setBuildingConstraints(null);
    setBuildingFloors(null);
    setBuildingMaxFloors(null);
    setBuildingFootprintArea(null);
    parcelGeometryRef.current = null;
    setPanelMode("parcel");
  };

  const handleParcelSelect = async (feature: Feature<Geometry>, data: any) => {
    setParcelInfo(data.properties);
    setArea(feature.get('area'));
    parcelGeometryRef.current = data.geometry;

    map3dRef.current?.clearEntities();
    setBuildingConstraints(null);
    setBuildingFloors(null);
    setPanelMode("parcel");
    setActiveTab("3D"); 

    map3dRef.current?.zoomToParcel(data.geometry, feature.getId() as string, data.properties);

    setGpuLoading(true);
    setGpuError(null);
    try {
      const { data: gpuResults, errors } = await fetchGpuData(data.geometry);
      setGpuData(gpuResults);
      if (errors.length) setGpuError(`Erreur chargement: ${errors.join(", ")}`);

      const constraints = deriveBuildingConstraints(gpuResults);
      setBuildingConstraints(constraints);
    } catch {
      setGpuError("Erreur système API GPU");
    } finally {
      setGpuLoading(false);
    }
  };


  const handleBuild = async (forcedFloors?: number) => {
    if (!parcelGeometryRef.current || !buildingConstraints) return;
    setBuildingLoading(true);
    setBuildingError(null);

    if (forcedFloors === undefined) {
      setBuildingRotation(0);
      setBuildingScaleWidth(1);
      setBuildingScaleLength(1);
    }

    try {
      const result = await map3dRef.current?.buildVirtualBuilding(parcelGeometryRef.current, buildingConstraints, forcedFloors);
      if (result) {
        setBuildingFloors(result.floors);
        setBuildingMaxFloors(result.maxFloors);
        setBuildingFootprintArea(result.footprintArea);
        setPanelMode("building");

        if (forcedFloors !== undefined) {
          map3dRef.current?.updateBuildingTransform(buildingRotation, buildingScaleWidth, buildingScaleLength);
        }
      }
    } catch (e) {
      setBuildingError("Impossible de générer le bâtiment 3D (géométrie complexe ou erreur).");
      console.error(e);
    } finally {
      setBuildingLoading(false);
    }
  };

  const handleChangeFloors = (delta: number) => {
    if (!buildingFloors || !buildingConstraints) return;
    handleBuild(buildingFloors + delta);
  };

  const handleTransformChange = (rotation: number, scaleWidth: number, scaleLength: number) => {
    setBuildingRotation(rotation);
    setBuildingScaleWidth(scaleWidth);
    setBuildingScaleLength(scaleLength);
    map3dRef.current?.updateBuildingTransform(rotation, scaleWidth, scaleLength);
  };

  const handleDeleteBuilding = () => {
    map3dRef.current?.deleteVirtualBuilding();
    setBuildingFloors(null);
    setBuildingMaxFloors(null);
    setBuildingFootprintArea(null);
    setPanelMode("parcel");
    setBuildingRotation(0);
    setBuildingScaleWidth(1);
    setBuildingScaleLength(1);
  };



  const handlePerspective = async () => {
    if (!map3dRef.current) return;

    setPerspectiveLoading(true);
    setPerspectiveModalOpen(true);
    setPerspectiveImage(null);

    try {
      const screenshot = await map3dRef.current.captureScreenshot();

      if (!screenshot) {
        alert("Erreur lors de la capture de la vue 3D");
        setPerspectiveLoading(false);
        return;
      }


      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        alert("Clé API OpenAI manquante (NEXT_PUBLIC_OPENAI_API_KEY)");
        setPerspectiveLoading(false);
        return;
      }

      console.log("Initialisation OpenAI...");
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const base64Image = screenshot.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

      console.log("1/2: Analyse de la scène avec GPT-4o...");

      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this wireframe image. Describe the building geometry, perspective angle, and composition in extreme detail so that DALL-E 3 can recreate it accurately. Describe it as a modern architectural rendering with concrete, glass, and wood materials. Describe a realistic setting with soft natural lighting. Your output must be ONLY the detailed image generation prompt." },
              {
                type: "image_url",
                image_url: {
                  "url": screenshot,
                },
              },
            ],
          },
        ],
      });

      const generatedPrompt = visionResponse.choices[0].message.content;
      console.log("Prompt généré:", generatedPrompt);

      if (!generatedPrompt) throw new Error("Impossible d'analyser l'image");

      console.log("2/2: Génération de l'image avec DALL-E 3...");

      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: "Photorealistic architectural render of: " + generatedPrompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      });

      const generatedImageBase64 = imageResponse.data?.[0]?.b64_json;

      if (generatedImageBase64) {
        setPerspectiveImage(`data:image/png;base64,${generatedImageBase64}`);
      } else {
        throw new Error("Pas d'image retournée par DALL-E");
      }
    } catch (error) {
      console.error('Error generating perspective:', error);
      alert("Erreur lors de la génération de la perspective");
    } finally {
      setPerspectiveLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col relative">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={clearAll}
        onPerspective={handlePerspective}
        perspectiveLoading={perspectiveLoading}
      />

      <div className="flex flex-1">
        <Map2D
          active={activeTab === "2D"}
          onParcelSelect={handleParcelSelect}
          vectorSourceRef={vectorSourceRef}
        />

        <div className={activeTab === "3D" ? "flex w-full h-[calc(100vh-60px)]" : "hidden"}>
          <Map3D
            ref={map3dRef}
            active={activeTab === "3D"}
            onEntitySelected={(type, data) => {
              if (type === "virtualBuilding") setPanelMode("building");
              else if (type === "parcel") { setPanelMode("parcel"); setParcelInfo(data); }
              else setPanelMode("parcel");
            }}
          />

          <Sidebar
            mode={panelMode}
            selectedEntity={parcelInfo || buildingFloors}
            parcelInfo={parcelInfo}
            area={area}
            gpuData={gpuData}
            gpuLoading={gpuLoading}
            gpuError={gpuError}
            buildingConstraints={buildingConstraints}
            buildingFloors={buildingFloors}
            buildingMaxFloors={buildingMaxFloors}
            buildingFootprintArea={buildingFootprintArea}
            buildingLoading={buildingLoading}
            buildingError={buildingError}
            onChangeFloors={handleChangeFloors}
            onBuild={() => handleBuild()}
            onDeleteBuilding={handleDeleteBuilding}

            buildingRotation={buildingRotation}
            buildingScaleWidth={buildingScaleWidth}
            buildingScaleLength={buildingScaleLength}
            onChangeTransform={handleTransformChange}
          />
        </div>
      </div>

      <PerspectiveModal
        isOpen={perspectiveModalOpen}
        onClose={() => setPerspectiveModalOpen(false)}
        imageUrl={perspectiveImage}
        isLoading={perspectiveLoading}
      />
    </div>
  );
}