import React, { useState, useEffect } from 'react';
import { TransportRequest, User } from '../types/index.ts';
import { getRequestStatusBadge } from '../lib/status-helpers.tsx';
import { formatDateTimeFR } from '../lib/date-utils.ts';
import { ALGERIA_WILAYAS } from '../lib/algeria-data.ts';
import { MissionDetailModal } from './MissionDetailModal.tsx';
import { NewRequestModal } from './NewRequestModal.tsx';
import {
  Truck,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Eye,
  Calendar,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface TransportRequestsViewProps {
  currentUser: User | null;
}

export const TransportRequestsView: React.FC<TransportRequestsViewProps> = ({ currentUser }) => {
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [wilayaFilter, setWilayaFilter] = useState<string>('ALL');

  // Modals
  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  const fetchRequests = () => {
    setLoading(true);
    fetch('/api/transport-requests')
      .then((r) => r.json())
      .then((data: TransportRequest[]) => setRequests(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  const filtered = requests.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      r.requestRef.toLowerCase().includes(term) ||
      r.goodsType.toLowerCase().includes(term) ||
      (r.clientCompany?.name || '').toLowerCase().includes(term) ||
      (r.carrierCompany?.name || '').toLowerCase().includes(term) ||
      (r.assignedTruck?.licensePlate || '').toLowerCase().includes(term) ||
      (r.assignedDriver?.name || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesWilaya =
      wilayaFilter === 'ALL' || r.pickupWilaya === wilayaFilter || r.deliveryWilaya === wilayaFilter;

    return matchesSearch && matchesStatus && matchesWilaya;
  });

  const canCreate = currentUser?.role === 'CLIENT' || currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Demandes de Transport & Réservations</h2>
          <p className="text-xs text-slate-500">
            Suivi des flux logistiques, planification des chargements et affectations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRequests}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 shadow-xs"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canCreate && (
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Créer une Demande de Transport
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher par référence (ex: TR-2026), marchandise, client, transporteur..."
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
            <option value="ALL">Tous les statuts ({requests.length})</option>
            <option value="DEMANDE_SOUMISE">Demande Soumise</option>
            <option value="CONFIRMEE">Confirmée</option>
            <option value="AFFECTEE">Camion & Chauffeur affectés</option>
            <option value="ARRIVE_QUAI">Arrivé au Quai</option>
            <option value="CHARGEMENT_EN_COURS">Chargement en cours</option>
            <option value="BL_VALIDE">BL Scanné</option>
            <option value="EN_TRANSIT">En Transit (Route)</option>
            <option value="LIVRE">Livré (POD validé)</option>
            <option value="CLOTUREE">Clôturée</option>
            <option value="REFUSEE">Refusée</option>
          </select>

          <select
            value={wilayaFilter}
            onChange={(e) => setWilayaFilter(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white"
          >
            <option value="ALL">Toutes les wilayas</option>
            {ALGERIA_WILAYAS.map((w) => (
              <option key={w.code} value={w.name}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Référence</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Client Expéditeur</th>
                <th className="py-3 px-4">Transporteur</th>
                <th className="py-3 px-4">Itinéraire</th>
                <th className="py-3 px-4">Marchandise / Charge</th>
                <th className="py-3 px-4">Ressources</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedMissionId(r.id)}
                  className="hover:bg-slate-50/80 transition cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900">{r.requestRef}</span>
                    <span className="block text-[10px] text-slate-400">
                      {formatDateTimeFR(r.createdAt)}
                    </span>
                  </td>
                  <td className="py-3 px-4">{getRequestStatusBadge(r.status)}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{r.clientCompany?.name || 'Client'}</span>
                    <span className="block text-[11px] text-slate-500">{r.clientCompany?.wilaya}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">
                      {r.carrierCompany?.name || 'Non attribué'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <span>{r.pickupWilaya}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{r.deliveryWilaya}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {formatDateTimeFR(r.pickupDateTime)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900 block truncate max-w-[150px]">
                      {r.goodsType}
                    </span>
                    <span className="text-[11px] font-mono text-slate-600">
                      {r.totalWeightTons} T • {r.quantity} {r.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {r.assignedTruck ? (
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          {r.assignedTruck.licensePlate}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {r.assignedDriver?.name || 'Chauffeur non assigné'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-amber-600 text-[11px] italic">En attente</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMissionId(r.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
                      title="Consulter"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                    Aucune mission ou demande ne correspond aux critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedMissionId && (
        <MissionDetailModal
          missionId={selectedMissionId}
          currentUser={currentUser}
          onClose={() => setSelectedMissionId(null)}
          onUpdate={fetchRequests}
        />
      )}

      {showNewModal && (
        <NewRequestModal
          userCompanyId={currentUser?.companyId || null}
          onClose={() => setShowNewModal(false)}
          onSuccess={fetchRequests}
        />
      )}
    </div>
  );
};
