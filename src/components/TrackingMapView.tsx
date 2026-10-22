import React, { useState, useEffect } from 'react';
import { Truck, TransportRequest } from '../types/index.ts';
import { TrackingMap } from './TrackingMap.tsx';
import { formatDateTimeFR, isRecent } from '../lib/date-utils.ts';
import { getTruckStatusBadge, getTruckTypeLabel } from '../lib/status-helpers.tsx';
import { Truck as TruckIcon, MapPin, RefreshCw, Navigation, Battery, ShieldAlert } from 'lucide-react';

export const TrackingMapView: React.FC = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [activeRequests, setActiveRequests] = useState<TransportRequest[]>([]);
  const [selectedMission, setSelectedMission] = useState<TransportRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/trucks').then((r) => r.json()),
      fetch('/api/transport-requests').then((r) => r.json()),
    ])
      .then(([tData, rData]: [Truck[], TransportRequest[]]) => {
        setTrucks(tData);
        const inProgress = rData.filter((r) =>
          ['EN_ROUTE_CHARGEMENT', 'ARRIVE_QUAI', 'CHARGEMENT_EN_COURS', 'BL_VALIDE', 'EN_TRANSIT', 'ARRIVE_DESTINATION', 'LIVRAISON_EN_COURS'].includes(r.status)
        );
        setActiveRequests(inProgress);
        if (inProgress.length > 0 && !selectedMission) {
          setSelectedMission(inProgress[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Carte & Télémétrie en Temps Réel</h2>
          <p className="text-xs text-slate-500">
            Suivi GPS des convois routiers, corridors autoroutiers et statuts de quai en Algérie
          </p>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir les Balises GPS
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map */}
        <div className="lg:col-span-2">
          <TrackingMap
            trucks={trucks}
            selectedMission={selectedMission}
            heightClass="h-[600px]"
          />
        </div>

        {/* Sidebar Convoys and Active Missions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Convois Actifs sur Route ({activeRequests.length})
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {activeRequests.map((r) => {
                const isSelected = selectedMission?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedMission(r)}
                    className={`p-3 rounded-xl border text-xs transition cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-400'
                        : 'bg-slate-50/50 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{r.requestRef}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {r.status}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium">{r.goodsType}</p>

                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p>
                        <strong>Trajet :</strong> {r.pickupWilaya} ➔ {r.deliveryWilaya}
                      </p>
                      <p>
                        <strong>Camion :</strong> {r.assignedTruck?.licensePlate || 'N/A'} (
                        {r.assignedDriver?.name || 'Chauffeur'})
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Navigation className="w-3 h-3" /> Position suivie
                      </span>
                      <span className="text-slate-400 font-mono">
                        {formatDateTimeFR(r.updatedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {activeRequests.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  Aucun convoi en transit routier actuellement.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
