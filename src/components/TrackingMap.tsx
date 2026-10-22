import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Truck, TransportRequest } from '../types/index.ts';
import { formatDateTimeFR, isRecent } from '../lib/date-utils.ts';

interface TrackingMapProps {
  trucks?: Truck[];
  selectedMission?: TransportRequest | null;
  heightClass?: string;
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
  trucks = [],
  selectedMission = null,
  heightClass = 'h-[500px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centered on Northern Algeria (Alger - Setif - Oran corridor)
      const map = L.map(mapContainerRef.current, {
        center: [36.3, 3.5],
        zoom: 7,
        scrollWheelZoom: true,
      });

      // Professional clean cartography tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributeurs',
        maxZoom: 18,
      }).addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const bounds = L.latLngBounds([]);

    // 1. If a specific mission is selected, draw pickup, delivery and route
    if (selectedMission) {
      const pLat = selectedMission.pickupLat || 36.7538;
      const pLng = selectedMission.pickupLng || 3.0588;
      const dLat = selectedMission.deliveryLat || 35.6987;
      const dLng = selectedMission.deliveryLng || -0.6349;

      // Pickup pin
      const pickupIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white shadow-lg border-2 border-white font-bold text-xs">
            DEP
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const pMarker = L.marker([pLat, pLng], { icon: pickupIcon }).bindPopup(`
        <div class="p-2 font-sans text-xs">
          <p class="font-bold text-emerald-800 text-sm">Site de Chargement (Départ)</p>
          <p class="text-slate-600">${selectedMission.pickupAddress}</p>
          <p class="font-semibold mt-1">Wilaya: ${selectedMission.pickupWilaya}</p>
          <p class="text-slate-500">Contact: ${selectedMission.pickupContactName} (${selectedMission.pickupContactPhone})</p>
        </div>
      `);
      group.addLayer(pMarker);
      bounds.extend([pLat, pLng]);

      // Delivery pin
      const deliveryIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white shadow-lg border-2 border-white font-bold text-xs">
            ARR
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const dMarker = L.marker([dLat, dLng], { icon: deliveryIcon }).bindPopup(`
        <div class="p-2 font-sans text-xs">
          <p class="font-bold text-indigo-800 text-sm">Site de Livraison (Destination)</p>
          <p class="text-slate-600">${selectedMission.deliveryAddress}</p>
          <p class="font-semibold mt-1">Wilaya: ${selectedMission.deliveryWilaya}</p>
          <p class="text-slate-500">Contact: ${selectedMission.deliveryContactName} (${selectedMission.deliveryContactPhone})</p>
        </div>
      `);
      group.addLayer(dMarker);
      bounds.extend([dLat, dLng]);

      // Route line
      const routeLine = L.polyline(
        [
          [pLat, pLng],
          [dLat, dLng],
        ],
        {
          color: '#4f46e5',
          weight: 4,
          opacity: 0.7,
          dashArray: '8, 8',
        }
      );
      group.addLayer(routeLine);
    }

    // 2. Plot trucks
    trucks.forEach((t) => {
      if (!t.currentLat || !t.currentLng) return;

      const isLive = isRecent(t.lastPositionTime, 45);
      const isTransit = t.operationalStatus === 'EN_TRANSIT' || t.operationalStatus === 'EN_LIVRAISON';

      const truckHtml = `
        <div class="relative flex items-center justify-center w-10 h-10 rounded-full ${
          isTransit ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white'
        } shadow-xl border-2 border-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
          ${
            isLive
              ? '<span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white animate-ping"></span>'
              : ''
          }
        </div>
      `;

      const truckIcon = L.divIcon({
        className: 'custom-truck-marker',
        html: truckHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const positionText = isLive
        ? `<span class="inline-flex items-center gap-1 text-emerald-700 font-medium">● Suivi GPS actif (${formatDateTimeFR(t.lastPositionTime)})</span>`
        : `<span class="inline-flex items-center gap-1 text-rose-600 font-medium">⚠️ Position non actualisée (${formatDateTimeFR(t.lastPositionTime) || 'Inconnue'})</span>`;

      const marker = L.marker([t.currentLat, t.currentLng], { icon: truckIcon }).bindPopup(`
        <div class="p-2.5 font-sans text-xs min-w-[220px]">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <span class="font-bold text-slate-900 text-sm">${t.licensePlate}</span>
            <span class="text-xs px-2 py-0.5 rounded font-semibold bg-slate-100">${t.truckType}</span>
          </div>
          <p class="text-slate-700 font-medium mt-1.5">${t.brandModel}</p>
          <p class="text-slate-600">${t.carrier?.name || 'Transporteur'}</p>
          <div class="mt-2 pt-2 border-t border-slate-100 space-y-1">
            <p><strong>Emplacement:</strong> ${t.currentLocationName || t.currentWilaya}</p>
            <p><strong>Capacité:</strong> ${t.maxTonnage} T / ${t.usableVolume} m³</p>
            <p><strong>Chauffeur:</strong> ${t.defaultDriver?.name || 'Non assigné'}</p>
            <div class="pt-1.5 text-[11px]">${positionText}</div>
          </div>
        </div>
      `);

      group.addLayer(marker);
      bounds.extend([t.currentLat, t.currentLng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [trucks, selectedMission]);

  return (
    <div className={`w-full ${heightClass} rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-lg shadow-md border border-slate-200 text-xs font-sans z-[1000] pointer-events-none">
        <p className="font-bold text-slate-800">Légende Réseau Algérie</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>Position GPS récente</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
          <span>Position non actualisée</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span>Camion en transit</span>
        </div>
      </div>
    </div>
  );
};
