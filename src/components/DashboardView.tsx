import React, { useState, useEffect } from 'react';
import { DashboardStats, TransportRequest, Truck, User, NotificationItem } from '../types/index.ts';
import { getRequestStatusBadge } from '../lib/status-helpers.tsx';
import { formatDateTimeFR } from '../lib/date-utils.ts';
import { TrackingMap } from './TrackingMap.tsx';
import { MissionDetailModal } from './MissionDetailModal.tsx';
import { NewRequestModal } from './NewRequestModal.tsx';
import {
  Clock,
  CheckCircle2,
  PackageCheck,
  Truck as TruckIcon,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  Bell,
  Plus,
  RefreshCw,
  Building,
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: User | null;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, onNavigateTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<TransportRequest[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/dashboard/stats').then((r) => r.json()),
      fetch('/api/transport-requests').then((r) => r.json()),
      fetch('/api/trucks').then((r) => r.json()),
      fetch('/api/notifications').then((r) => r.json()),
    ])
      .then(([statsData, reqsData, trucksData, notifsData]) => {
        setStats(statsData);
        setRecentRequests(reqsData.slice(0, 5));
        setTrucks(trucksData);
        setNotifications(notifsData.slice(0, 5));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const role = currentUser?.role || 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Tableau de Bord Logistique • Algérie
          </span>
          <h2 className="text-xl font-bold mt-1">
            Bienvenue, {currentUser?.name || 'Administrateur'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {currentUser?.company ? `${currentUser.company.name} (${currentUser.company.wilaya})` : 'TransLog Algérie'} • Rôle :{' '}
            <span className="font-bold text-amber-300">{role}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Actualiser les données"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {(role === 'CLIENT' || role === 'ADMIN') && (
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Expédition
            </button>
          )}

          {role === 'CARRIER' && (
            <button
              onClick={() => onNavigateTab('trucks')}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <TruckIcon className="w-4 h-4" />
              Gérer la Flotte
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>En Attente</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {stats?.pendingRequests ?? 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Demandes à traiter</span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Confirmées</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {stats?.confirmedBookings ?? 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Réservations validées</span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Chargement</span>
            <PackageCheck className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {stats?.loadingMissions ?? 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Aux quais de départ</span>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>En Transit</span>
            <TruckIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-indigo-600 mt-2">
            {stats?.inTransitMissions ?? 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Sur le réseau routier</span>
        </div>

        {/* Metric 5 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Livrées</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-2">
            {stats?.deliveredMissions ?? 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Avec preuve signée</span>
        </div>

        {/* Metric 6 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Incidents</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600 mt-2">
            {stats?.activeIncidentsCount ?? 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Retards / alertes actifs</span>
        </div>
      </div>

      {/* Fleet Breakdown for Carriers & Admin */}
      {(role === 'CARRIER' || role === 'ADMIN') && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-amber-500" />
              État Opérationnel de la Flotte ({stats?.totalTrucks ?? 0} camions)
            </h3>
            <button
              onClick={() => onNavigateTab('availability')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Voir planning complet →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
              <span className="text-emerald-700 font-semibold block">Disponibles</span>
              <span className="text-xl font-bold text-emerald-800 font-mono">
                {stats?.availableTrucks ?? 0}
              </span>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs">
              <span className="text-blue-700 font-semibold block">Réservés</span>
              <span className="text-xl font-bold text-blue-800 font-mono">
                {stats?.reservedTrucks ?? 0}
              </span>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-xs">
              <span className="text-indigo-700 font-semibold block">En Transit / Mission</span>
              <span className="text-xl font-bold text-indigo-800 font-mono">
                {stats?.transitTrucks ?? 0}
              </span>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs">
              <span className="text-rose-700 font-semibold block">Maintenance / Indispo</span>
              <span className="text-xl font-bold text-rose-800 font-mono">
                {stats?.maintenanceTrucks ?? 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Map of Algeria with Active Transports */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Carte des Opérations & Suivi Routier en Direct (Algérie)
          </h3>
          <button
            onClick={() => onNavigateTab('map')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            Plein écran cartographique →
          </button>
        </div>
        <TrackingMap trucks={trucks} heightClass="h-[380px]" />
      </div>

      {/* Two columns: Recent Missions + Notifications Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent transport requests */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Dernières Expéditions & Ordres de Transport
            </h3>
            <button
              onClick={() => onNavigateTab('requests')}
              className="text-xs text-amber-600 hover:text-amber-700 font-bold"
            >
              Voir tout ({recentRequests.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentRequests.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedMissionId(r.id)}
                className="p-4 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{r.requestRef}</span>
                    {getRequestStatusBadge(r.status)}
                  </div>
                  <p className="text-slate-600 font-medium">
                    {r.goodsType} ({r.totalWeightTons} T)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {r.pickupWilaya} ➔ {r.deliveryWilaya} • Expédié par {r.clientCompany?.name}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">
                    {formatDateTimeFR(r.pickupDateTime)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {r.assignedTruck ? r.assignedTruck.licensePlate : 'Sans camion'}
                  </span>
                </div>
              </div>
            ))}

            {recentRequests.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aucune demande d'expédition pour le moment.
              </div>
            )}
          </div>
        </div>

        {/* Right: Notifications Feed */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-500" />
              Notifications Récentes
            </h3>
            <button
              onClick={() => onNavigateTab('notifications')}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Toutes
            </button>
          </div>

          <div className="p-4 space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{n.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDateTimeFR(n.createdAt)}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">{n.message}</p>
              </div>
            ))}

            {notifications.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Aucune nouvelle alerte.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedMissionId && (
        <MissionDetailModal
          missionId={selectedMissionId}
          currentUser={currentUser}
          onClose={() => setSelectedMissionId(null)}
          onUpdate={fetchDashboardData}
        />
      )}

      {showNewModal && (
        <NewRequestModal
          userCompanyId={currentUser?.companyId || null}
          onClose={() => setShowNewModal(false)}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
};
