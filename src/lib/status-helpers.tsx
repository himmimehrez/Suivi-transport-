import React from 'react';
import { TruckStatus, RequestStatus } from '../types/index.ts';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Truck,
  PackageCheck,
  FileCheck,
  XCircle,
  Warehouse,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export function getTruckStatusBadge(status: TruckStatus) {
  switch (status) {
    case 'DISPONIBLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Disponible
        </span>
      );
    case 'RESERVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3.5 h-3.5" />
          Réservé
        </span>
      );
    case 'EN_ATTENTE_CHARGEMENT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Warehouse className="w-3.5 h-3.5" />
          Attente Quai
        </span>
      );
    case 'EN_COURS_CHARGEMENT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          <PackageCheck className="w-3.5 h-3.5" />
          En Chargement
        </span>
      );
    case 'EN_TRANSIT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Truck className="w-3.5 h-3.5" />
          En Transit (Route)
        </span>
      );
    case 'EN_LIVRAISON':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <ArrowRight className="w-3.5 h-3.5" />
          En Livraison
        </span>
      );
    case 'EN_RETOUR':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          En Retour
        </span>
      );
    case 'EN_MAINTENANCE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          En Maintenance
        </span>
      );
    case 'INDISPONIBLE':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
          Indisponible
        </span>
      );
  }
}

export function getRequestStatusBadge(status: RequestStatus) {
  switch (status) {
    case 'BROUILLON':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          Brouillon
        </span>
      );
    case 'DEMANDE_SOUMISE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3 h-3" />
          Demande Soumise
        </span>
      );
    case 'EN_ATTENTE_CONFIRMATION':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          En attente transporteur
        </span>
      );
    case 'REFUSEE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3" />
          Refusée
        </span>
      );
    case 'CONFIRMEE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
          <CheckCircle2 className="w-3 h-3" />
          Confirmée
        </span>
      );
    case 'AFFECTEE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
          <Truck className="w-3 h-3" />
          Camion & Chauffeur affectés
        </span>
      );
    case 'EN_ROUTE_CHARGEMENT':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          Vers site chargement
        </span>
      );
    case 'ARRIVE_QUAI':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Warehouse className="w-3 h-3" />
          Arrivé au Quai
        </span>
      );
    case 'CHARGEMENT_EN_COURS':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
          <PackageCheck className="w-3 h-3" />
          Chargement en cours
        </span>
      );
    case 'CHARGEMENT_TERMINE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
          <CheckCircle2 className="w-3 h-3" />
          Chargement terminé
        </span>
      );
    case 'BL_VALIDE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <FileCheck className="w-3 h-3" />
          BL scanné & validé
        </span>
      );
    case 'EN_TRANSIT':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-300">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
          Transport en cours (Route)
        </span>
      );
    case 'ARRIVE_DESTINATION':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          Arrivé à destination
        </span>
      );
    case 'LIVRAISON_EN_COURS':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
          Déchargement / Livraison
        </span>
      );
    case 'LIVRE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Livré (Preuve POD validée)
        </span>
      );
    case 'CLOTUREE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300">
          Clôturée
        </span>
      );
    case 'ANNULEE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 line-through">
          Annulée
        </span>
      );
    default:
      return <span className="text-xs text-slate-600">{status}</span>;
  }
}

export function getTruckTypeLabel(type: string): string {
  switch (type) {
    case 'PLATEAU':
      return 'Plateau Ouvert / Ridelles';
    case 'FOURGON':
      return 'Fourgon Fermé / Tautliner';
    case 'FRIGORIFIQUE':
      return 'Frigorifique Température Dirigée';
    case 'BENNE':
      return 'Benne TP / Vrac';
    case 'CITERNE':
      return 'Citerne Liquide / Alimentaire';
    case 'PORTE_CHAR':
      return 'Porte-Char Engins Lourds';
    default:
      return type;
  }
}
