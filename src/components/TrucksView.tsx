import React, { useState, useEffect } from 'react';
import { Truck, Company, User, TruckType, TruckStatus } from '../types/index.ts';
import { getTruckStatusBadge, getTruckTypeLabel } from '../lib/status-helpers.tsx';
import { formatDateTimeFR } from '../lib/date-utils.ts';
import { ALGERIA_WILAYAS } from '../lib/algeria-data.ts';
import {
  Truck as TruckIcon,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Wrench,
  ShieldCheck,
  X,
  FileCheck,
} from 'lucide-react';

interface TrucksViewProps {
  currentUser: User | null;
}

export const TrucksView: React.FC<TrucksViewProps> = ({ currentUser }) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [companiesList, setCompaniesList] = useState<Company[]>([]);
  const [driversList, setDriversList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Add truck modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [brandModel, setBrandModel] = useState<string>('Renault Trucks T520 4x2');
  const [truckType, setTruckType] = useState<TruckType>('PLATEAU');
  const [maxTonnage, setMaxTonnage] = useState<string>('25.0');
  const [usableVolume, setUsableVolume] = useState<string>('80.0');
  const [companyId, setCompanyId] = useState<string>('');
  const [defaultDriverId, setDefaultDriverId] = useState<string>('');
  const [technicalControlExpiry, setTechnicalControlExpiry] = useState<string>('15/12/2026');
  const [insuranceExpiry, setInsuranceExpiry] = useState<string>('30/11/2026');
  const [currentWilaya, setCurrentWilaya] = useState<string>('Alger');
  const [currentLocationName, setCurrentLocationName] = useState<string>('Dépôt Logistique');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchTrucks = () => {
    setLoading(true);
    let url = '/api/trucks';
    if (currentUser?.role === 'CARRIER' && currentUser.companyId) {
      url += `?carrierId=${currentUser.companyId}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((data: Truck[]) => setTrucks(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrucks();

    // Fetch companies & drivers
    fetch('/api/companies')
      .then((r) => r.json())
      .then((data: Company[]) => {
        const carriers = data.filter((c) => c.type === 'CARRIER');
        setCompaniesList(carriers);
        if (carriers.length > 0) setCompanyId(String(carriers[0].id));
      });

    fetch('/api/users')
      .then((r) => r.json())
      .then((data: User[]) => {
        setDriversList(data.filter((u) => u.role === 'DRIVER'));
      });
  }, [currentUser]);

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: licensePlate.trim(),
          brandModel: brandModel.trim(),
          truckType,
          maxTonnage,
          usableVolume,
          companyId: currentUser?.role === 'CARRIER' ? currentUser.companyId : companyId,
          defaultDriverId: defaultDriverId || null,
          technicalControlExpiry,
          insuranceExpiry,
          currentWilaya,
          currentLocationName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de l’ajout du camion.');
      }

      setShowAddModal(false);
      setLicensePlate('');
      fetchTrucks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (truckId: number, newStatus: TruckStatus) => {
    try {
      const res = await fetch(`/api/trucks/${truckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationalStatus: newStatus }),
      });
      if (res.ok) fetchTrucks();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTrucks = trucks.filter((t) => {
    const matchesSearch =
      t.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.brandModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.carrier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.currentWilaya.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.operationalStatus === statusFilter;
    const matchesType = typeFilter === 'ALL' || t.truckType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const canAdd = currentUser?.role === 'CARRIER' || currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestion de la Flotte de Camions</h2>
          <p className="text-xs text-slate-500">
            Fiches techniques détaillées, statuts opérationnels, disponibilité et documents légaux
          </p>
        </div>

        {canAdd && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter un Camion à la Flotte
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher par immatriculation, marque, transporteur, wilaya..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white"
          >
            <option value="ALL">Tous les statuts ({trucks.length})</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="RESERVE">Réservé</option>
            <option value="EN_COURS_CHARGEMENT">En Chargement</option>
            <option value="EN_TRANSIT">En Transit</option>
            <option value="EN_LIVRAISON">En Livraison</option>
            <option value="EN_MAINTENANCE">En Maintenance</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white"
          >
            <option value="ALL">Tous les types</option>
            <option value="PLATEAU">Plateau</option>
            <option value="FOURGON">Fourgon</option>
            <option value="FRIGORIFIQUE">Frigorifique</option>
            <option value="BENNE">Benne</option>
            <option value="CITERNE">Citerne</option>
            <option value="PORTE_CHAR">Porte-Char</option>
          </select>
        </div>
      </div>

      {/* Grid of Trucks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTrucks.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-amber-400 transition"
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-base font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  {t.licensePlate}
                </span>
                <h4 className="font-semibold text-xs text-slate-800 mt-2">{t.brandModel}</h4>
                <p className="text-[11px] text-slate-500">{t.carrier?.name || 'Transporteur'}</p>
              </div>
              <div>{getTruckStatusBadge(t.operationalStatus)}</div>
            </div>

            {/* Specs Specs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Type</span>
                <span className="font-semibold text-slate-800">{getTruckTypeLabel(t.truckType)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Charge utile</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {t.maxTonnage} T / {t.usableVolume} m³
                </span>
              </div>
            </div>

            {/* Position & Availability */}
            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex items-center justify-between">
                <span>Localisation actuelle :</span>
                <strong className="text-slate-900">{t.currentLocationName || t.currentWilaya}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Chauffeur attitré :</span>
                <span className="font-medium text-slate-800">{t.defaultDriver?.name || 'Non assigné'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Dernière télémétrie :</span>
                <span className="text-[11px] font-mono text-slate-500">
                  {formatDateTimeFR(t.lastPositionTime) || 'Aucune'}
                </span>
              </div>
            </div>

            {/* Legal Documents and Expiration */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Contrôle Tech. :
                </span>
                <span className="font-mono text-slate-700">{t.technicalControlExpiry || 'Valide'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FileCheck className="w-3 h-3 text-blue-600" /> Assurance Flotte :
                </span>
                <span className="font-mono text-slate-700">{t.insuranceExpiry || 'Valide'}</span>
              </div>
            </div>

            {/* Actions for Carrier */}
            {canAdd && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Changer Statut :</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'DISPONIBLE')}
                    title="Déclarer disponible"
                    className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200"
                  >
                    Dispo
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'EN_MAINTENANCE')}
                    title="Mettre en maintenance"
                    className="px-2 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200"
                  >
                    Maintenance
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'INDISPONIBLE')}
                    title="Déclarer indisponible"
                    className="px-2 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded border border-slate-200"
                  >
                    Indispo
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredTrucks.length === 0 && (
          <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            Aucun camion ne correspond aux critères de recherche.
          </div>
        )}
      </div>

      {/* Modal Add Truck */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Enregistrer un Nouveau Camion</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTruck} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Immatriculation (Algérie)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 01842-118-16"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type de véhicule</label>
                  <select
                    value={truckType}
                    onChange={(e) => setTruckType(e.target.value as TruckType)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="PLATEAU">Plateau Ouvert</option>
                    <option value="FOURGON">Fourgon Fermé</option>
                    <option value="FRIGORIFIQUE">Frigorifique</option>
                    <option value="BENNE">Benne TP</option>
                    <option value="CITERNE">Citerne</option>
                    <option value="PORTE_CHAR">Porte-Char</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Marque et Modèle</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Renault Trucks T520 4x2"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Charge Max (Tonnes)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={maxTonnage}
                    onChange={(e) => setMaxTonnage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Volume Utile (m³)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={usableVolume}
                    onChange={(e) => setUsableVolume(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Wilaya actuelle</label>
                  <select
                    value={currentWilaya}
                    onChange={(e) => setCurrentWilaya(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {ALGERIA_WILAYAS.map((w) => (
                      <option key={w.code} value={w.name}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chauffeur habituel</label>
                  <select
                    value={defaultDriverId}
                    onChange={(e) => setDefaultDriverId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">-- Aucun chauffeur attitré --</option>
                    {driversList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.driverLicenseCategory || 'PL'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiration Contrôle Tech.
                  </label>
                  <input
                    type="text"
                    placeholder="JJ/MM/AAAA"
                    value={technicalControlExpiry}
                    onChange={(e) => setTechnicalControlExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiration Assurance
                  </label>
                  <input
                    type="text"
                    placeholder="JJ/MM/AAAA"
                    value={insuranceExpiry}
                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer le Camion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
