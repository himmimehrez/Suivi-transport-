import React, { useState, useEffect } from 'react';
import { Truck, TransportRequest, User } from '../types/index.ts';
import { formatDateTimeFR, formatDateFR } from '../lib/date-utils.ts';
import { getTruckStatusBadge, getTruckTypeLabel } from '../lib/status-helpers.tsx';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Truck as TruckIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface AvailabilityPlanningViewProps {
  currentUser: User | null;
}

export const AvailabilityPlanningView: React.FC<AvailabilityPlanningViewProps> = ({ currentUser }) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Generate 7 consecutive days starting from today
  const [startDate, setStartDate] = useState<Date>(new Date());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    setLoading(true);
    let truckUrl = '/api/trucks';
    if (currentUser?.role === 'CARRIER' && currentUser.companyId) {
      truckUrl += `?carrierId=${currentUser.companyId}`;
    }

    Promise.all([
      fetch(truckUrl).then((r) => r.json()),
      fetch('/api/transport-requests').then((r) => r.json()),
    ])
      .then(([trucksData, reqsData]) => {
        setTrucks(trucksData);
        setRequests(reqsData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const shiftDays = (delta: number) => {
    const next = new Date(startDate);
    next.setDate(next.getDate() + delta);
    setStartDate(next);
  };

  const isTruckBookedOnDay = (truckId: number, day: Date) => {
    const dayStart = day.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    return requests.filter((r) => {
      if (r.assignedTruckId !== truckId) return false;
      if (['REFUSEE', 'ANNULEE'].includes(r.status)) return false;

      const pStart = new Date(r.pickupDateTime).getTime();
      const dEnd = new Date(r.deliveryDateTime).getTime();

      // Check overlap
      return pStart <= dayEnd && dEnd >= dayStart;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Planning & Disponibilités de la Flotte</h2>
          <p className="text-xs text-slate-500">
            Calendrier interactif des engagements camions, prévention des chevauchements et suivi des créneaux
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={() => shiftDays(-7)}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            title="Semaine précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-800">
            {formatDateFR(days[0])} — {formatDateFR(days[6])}
          </span>
          <button
            onClick={() => shiftDays(7)}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            title="Semaine suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setStartDate(new Date())}
            className="ml-2 px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg"
          >
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* Calendar Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th className="py-3 px-4 w-72 font-semibold">Camion / Spécifications</th>
                {days.map((d, i) => {
                  const isToday =
                    d.toDateString() === new Date().toDateString();
                  return (
                    <th
                      key={i}
                      className={`py-3 px-2 text-center font-semibold border-l border-slate-800 min-w-[120px] ${
                        isToday ? 'bg-amber-500/20 text-amber-300' : ''
                      }`}
                    >
                      <span className="block text-[11px] uppercase tracking-wider text-slate-400">
                        {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-bold text-white">{formatDateFR(d)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trucks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 border-r border-slate-100 bg-slate-50/30">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 text-xs">{t.licensePlate}</span>
                      {getTruckStatusBadge(t.operationalStatus)}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{t.brandModel}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span>{getTruckTypeLabel(t.truckType)}</span>
                      <span>•</span>
                      <span>{t.maxTonnage}T</span>
                    </div>
                  </td>

                  {days.map((day, dayIndex) => {
                    const missionsOnDay = isTruckBookedOnDay(t.id, day);
                    const isMaintenance = t.operationalStatus === 'EN_MAINTENANCE';

                    return (
                      <td
                        key={dayIndex}
                        className="py-2 px-2 border-l border-slate-100 align-top text-center"
                      >
                        {isMaintenance ? (
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold">
                            Maintenance
                          </div>
                        ) : missionsOnDay.length > 0 ? (
                          <div className="space-y-1">
                            {missionsOnDay.map((m) => (
                              <div
                                key={m.id}
                                className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px] text-left shadow-2xs"
                              >
                                <span className="font-mono font-bold block">{m.requestRef}</span>
                                <span className="truncate block text-indigo-700 font-medium">
                                  {m.pickupWilaya} ➔ {m.deliveryWilaya}
                                </span>
                                <span className="text-[9px] text-indigo-500 block">
                                  {m.status} ({m.totalWeightTons}T)
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-emerald-50/40 border border-dashed border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                            Disponible
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {trucks.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    Aucun camion enregistré dans la flotte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
