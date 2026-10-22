import React, { useState, useEffect } from 'react';
import { Company, User } from '../types/index.ts';
import { formatDateTimeFR } from '../lib/date-utils.ts';
import { ALGERIA_WILAYAS } from '../lib/algeria-data.ts';
import { Building, Plus, Search, CheckCircle2, XCircle, Phone, Mail, MapPin, X } from 'lucide-react';

interface CompaniesViewProps {
  currentUser: User | null;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({ currentUser }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<'CLIENT' | 'CARRIER'>('CLIENT');
  const [code, setCode] = useState<string>('');
  const [nif, setNif] = useState<string>('');
  const [rc, setRc] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [wilaya, setWilaya] = useState<string>('Alger');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchCompanies = () => {
    setLoading(true);
    fetch('/api/companies')
      .then((r) => r.json())
      .then((data: Company[]) => setCompanies(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchCompanies();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const generatedCode = code || `${type.substring(0, 3)}-${Date.now().toString().slice(-4)}`;
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          code: generatedCode,
          nif,
          rc,
          address,
          wilaya,
          phone,
          email,
          contactPerson,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur création entreprise');
      }

      setShowAddModal(false);
      setName('');
      fetchCompanies();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.wilaya.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestion des Entreprises Partenaires</h2>
          <p className="text-xs text-slate-500">
            Clients expéditeurs, transporteurs de fret, statuts fiscaux (NIF/RC) et agréments
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Créer un Compte Entreprise
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, code entreprise ou wilaya..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs outline-none bg-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-slate-300 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {c.code}
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">{c.name}</h3>
                <span
                  className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    c.type === 'CARRIER'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : c.type === 'CLIENT'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  {c.type === 'CARRIER' ? 'Transporteur / Flotte' : c.type === 'CLIENT' ? 'Client Expéditeur' : 'Administration'}
                </span>
              </div>

              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {c.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {c.address}, <strong>{c.wilaya}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono">{c.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{c.email}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Responsable : <strong>{c.contactPerson}</strong>
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-500 flex justify-between">
              <span>NIF: {c.nif || 'Non renseigné'}</span>
              <span>RC: {c.rc || 'Non renseigné'}</span>
            </div>

            {isAdmin && c.type !== 'ADMIN' && (
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleToggleStatus(c.id, c.status)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    c.status === 'ACTIVE'
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {c.status === 'ACTIVE' ? 'Suspendre' : 'Activer'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Ajouter une Entreprise Partenaire</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCompany} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Raison Sociale</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: SARL Fret National"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Typologie</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="CLIENT">Client Expéditeur</option>
                    <option value="CARRIER">Fournisseur Transporteur</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wilaya du Siège</label>
                  <select
                    value={wilaya}
                    onChange={(e) => setWilaya(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {ALGERIA_WILAYAS.map((w) => (
                      <option key={w.code} value={w.name}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adresse complète</label>
                <input
                  type="text"
                  required
                  placeholder="Zone Industrielle, Rue..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Numéro Téléphone</label>
                  <input
                    type="text"
                    required
                    placeholder="+213..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email professionnel</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@entreprise.dz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIF (Fiscal)</label>
                  <input
                    type="text"
                    placeholder="000..."
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registre de Commerce (RC)</label>
                  <input
                    type="text"
                    placeholder="16/00-..."
                    value={rc}
                    onChange={(e) => setRc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom du Contact Principal</label>
                <input
                  type="text"
                  required
                  placeholder="Nom & Prénom"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  {submitting ? 'Création...' : 'Créer l’Entreprise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
