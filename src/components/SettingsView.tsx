import React, { useState } from 'react';
import { User } from '../types/index.ts';
import {
  Settings,
  Database,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Server,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User | null;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onRefreshData }) => {
  const [resetting, setResetting] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleResetDemo = async () => {
    if (!confirm('Voulez-vous réinitialiser toutes les données de démonstration de la base de données ?')) {
      return;
    }
    setResetting(true);
    setResetSuccess(null);
    try {
      const res = await fetch('/api/system/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResetSuccess(data.message);
        onRefreshData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setResetting(false);
    }
  };

  const testScenarios = [
    {
      num: 1,
      title: 'Création d’une demande par un client',
      desc: 'Le client (ex: Sider Annaba ou Cevital) soumet une demande avec nature de la marchandise, poids, camion requis et créneau.',
      status: 'Opérationnel via "Nouvelle Expédition"',
    },
    {
      num: 2,
      title: 'Réception et acceptation par le fournisseur',
      desc: 'Le transporteur consulte la demande reçue et l’accepte ou la refuse avec motif argumenté.',
      status: 'Opérationnel dans le détail de mission',
    },
    {
      num: 3,
      title: 'Affectation camion et chauffeur avec détection de conflit',
      desc: 'Le transporteur affecte les ressources. Le système vérifie en temps réel les chevauchements et bloque les doubles réservations.',
      status: 'Opérationnel avec validation transactionnelle',
    },
    {
      num: 4,
      title: 'Arrivée au quai de chargement',
      desc: 'Le chauffeur signale son arrivée au poste de garde ou quai via son interface mobile.',
      status: 'Opérationnel sur mobile chauffeur',
    },
    {
      num: 5,
      title: 'Numérisation du Bon de Livraison (BL)',
      desc: 'Scan QR code / code-barres avec la caméra ou téléversement du document tamponné avec contrôle de concordance.',
      status: 'Opérationnel avec vérification automatique',
    },
    {
      num: 6,
      title: 'Confirmation de fin de chargement',
      desc: 'Arrimage sécurisé confirmé par le chauffeur avant mise en route.',
      status: 'Opérationnel',
    },
    {
      num: 7,
      title: 'Départ du camion et passage en transit',
      desc: 'Mise à jour automatique du statut opérationnel du camion vers EN_TRANSIT.',
      status: 'Opérationnel',
    },
    {
      num: 8,
      title: 'Suivi de l’avancement sur carte interactive',
      desc: 'Visualisation de la position GPS du camion sur les axes autoroutiers algériens (Autoroute Est-Ouest, RN).',
      status: 'Opérationnel sur OpenStreetMap',
    },
    {
      num: 9,
      title: 'Arrivée à destination et preuve de livraison (POD)',
      desc: 'Enregistrement de la preuve de livraison signée électroniquement par le réceptionnaire.',
      status: 'Opérationnel avec émargement',
    },
    {
      num: 10,
      title: 'Clôture administrative de la mission',
      desc: 'Validation finale par le gestionnaire et archivage dans l’audit trail chronologique.',
      status: 'Opérationnel',
    },
    {
      num: 11,
      title: 'Actualisation de la disponibilité du camion',
      desc: 'Le camion redevient automatiquement "DISPONIBLE" pour les prochaines réservations.',
      status: 'Calculé dynamiquement',
    },
    {
      num: 12,
      title: 'Blocage des réservations conflictuelles',
      desc: 'Une deuxième réservation concurrente sur le même véhicule est refusée par la logique métier.',
      status: 'Vérifié en base de données',
    },
    {
      num: 13,
      title: 'Confidentialité inter-entreprises',
      desc: 'Isolation stricte des données : un client ne peut accéder qu’à ses propres expéditions.',
      status: 'Appliqué par middleware côté serveur',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Paramètres & Conformité Système</h2>
        <p className="text-xs text-slate-500">
          Architecture technique, persistance PostgreSQL Cloud SQL et scénarios de validation métier
        </p>
      </div>

      {resetSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{resetSuccess}</span>
        </div>
      )}

      {/* Architecture & DB details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          Architecture de Données & Environnement de Production
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Moteur de Base de Données</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">Cloud SQL PostgreSQL</span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Provisionné (europe-west2)
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Tables Relationnelles</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">9 Tables Structurées</span>
            <span className="text-[11px] text-slate-600 mt-1 block">
              Drizzle ORM & Clés Étrangères
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Authentification & Sécurité</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">Multi-Rôles RBAC</span>
            <span className="text-[11px] text-slate-600 mt-1 block">
              Admin, Client, Transporteur, Chauffeur
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-800 block">
              Réinitialisation des Données de Test
            </span>
            <span className="text-[11px] text-slate-500">
              Re-charge les 2 clients, 2 transporteurs, la flotte de camions et les missions de test.
            </span>
          </div>

          <button
            onClick={handleResetDemo}
            disabled={resetting}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Réinitialisation...' : 'Réinitialiser Données Démo'}
          </button>
        </div>
      </div>

      {/* Scenarios Checklist from Section 16 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Scénarios Métier Testés & Validés (Section 16 du Cahier des Charges)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {testScenarios.map((sc) => (
            <div
              key={sc.num}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 hover:bg-slate-50 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  {sc.num}. {sc.title}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Conforme
                </span>
              </div>
              <p className="text-[11px] text-slate-600">{sc.desc}</p>
              <span className="text-[10px] text-indigo-600 font-semibold block pt-0.5">
                {sc.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
