import React, { useState } from 'react';
import { TransportRequest } from '../types/index.ts';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ReportIncidentModalProps {
  mission: TransportRequest;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({
  mission,
  onClose,
  onSuccess,
}) => {
  const [incidentType, setIncidentType] = useState<string>('RETARD_LIVRAISON');
  const [severity, setSeverity] = useState<'FAIBLE' | 'MOYENNE' | 'CRITIQUE'>('MOYENNE');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Veuillez décrire la situation et les impacts constatés.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      // Grab GPS if available from browser
      let lat: number | undefined = undefined;
      let lng: number | undefined = undefined;

      if (navigator.geolocation) {
        try {
          const pos: any = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // GPS fallback
        }
      }

      const res = await fetch(`/api/transport-requests/${mission.id}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentType,
          severity,
          description: description.trim(),
          lat,
          lng,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors du signalement.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-rose-600 text-white">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-bold text-base">Signaler un Incident ou Retard</h3>
              <p className="text-xs text-rose-100">Mission {mission.requestRef}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-rose-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Type d'aléa / incident
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="RETARD_CHARGEMENT">Retard au site de chargement</option>
              <option value="RETARD_LIVRAISON">Ralentissement / Retard sur la route</option>
              <option value="PANNE_MECANIQUE">Panne mécanique du véhicule</option>
              <option value="ACCIDENT">Accident ou accrochage</option>
              <option value="ANOMALIE_DOCUMENTAIRE">Anomalie sur document / BL manquant</option>
              <option value="LIVRAISON_PARTIELLE">Refus partiel de la marchandise</option>
              <option value="METEO_ROUTE_BLOQUEE">Intempéries ou route barrée</option>
              <option value="AUTRE">Autre incident</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Niveau de gravité
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['FAIBLE', 'MOYENNE', 'CRITIQUE'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSeverity(lvl)}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    severity === lvl
                      ? lvl === 'CRITIQUE'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : lvl === 'MOYENNE'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description détaillée des faits
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Précisez le lieu (ex: Autoroute A1 PK 180), l'estimation du temps perdu, et les actions entreprises..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition"
            >
              {loading ? 'Transmission...' : 'Diffuser l’Alerte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
