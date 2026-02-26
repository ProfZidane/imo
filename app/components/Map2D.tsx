"use client";
import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat, transform } from "ol/proj";
import { Style, Fill, Stroke, Circle as CircleStyle } from "ol/style";
import { Feature } from "ol";
import { Geometry, Point } from "ol/geom";
import { getArea } from "ol/sphere";

type Map2DProps = {
  active: boolean;
  onParcelSelect: (feature: Feature<Geometry>, parcelData: any) => void;
  vectorSourceRef: React.MutableRefObject<VectorSource | null>;
};

type AddressSuggestion = {
  properties: {
    label: string;
    name: string;
    city: string;
    postcode: string;
  };
  geometry: {
    coordinates: [number, number];
  };
};

export default function Map2D({ active, onParcelSelect, vectorSourceRef }: Map2DProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const searchMarkerSourceRef = useRef<VectorSource | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=5`
        );
        const data = await response.json();
        setSuggestions(data.features || []);
        setShowSuggestions(true);
      } catch (e) {
        console.error("Erreur de recherche d'adresse:", e);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectAddress = (suggestion: AddressSuggestion) => {
    const [lon, lat] = suggestion.geometry.coordinates;
    const map = mapInstanceRef.current;
    
    if (map) {
      const view = map.getView();
      const coordinate = fromLonLat([lon, lat]);
      
      view.animate({
        center: coordinate,
        zoom: 18,
        duration: 500,
      });

      if (searchMarkerSourceRef.current) {
        searchMarkerSourceRef.current.clear();
        const marker = new Feature({
          geometry: new Point(coordinate),
        });
        searchMarkerSourceRef.current.addFeature(marker);
      }
    }

    setSearchQuery(suggestion.properties.label);
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (!mapRef.current) return;
    
    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const searchMarkerSource = new VectorSource();
    searchMarkerSourceRef.current = searchMarkerSource;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({
          source: vectorSource,
          style: new Style({
            fill: new Fill({ color: "rgba(241, 241, 241, 0.92)" }),
            stroke: new Stroke({ color: "lime", width: 2 }),
          }),
        }),
        new VectorLayer({
          source: searchMarkerSource,
          style: new Style({
            image: new CircleStyle({
              radius: 8,
              fill: new Fill({ color: "rgba(255, 0, 0, 0.8)" }),
              stroke: new Stroke({ color: "white", width: 2 }),
            }),
          }),
        }),
      ],
      view: new View({ center: fromLonLat([2.35, 48.85]), zoom: 17 }),
    });
    mapInstanceRef.current = map;

    map.on('singleclick', async (evt) => {
      const view = map.getView();
      const lonLat = transform(evt.coordinate, view.getProjection(), 'EPSG:4326');
      try {
        const response = await fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${lonLat[0]},${lonLat[1]}]}`);
        const data = await response.json();
        if (data?.features?.length > 0) {
          const parcel = data.features[0];
          const format = new GeoJSON();
          const feature = format.readFeature(parcel, {
             dataProjection: 'EPSG:4326',
             featureProjection: view.getProjection()
          }) as Feature<Geometry>;
          
          vectorSource.clear();
          vectorSource.addFeature(feature);
          
          feature.set('area', Math.round(getArea(feature.getGeometry()!)));
          
          onParcelSelect(feature, parcel);
        }
      } catch (e) { console.error(e); }
    });

    return () => map.setTarget(undefined);
  }, []);

  return (
    <div className={active ? "w-full h-[calc(100vh-60px)] relative" : "hidden"}>
      <div className="absolute top-4 left-4 z-10 w-96">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Rechercher une adresse..."
            className="w-full px-4 py-3 pr-10 rounded-lg shadow-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
          {!isSearching && searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSuggestions([]);
                setShowSuggestions(false);
                searchMarkerSourceRef.current?.clear();
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-20">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSelectAddress(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50"
              >
                <div className="font-medium text-gray-800">{suggestion.properties.name}</div>
                <div className="text-sm text-gray-600">
                  {suggestion.properties.postcode} {suggestion.properties.city}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}