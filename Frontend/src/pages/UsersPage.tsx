import { useEffect, useMemo, useState } from 'react';
import userService from '../services/userService';
import { UserRow, UsersPageResponse } from '../types';

const RoleBadge = ({ role }: { role: string }) => {
  const colors: Record<string, string> = {
    admin: 'bg-[#1a2744] text-white',
    medecin: 'bg-green-100 text-green-800',
    juriste: 'bg-blue-100 text-blue-800',
    lecteur: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[role] || 'bg-gray-100 text-gray-700'}`}>
      {role}
    </span>
  );
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ nom: '', email: '', password: '', role: 'lecteur' });

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response: UsersPageResponse = await userService.listUsers(page, 50, search);
      setUsers(response.users);
      setPages(response.pages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page]);

  const filteredUsers = useMemo(() => users, [users]);

  const handleSearch = async (value: string) => {
    setSearch(value);
    setPage(1);
    try {
      const response: UsersPageResponse = await userService.listUsers(1, 50, value);
      setUsers(response.users);
      setPages(response.pages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la recherche');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.nom || !newUser.email || !newUser.password) {
      setError('Veuillez renseigner tous les champs pour créer un utilisateur');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await userService.createUser(newUser);
      setSuccess('Utilisateur créé avec succès');
      setNewUser({ nom: '', email: '', password: '', role: 'lecteur' });
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de créer l\'utilisateur');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (userId: string) => {
    setError('');
    try {
      await userService.toggleUser(userId);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de basculer l\'état');
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setError('');
    try {
      await userService.updateUserRole(userId, role);
      await loadUsers();
      setSuccess('Rôle mis à jour');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de mettre à jour le rôle');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Supprimer cet utilisateur ? Cette opération est irréversible.')) return;
    setError('');
    try {
      await userService.deleteUser(userId);
      await loadUsers();
      setSuccess('Utilisateur supprimé');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de supprimer l\'utilisateur');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-[#1a2744] rounded-2xl p-8 mb-6 text-white shadow-lg overflow-hidden">
        <h2 className="text-2xl font-bold mb-2">Gestion des utilisateurs</h2>
        <p className="text-gray-200 max-w-2xl">
          Créez, éditez et activez/désactivez vos comptes depuis un tableau de bord unique, au design cohérent avec le reste de l'application.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Liste des utilisateurs</h3>
              <p className="text-sm text-gray-500">Recherche, pagination et actions rapides.</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#00c9a7]/10 text-[#006a51] font-semibold">Admin only</span>
          </div>

          <div className="flex flex-col gap-3 mb-4">
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher par nom ou email"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-[#00c9a7] focus:outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Rôle</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Créé le</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Chargement...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Aucun utilisateur trouvé.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">{user.nom}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <RoleBadge role={user.role} />
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#00c9a7] focus:outline-none"
                        >
                          <option value="admin">admin</option>
                          <option value="medecin">medecin</option>
                          <option value="juriste">juriste</option>
                          <option value="lecteur">lecteur</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${user.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                          {user.actif ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggle(user._id)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {user.actif ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <span>Page {page} sur {pages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, pages))}
                disabled={page >= pages}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>

        <aside className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Créer un nouvel utilisateur</h3>
            <p className="text-sm text-gray-500">Ajoutez un compte avec rôle et mot de passe sécurisé.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Nom
              <input
                value={newUser.nom}
                onChange={(e) => setNewUser((prev) => ({ ...prev, nom: e.target.value }))}
                placeholder="Nom complet"
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-[#00c9a7] focus:outline-none"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Email
              <input
                value={newUser.email}
                onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-[#00c9a7] focus:outline-none"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Mot de passe
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Mot de passe sécurisé"
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-[#00c9a7] focus:outline-none"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Rôle
              <select
                value={newUser.role}
                onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-[#00c9a7] focus:outline-none"
              >
                <option value="lecteur">lecteur</option>
                <option value="medecin">medecin</option>
                <option value="juriste">juriste</option>
                <option value="admin">admin</option>
              </select>
            </label>
          </div>

          <button
            onClick={handleCreateUser}
            disabled={creating}
            className="mt-6 w-full rounded-2xl bg-[#00c9a7] px-4 py-3 text-sm font-semibold text-white hover:bg-[#00b396] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Création en cours...' : 'Créer un utilisateur'}
          </button>
        </aside>
      </div>
    </div>
  );
}
