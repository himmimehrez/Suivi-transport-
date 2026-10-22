import React, { useState, useEffect } from 'react';
import { TransportRequest, User, Truck, UserRole } from '../types/index.ts';
import { getRequestStatusBadge, getTruckTypeLabel } from '../lib/status-helpers.tsx';
import { formatDateTimeFR } from '../lib/date-utils.ts';
import { TrackingMap } from './TrackingMap.tsx';
import { BarcodeScannerModal } from './BarcodeScannerModal.tsx';
import { ReportIncidentModal } from './ReportIncidentModal.tsx';
import {
  X,
  Truck as TruckIcon,
  User as UserIcon,
  Calendar,
  MapPin,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Phone,
  QrCode,
  ShieldAlert,
  Send,
  Building,
} from 'lucide-react';

interface MissionDetailModalProps {
  missionId: number;
  currentUser: User | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const MissionDetailModal: React.FC<MissionDetailModalProps> = ({
  missionId,
  currentUser,
  onClose,
  onUpdate,
}) => {
  const [mission, setMission] = useState<TransportRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Submodals
  const [showScanModal, setShowScanModal] = useState<boolean>(false);
  const [scanDocType, setScanDocType] = useState<'BON_DE_LIVRAISON' | 'PREUVE_DE_LIVRAISON_POD'>('BON_DE_LIVRAISON');
  const [showIncidentModal, setShowIncidentModal] = useState<boolean>(false);

  // Assign modal state
  const [showAssignForm, setShowAssignForm] = useState<boolean>(false);
  const [carrierTrucks, setCarrierTrucks] = useState<Truck[]>([]);
  const [carrierDrivers, setCarrierDrivers] = useState<User[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Refusal modal state
  const [showRefusalForm, setShowRefusalForm] = useState<boolean>(false);
  const [refusalReason, setRefusalReason] = useState<string>('');

  const fetchMission = () => {
    setLoading(true);
    fetch(`/api/transport-requests/${missionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setErrorMsg(data.error);
        else setMission(data);
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMission();
  }, [missionId]);

  // Load carrier resources if carrier or admin
  useEffect(() => {
    if (mission && (currentUser?.role === 'CARRIER' || currentUser?.role === 'ADMIN')) {
      const carrierId = mission.carrierCompanyId || currentUser?.companyId;
      if (carrierId) {
        fetch(`/api/trucks?carrierId=${carrierId}`)
          .then((r) => r.json())
          .then((data: Truck[]) => {
            setCarrierTrucks(data);
            if (data.length > 0) setSelectedTruckId(String(data[0].id));
          });

        fetch(`/api/users`)
          .then((r) => r.json())
          .then((data: User[]) => {
            const drivers = data.filter((u) => u.role === 'DRIVER' && u.companyId === carrierId);
            setCarrierDrivers(drivers);
            if (drivers.length > 0) setSelectedDriverId(String(drivers[0].id));
          });
      }
    }
  }, [mission, currentUser]);

  const handleStatusTransition = async (newStatus: string, comment: string) => {
    if (!mission) return;
    try {
      let lat: number | undefined = undefined;
      let lng: number | undefined = undefined;
      if (navigator.geolocation) {
        try {
          const pos: any = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 2000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // fallback
        }
      }

      const res = await fetch(`/api/transport-requests/${mission.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus,
          comment,
          lat,
          lng,
          locationName: newStatus.includes('CHARGEMENT') ? mission.pickupAddress : mission.deliveryAddress,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors du changement de statut.');
      }

      fetchMission();
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mission || !selectedTruckId || !selectedDriverId) return;

    try {
      const res = await fetch(`/api/transport-requests/${mission.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckId: selectedTruckId,
          driverId: selectedDriverId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’affectation.');
      }

      setShowAssignForm(false);
      fetchMission();
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRefusalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mission || !refusalReason.trim()) return;

    try {
      const res = await fetch(`/api/transport-requests/${mission.id}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refusalReason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors du refus.');
      }

      setShowRefusalForm(false);
      fetchMission();
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center gap-3 text-slate-700">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          Chargement des détails de la mission...
        </div>
      </div>
    );
  }

  if (errorMsg || !mission) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900">Erreur d'accès</h3>
          <p className="text-xs text-slate-600 mt-2">{errorMsg || 'Mission introuvable.'}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const role = currentUser?.role || 'ADMIN';
  const isDriver = role === 'DRIVER';
  const isCarrier = role === 'CARRIER' || role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-6 overflow-hidden border border-slate-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-lg font-bold">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono">{mission.requestRef}</h2>
                {getRequestStatusBadge(mission.status)}
              </div>
              <p className="text-xs text-slate-300">
                Créée le {formatDateTimeFR(mission.createdAt)} par {mission.clientCompany?.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Action Ribbon based on role & status */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider block">
                Actions Disponibles pour votre profil ({currentUser?.name})
              </span>
              <p className="text-xs text-amber-800">
                Statut actuel: <strong>{mission.status}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Carrier actions */}
              {isCarrier && mission.status === 'DEMANDE_SOUMISE' && (
                <>
                  <button
                    onClick={() => handleStatusTransition('CONFIRMEE', 'Réservation acceptée par le transporteur.')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                  >
                    Accepter la Demande
                  </button>
                  <button
                    onClick={() => setShowRefusalForm(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                  >
                    Refuser avec Motif
                  </button>
                </>
              )}

              {isCarrier && (mission.status === 'CONFIRMEE' || !mission.assignedTruckId) && (
                <button
                  onClick={() => setShowAssignForm(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  <TruckIcon className="w-3.5 h-3.5" />
                  Affecter Camion & Chauffeur
                </button>
              )}

              {/* Driver Workflow Actions */}
              {(isDriver || role === 'ADMIN') && (
                <>
                  {['AFFECTEE', 'CONFIRMEE'].includes(mission.status) && (
                    <button
                      onClick={() => handleStatusTransition('ARRIVE_QUAI', 'Chauffeur arrivé au quai de chargement.')}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition"
                    >
                      Signaler Arrivée au Quai
                    </button>
                  )}

                  {mission.status === 'ARRIVE_QUAI' && (
                    <button
                      onClick={() => handleStatusTransition('CHARGEMENT_EN_COURS', 'Opérations de chargement commencées.')}
                      className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition"
                    >
                      Débuter Chargement
                    </button>
                  )}

                  {mission.status === 'CHARGEMENT_EN_COURS' && (
                    <button
                      onClick={() => handleStatusTransition('CHARGEMENT_TERMINE', 'Chargement terminé et arrimé.')}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition"
                    >
                      Confirmer Fin Chargement
                    </button>
                  )}

                  {['CHARGEMENT_TERMINE', 'CHARGEMENT_EN_COURS'].includes(mission.status) && (
                    <button
                      onClick={() => {
                        setScanDocType('BON_DE_LIVRAISON');
                        setShowScanModal(true);
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Scanner Bon de Livraison (BL)
                    </button>
                  )}

                  {['BL_VALIDE', 'CHARGEMENT_TERMINE'].includes(mission.status) && (
                    <button
                      onClick={() => handleStatusTransition('EN_TRANSIT', 'Départ du camion vers destination.')}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                    >
                      Signaler Départ / En Route
                    </button>
                  )}

                  {mission.status === 'EN_TRANSIT' && (
                    <>
                      <button
                        onClick={() => handleStatusTransition('ARRIVE_DESTINATION', 'Arrivé sur le site destinataire.')}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        Arrivé à Destination
                      </button>
                      <button
                        onClick={() => {
                          setScanDocType('PREUVE_DE_LIVRAISON_POD');
                          setShowScanModal(true);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Enregistrer Preuve (POD)
                      </button>
                    </>
                  )}

                  {mission.status === 'ARRIVE_DESTINATION' && (
                    <button
                      onClick={() => {
                        setScanDocType('PREUVE_DE_LIVRAISON_POD');
                        setShowScanModal(true);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Valider Déchargement & Signer POD
                    </button>
                  )}
                </>
              )}

              {/* Administrative Closure */}
              {!isDriver && mission.status === 'LIVRE' && (
                <button
                  onClick={() => handleStatusTransition('CLOTUREE', 'Mission validée et clôturée administrativement.')}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
                >
                  Clôturer Administrativement la Mission
                </button>
              )}

              {/* Incident Button (Always available) */}
              <button
                onClick={() => setShowIncidentModal(true)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition flex items-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                Signaler Incident
              </button>
            </div>
          </div>

          {/* Carrier Assignment Form (Collapsible) */}
          {showAssignForm && (
            <form onSubmit={handleAssignSubmit} className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-900 uppercase">
                  Affectation des ressources pour la mission {mission.requestRef}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAssignForm(false)}
                  className="text-indigo-400 hover:text-indigo-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sélectionner un camion ({carrierTrucks.length} disponibles)
                  </label>
                  <select
                    value={selectedTruckId}
                    onChange={(e) => setSelectedTruckId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {carrierTrucks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.licensePlate} - {t.brandModel} ({t.maxTonnage}T, {t.truckType}) - {t.operationalStatus}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sélectionner un chauffeur
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {carrierDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.driverLicenseCategory || 'Poids Lourd'}) - Tél: {d.phone || '-'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-white rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                >
                  Valider l'affectation
                </button>
              </div>
            </form>
          )}

          {/* Refusal Form */}
          {showRefusalForm && (
            <form onSubmit={handleRefusalSubmit} className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-rose-900">Motif du refus de la demande</h4>
              <textarea
                required
                rows={2}
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                placeholder="Indiquez la raison (ex: Flotte saturée, délai d'acheminement trop court, typologie non compatible...)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRefusalForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-white rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700"
                >
                  Confirmer le Refus
                </button>
              </div>
            </form>
          )}

          {/* Mission Details Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Goods & Truck Spec */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Marchandise & Spécifications
              </span>
              <p className="text-sm font-semibold text-slate-900">{mission.goodsType}</p>
              <div className="text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Quantité:</strong> {mission.quantity} {mission.unit}
                </p>
                <p>
                  <strong>Poids total:</strong> {mission.totalWeightTons} Tonnes
                </p>
                <p>
                  <strong>Volume:</strong> {mission.totalVolumeM3 ? `${mission.totalVolumeM3} m³` : 'Non spécifié'}
                </p>
                <p>
                  <strong>Camion requis:</strong> {getTruckTypeLabel(mission.requiredTruckType)}
                </p>
              </div>
              {mission.specialInstructions && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-amber-800 bg-amber-50/60 p-2 rounded">
                  <strong>Instructions:</strong> {mission.specialInstructions}
                </div>
              )}
            </div>

            {/* Departure */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Chargement (Départ)
              </span>
              <p className="text-xs font-semibold text-slate-900">{mission.pickupAddress}</p>
              <p className="text-xs text-slate-600">
                Wilaya: <strong>{mission.pickupWilaya}</strong>
              </p>
              <p className="text-xs text-slate-600">
                Date & Heure: <strong>{formatDateTimeFR(mission.pickupDateTime)}</strong>
              </p>
              <div className="pt-2 border-t border-emerald-100 text-xs text-slate-600">
                <p>Contact: {mission.pickupContactName}</p>
                <p className="font-mono text-emerald-800 font-semibold">{mission.pickupContactPhone}</p>
              </div>
            </div>

            {/* Destination */}
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Livraison (Destination)
              </span>
              <p className="text-xs font-semibold text-slate-900">{mission.deliveryAddress}</p>
              <p className="text-xs text-slate-600">
                Wilaya: <strong>{mission.deliveryWilaya}</strong>
              </p>
              <p className="text-xs text-slate-600">
                Date & Heure: <strong>{formatDateTimeFR(mission.deliveryDateTime)}</strong>
              </p>
              <div className="pt-2 border-t border-indigo-100 text-xs text-slate-600">
                <p>Contact: {mission.deliveryContactName}</p>
                <p className="font-mono text-indigo-800 font-semibold">{mission.deliveryContactPhone}</p>
              </div>
            </div>
          </div>

          {/* Assigned Resources Banner */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
                <TruckIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Camion Affecté</span>
                <p className="text-sm font-bold text-slate-900">
                  {mission.assignedTruck ? mission.assignedTruck.licensePlate : 'En attente d’affectation'}
                </p>
                {mission.assignedTruck && (
                  <p className="text-xs text-slate-600">
                    {mission.assignedTruck.brandModel} ({mission.assignedTruck.maxTonnage}T)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Chauffeur Dédié</span>
                <p className="text-sm font-bold text-slate-900">
                  {mission.assignedDriver ? mission.assignedDriver.name : 'En attente de chauffeur'}
                </p>
                {mission.assignedDriver && (
                  <p className="text-xs text-slate-600">Tél: {mission.assignedDriver.phone || 'Non renseigné'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Route Map */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Itinéraire & Localisation GPS
            </h4>
            <TrackingMap
              selectedMission={mission}
              trucks={mission.assignedTruck ? [mission.assignedTruck] : []}
              heightClass="h-[320px]"
            />
          </div>

          {/* Documents & POD Proofs */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Bons de Transport & Preuves de Livraison ({mission.deliveryNotes?.length || 0})
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mission.deliveryNotes && mission.deliveryNotes.length > 0 ? (
                mission.deliveryNotes.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 font-mono">{doc.blNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {doc.docType === 'PREUVE_DE_LIVRAISON_POD' ? 'Preuve POD Signée' : 'Bon de Livraison (BL)'}
                      </span>
                    </div>
                    <p className="text-slate-600">Scanné le {formatDateTimeFR(doc.scannedAt)}</p>
                    {doc.recipientName && (
                      <p className="text-slate-700 font-semibold">
                        Signé par : {doc.recipientName} ({doc.recipientTitle || 'Destinataire'})
                      </p>
                    )}
                    {doc.notes && <p className="text-slate-500 italic">"{doc.notes}"</p>}
                    {doc.fileUrl && (
                      <div className="pt-2">
                        <img src={doc.fileUrl} alt="Document" className="max-h-24 rounded border border-slate-200" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-xs text-slate-500 bg-slate-50 rounded-lg">
                  Aucun bon de livraison ou preuve POD numérisé pour le moment.
                </div>
              )}
            </div>
          </div>

          {/* Inviolable Chronological Audit Trail */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Journal Chronologique des Événements & Traçabilité Inviolable
            </h4>

            <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
              {mission.events && mission.events.length > 0 ? (
                mission.events.map((ev, idx) => (
                  <div key={idx} className="relative text-xs">
                    <span className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white ring-2 ring-slate-200"></span>
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>{ev.newStatus}</span>
                      <span className="text-[11px] text-slate-500 font-normal">{formatDateTimeFR(ev.timestamp)}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      Par <strong>{ev.userName}</strong> ({ev.userRole})
                    </p>
                    {ev.comment && <p className="text-slate-700 bg-slate-50 p-2 rounded mt-1">{ev.comment}</p>}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Aucun événement enregistré.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submodal Scan */}
      {showScanModal && (
        <BarcodeScannerModal
          mission={mission}
          docType={scanDocType}
          onClose={() => setShowScanModal(false)}
          onSuccess={() => {
            fetchMission();
            onUpdate();
          }}
        />
      )}

      {/* Submodal Incident */}
      {showIncidentModal && (
        <ReportIncidentModal
          mission={mission}
          onClose={() => setShowIncidentModal(false)}
          onSuccess={() => {
            fetchMission();
            onUpdate();
          }}
        />
      )}
    </div>
  );
};
