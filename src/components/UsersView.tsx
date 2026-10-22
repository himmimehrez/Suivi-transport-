import React, { useState, useEffect } from 'react';
import { User, Company, UserRole } from '../types/index.ts';
import { formatDateTimeFR } from '../lib/date-utils.ts';
import { Users, Plus, Search, ShieldCheck, Truck, Building, Phone, Mail, X } from 'lucide-react';

interface UsersViewProps {
  currentUser: User | null;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [companiesList, setCompaniesList] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRole>('DRIVER');
  const [companyId, setCompanyId] = useState<string>('');
  const [phone, setPhone] = useState<string>('+213 ');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState<string>('DZ-');
  const [driverLicenseCategory, setDriverLicenseCategory] = useState<string>('Poids Lourd C, E');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchUsers = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/companies').then((r) => r.json()),
    ])
      .then(([usersData, companiesData]) => {
        setUsersList(usersData);
        setCompaniesList(companiesData);
        if (companiesData.length > 0) setCompanyId(String(companiesData[0].id));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          companyId: role === 'ADMIN' ? null : companyId,
          phone,
          driverLicenseNumber: role === 'DRIVER' ? driverLicenseNumber : null,
          driverLicenseCategory: role === 'DRIVER' ? driverLicenseCategory : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur création utilisateur');
      }

      setShowAddModal(false);
      setName('');
      setEmail('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestion des Utilisateurs & Chauffeurs</h2>
          <p className="text-xs text-slate-500">
            Comptes d’accès, rattachement aux entreprises partenaires, rôles et habilitations
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Créer un Utilisateur
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou entreprise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white"
        >
          <option value="ALL">Tous les rôles ({usersList.length})</option>
          <option value="ADMIN">Administrateurs</option>
          <option value="CLIENT">Clients Expéditeurs</option>
          <option value="CARRIER">Fournisseurs Transporteurs</option>
          <option value="DRIVER">Chauffeurs Routiers</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4">Entreprise</th>
                <th className="py-3 px-4">Téléphone</th>
                <th className="py-3 px-4">Permis / Habilitation</th>
                <th className="py-3 px-4">Statut</th>
                {isAdmin && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{u.name}</span>
                    <span className="text-[11px] text-slate-500">{u.email}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'CLIENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.role === 'CARRIER'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {u.company ? u.company.name : 'Direction TransLog'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{u.phone || '-'}</td>
                  <td className="py-3 px-4">
                    {u.driverLicenseNumber ? (
                      <div>
                        <span className="font-mono text-slate-900 font-semibold">
                          {u.driverLicenseNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {u.driverLicenseCategory}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded transition ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspendre' : 'Activer'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Ajouter un Utilisateur / Chauffeur</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  placeholder="Nom & Prénom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email professionnel</label>
                <input
                  type="email"
                  required
                  placeholder="nom@domaine.dz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rôle</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="DRIVER">Chauffeur Routier</option>
                    <option value="CARRIER">Fournisseur Transporteur</option>
                    <option value="CLIENT">Client Expéditeur</option>
                    <option value="ADMIN">Administrateur Général</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Entreprise de rattachement</label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {companiesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Téléphone portable</label>
                <input
                  type="text"
                  placeholder="+213 550..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              {role === 'DRIVER' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                  <span className="font-bold text-amber-900 block">Détails du Permis de Conduire</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-700 mb-1">N° de Permis</label>
                      <input
                        type="text"
                        value={driverLicenseNumber}
                        onChange={(e) => setDriverLicenseNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-700 mb-1">Catégorie</label>
                      <input
                        type="text"
                        value={driverLicenseCategory}
                        onChange={(e) => setDriverLicenseCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  {submitting ? 'Création...' : 'Créer l’Utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
