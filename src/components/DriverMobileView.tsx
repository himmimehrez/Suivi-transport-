import React, { useState, useEffect } from 'react';
import { TransportRequest, User } from '../types/index.ts';
import { getRequestStatusBadge } from '../lib/status-helpers.tsx';
import { formatDateTimeFR } from '../lib/date-utils.ts';
import { BarcodeScannerModal } from './BarcodeScannerModal.tsx';
import { ReportIncidentModal } from './ReportIncidentModal.tsx';
import {
  Truck,
  MapPin,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Send,
  Navigation,
  Clock,
  Phone,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface DriverMobileViewProps {
  currentUser: User;
  onRefreshUser: () => void;
}

export const DriverMobileView: React.FC<DriverMobileViewProps> = ({ currentUser, onRefreshUser }) => {
  const [missions, setMissions] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeMission, setActiveMission] = useState<TransportRequest | null>(null);

  // Modals
  const [showScanModal, setShowScanModal] = useState<boolean>(false);
  const [scanDocType, setScanDocType] = useState<'BON_DE_LIVRAISON' | 'PREUVE_DE_LIVRAISON_POD'>('BON_DE_LIVRAISON');
  const [showIncidentModal, setShowIncidentModal] = useState<boolean>(false);
  const [gpsUpdating, setGpsUpdating] = useState<boolean>(false);
  const [gpsSuccessMsg, setGpsSuccessMsg] = useState<string | null>(null);

  const fetchDriverMissions = () => {
    setLoading(true);
    fetch('/api/transport-requests')
      .then((r) => r.json())
      .then((data: TransportRequest[]) => {
        setMissions(data);
        // Find current in-progress or assigned mission
        const current = data.find((m) =>
          !['LIVRE', 'CLOTUREE', 'ANNULEE', 'REFUSEE'].includes(m.status)
        );
        setActiveMission(current || data[0] || null);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDriverMissions();
  }, [currentUser]);

  const handleDriverAction = async (newStatus: string, comment: string) => {
    if (!activeMission) return;
    try {
      let lat: number | undefined = undefined;
      let lng: number | undefined = undefined;

      if (navigator.geolocation) {
        try {
          const pos: any = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // GPS fallback
        }
      }

      const res = await fetch(`/api/transport-requests/${activeMission.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus,
          comment,
          lat,
          lng,
          locationName: newStatus.includes('CHARGEMENT')
            ? activeMission.pickupAddress
            : activeMission.deliveryAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erreur lors de l’action.');
        return;
      }

      fetchDriverMissions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateGps = async () => {
    if (!activeMission) return;
    setGpsUpdating(true);
    setGpsSuccessMsg(null);

    let lat = 36.1652; // Default along autoroute
    let lng = 1.3345;
    let locationName = 'Autoroute Est-Ouest (Position Chauffeur)';

    if (navigator.geolocation) {
      try {
        const pos: any = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        locationName = `Coordonnées GPS directes (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      } catch (err) {
        console.warn('Browser GPS prompt was dismissed, using simulation coords:', err);
      }
    }

    try {
      const res = await fetch(`/api/transport-requests/${activeMission.id}/gps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          speedKmH: 72.0,
          headingDeg: 260.0,
          batteryPercent: 88,
          locationName,
        }),
      });

      if (res.ok) {
        setGpsSuccessMsg('Position GPS transmise au client et à l’exploitant !');
        setTimeout(() => setGpsSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGpsUpdating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20 bg-slate-900 text-slate-100 font-sans">
      {/* Top Mobile Bar */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight">{currentUser.name}</h2>
            <p className="text-[11px] text-amber-400 font-mono">
              Chauffeur • {currentUser.driverLicenseCategory || 'Poids Lourd'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchDriverMissions}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {gpsSuccessMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{gpsSuccessMsg}</span>
          </div>
        )}

        {/* Active Mission Card */}
        {activeMission ? (
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700 p-4 space-y-4 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Mission Active
                </span>
                <h3 className="text-base font-bold text-white font-mono">{activeMission.requestRef}</h3>
              </div>
              <div>{getRequestStatusBadge(activeMission.status)}</div>
            </div>

            {/* Quick Summary */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-amber-400">{activeMission.goodsType}</p>
              <p className="text-slate-300">
                Poids : <strong>{activeMission.totalWeightTons} Tonnes</strong> ({activeMission.quantity}{' '}
                {activeMission.unit})
              </p>
              {activeMission.specialInstructions && (
                <p className="text-amber-200 text-[11px] pt-1">⚠️ {activeMission.specialInstructions}</p>
              )}
            </div>

            {/* Departure */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Chargement ({activeMission.pickupWilaya})
              </span>
              <p className="text-white font-semibold">{activeMission.pickupAddress}</p>
              <p className="text-slate-400">
                Heure prévue : {formatDateTimeFR(activeMission.pickupDateTime)}
              </p>
              <div className="flex items-center justify-between pt-1 text-slate-300">
                <span>{activeMission.pickupContactName}</span>
                <a
                  href={`tel:${activeMission.pickupContactPhone}`}
                  className="inline-flex items-center gap-1 text-emerald-400 font-bold font-mono"
                >
                  <Phone className="w-3 h-3" /> Appeler
                </a>
              </div>
            </div>

            {/* Delivery */}
            <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Destination ({activeMission.deliveryWilaya})
              </span>
              <p className="text-white font-semibold">{activeMission.deliveryAddress}</p>
              <p className="text-slate-400">
                Livraison avant : {formatDateTimeFR(activeMission.deliveryDateTime)}
              </p>
              <div className="flex items-center justify-between pt-1 text-slate-300">
                <span>{activeMission.deliveryContactName}</span>
                <a
                  href={`tel:${activeMission.deliveryContactPhone}`}
                  className="inline-flex items-center gap-1 text-indigo-400 font-bold font-mono"
                >
                  <Phone className="w-3 h-3" /> Appeler
                </a>
              </div>
            </div>

            {/* Big Action Buttons for Driver */}
            <div className="space-y-2.5 pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Étapes de la mission (Validation tactile)
              </span>

              {/* Step 1: Arrived at dock */}
              {['AFFECTEE', 'CONFIRMEE'].includes(activeMission.status) && (
                <button
                  onClick={() => handleDriverAction('ARRIVE_QUAI', 'Chauffeur arrivé au quai de chargement.')}
                  className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  1. Signaler mon arrivée au Quai
                </button>
              )}

              {/* Step 2: Loading in progress */}
              {activeMission.status === 'ARRIVE_QUAI' && (
                <button
                  onClick={() => handleDriverAction('CHARGEMENT_EN_COURS', 'Chargement des marchandises commencé.')}
                  className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Clock className="w-5 h-5" />
                  2. Débuter les opérations de Chargement
                </button>
              )}

              {/* Step 3: End of loading & Scan BL */}
              {activeMission.status === 'CHARGEMENT_EN_COURS' && (
                <>
                  <button
                    onClick={() => handleDriverAction('CHARGEMENT_TERMINE', 'Chargement terminé et sécurisé.')}
                    className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Confirmer Fin du Chargement
                  </button>
                  <button
                    onClick={() => {
                      setScanDocType('BON_DE_LIVRAISON');
                      setShowScanModal(true);
                    }}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-5 h-5" />
                    Scanner le Bon de Livraison (BL)
                  </button>
                </>
              )}

              {/* Step 4: Departure */}
              {['CHARGEMENT_TERMINE', 'BL_VALIDE'].includes(activeMission.status) && (
                <button
                  onClick={() => handleDriverAction('EN_TRANSIT', 'Départ du site, camion en route vers destination.')}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Navigation className="w-5 h-5" />
                  3. Signaler le Départ / En Transit
                </button>
              )}

              {/* Step 5: Transit Controls (GPS + Arrival) */}
              {activeMission.status === 'EN_TRANSIT' && (
                <div className="space-y-2">
                  <button
                    onClick={handleUpdateGps}
                    disabled={gpsUpdating}
                    className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-amber-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 border border-slate-600"
                  >
                    <Navigation className="w-4 h-4" />
                    {gpsUpdating ? 'Transmission GPS...' : 'Actualiser ma Position GPS en direct'}
                  </button>

                  <button
                    onClick={() => handleDriverAction('ARRIVE_DESTINATION', 'Chauffeur arrivé sur le site de livraison.')}
                    className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-5 h-5" />
                    4. Signaler Arrivée à Destination
                  </button>
                </div>
              )}

              {/* Step 6: POD Proof of delivery upload */}
              {['ARRIVE_DESTINATION', 'LIVRAISON_EN_COURS'].includes(activeMission.status) && (
                <button
                  onClick={() => {
                    setScanDocType('PREUVE_DE_LIVRAISON_POD');
                    setShowScanModal(true);
                  }}
                  className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xl transition flex items-center justify-center gap-2"
                >
                  <FileCheck className="w-5 h-5" />
                  5. Signer & Transmettre Preuve (POD)
                </button>
              )}

              {/* Incident Button */}
              <button
                onClick={() => setShowIncidentModal(true)}
                className="w-full py-2.5 px-4 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold text-xs rounded-xl border border-rose-800 transition flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Signaler un Incident, Retard ou Panne
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-800/50 rounded-2xl border border-slate-800 text-slate-400">
            <Truck className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-white">Aucune mission en cours</p>
            <p className="text-xs text-slate-500 mt-1">
              Vous n'avez pas de transport actif pour le moment.
            </p>
          </div>
        )}

        {/* Driver Missions List / History */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Historique de mes missions ({missions.length})
          </h4>

          <div className="space-y-2">
            {missions.map((m) => (
              <div
                key={m.id}
                onClick={() => setActiveMission(m)}
                className={`p-3 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                  activeMission?.id === m.id
                    ? 'bg-slate-800 border-amber-500'
                    : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{m.requestRef}</span>
                    {getRequestStatusBadge(m.status)}
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {m.pickupWilaya} ➔ {m.deliveryWilaya} ({m.totalWeightTons}T)
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showScanModal && activeMission && (
        <BarcodeScannerModal
          mission={activeMission}
          docType={scanDocType}
          onClose={() => setShowScanModal(false)}
          onSuccess={() => fetchDriverMissions()}
        />
      )}

      {showIncidentModal && activeMission && (
        <ReportIncidentModal
          mission={activeMission}
          onClose={() => setShowIncidentModal(false)}
          onSuccess={() => fetchDriverMissions()}
        />
      )}
    </div>
  );
};
