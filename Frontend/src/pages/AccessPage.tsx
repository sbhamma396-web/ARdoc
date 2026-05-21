import { useState, useEffect } from 'react';
import { Document, DocumentStatus, DocumentType } from '../types';
import documentService from '../services/documentService';

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ClockConfigIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const SmartphoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,9 12,15 18,9" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface ModalProps {
  document: Document | null;
  onClose: () => void;
}

function DetailModal({ document: doc, onClose }: ModalProps) {
  if (!doc) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Détails du document</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">ID Document</span>
            <span className="text-sm font-semibold text-[#00c9a7]">{doc.id}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Nom</span>
            <span className="text-sm font-semibold text-gray-900">{doc.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Type</span>
            <span className="text-sm text-gray-700">{doc.type}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Statut</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${doc.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {doc.status}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Accès totaux</span>
            <span className="text-sm font-bold text-gray-900">{doc.totalAccess}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-gray-500">Dernier accès</span>
            <span className="text-sm text-gray-700">{doc.lastAccess}</span>
          </div>
        </div>
        <button onClick={onClose} className="mt-5 w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
          Fermer
        </button>
      </div>
    </div>
  );
}

interface NewPolicyModalProps {
  onClose: () => void;
  onSave: (doc: Document) => void;
}

function NewPolicyModal({ onClose, onSave }: NewPolicyModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentType>('Médical');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('Le nom est obligatoire.'); return; }
    const id = `DOC-${Math.floor(1000 + Math.random() * 9000)}`;
    onSave({ id, name, type, status: 'Actif', totalAccess: 0, lastAccess: 'À l\'instant' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Nouvelle politique d'accès</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><XIcon /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom du document</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Rapport confidentiel #1234"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as DocumentType)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white"
            >
              <option>Médical</option>
              <option>Juridique</option>
              <option>Industriel</option>
              <option>Éducation</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">Annuler</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-[#1a2744] text-white rounded-xl font-medium hover:bg-[#243460] transition-colors">Créer</button>
        </div>
      </div>
    </div>
  );
}

interface ConfigModalProps {
  title: string;
  description: string;
  onClose: () => void;
}

function ConfigModal({ title, description, onClose }: ConfigModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><XIcon /></button>
        </div>
        <p className="text-sm text-gray-500 mb-5">{description}</p>
        <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm mb-5">
          Configuration en cours de développement...
        </div>
        <button onClick={onClose} className="w-full py-2.5 bg-[#00c9a7] text-white rounded-xl font-medium hover:bg-[#00b396] transition-colors">
          Fermer
        </button>
      </div>
    </div>
  );
}

export default function AccessPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous les types');
  const [statusFilter, setStatusFilter] = useState('Tous les statuts');
  const [detailDoc, setDetailDoc] = useState<Document | null>(null);
  const [showNewPolicy, setShowNewPolicy] = useState(false);
  const [configModal, setConfigModal] = useState<{ title: string; description: string } | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  const handleRevoke = (id: string) => {
    // Call backend to soft-delete the document (requires admin)
    (async () => {
      try {
        await documentService.deleteDocument(id);
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'Révoqué' as DocumentStatus } : d));
      } catch (err: any) {
        console.error('Failed to revoke document', err);
        setDocsError(err.response?.data?.message || 'Impossible de révoquer le document');
      } finally {
        setRevokeConfirm(null);
      }
    })();
  };

  const loadDocuments = async () => {
    setLoadingDocs(true);
    setDocsError('');
    try {
      const docs = await documentService.listDocuments();
      const mapped: Document[] = docs.map((d: any) => ({
        id: d._id || d.id,
        name: d.nom || d.original_name || 'Sans nom',
        type: 'Médical' as DocumentType,
        status: 'Actif' as DocumentStatus,
        totalAccess: 0,
        lastAccess: d.createdAt ? new Date(d.createdAt).toLocaleString('fr-FR') : ''
      }));
      setDocuments(mapped);
    } catch (err: any) {
      console.error('Error loading documents', err);
      setDocsError(err.response?.data?.message || 'Impossible de charger les documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filtered = documents.filter(doc => {
    const matchSearch = doc.name.toLowerCase().includes(search.toLowerCase()) || doc.id.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'Tous les types' || doc.type === typeFilter;
    const matchStatus = statusFilter === 'Tous les statuts' || doc.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#e8faf6] rounded-xl flex items-center justify-center">
              <UsersIcon />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gestion des accès</h2>
              <p className="text-gray-500 text-sm">Contrôlez et révoquez les accès aux documents protégés</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewPolicy(true)}
            className="px-6 py-3 bg-[#1a2744] text-white rounded-xl font-semibold hover:bg-[#243460] transition-colors shadow-md"
          >
            Nouvelle politique
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un document..."
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white text-gray-700 cursor-pointer"
            >
              <option>Tous les types</option>
              <option>Médical</option>
              <option>Juridique</option>
              <option>Industriel</option>
              <option>Éducation</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ChevronDownIcon />
            </div>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white text-gray-700 cursor-pointer"
            >
              <option>Tous les statuts</option>
              <option>Actif</option>
              <option>Révoqué</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ChevronDownIcon />
            </div>
          </div>
        </div>
      </div>

        {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">ID Document</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Nom</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Type</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Statut</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Accès totaux</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Dernier accès</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">{loadingDocs ? 'Chargement...' : 'Aucun document trouvé'}</td>
              </tr>
            ) : (
              filtered.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-[#00c9a7] font-semibold">{doc.id}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{doc.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{doc.type}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      doc.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{doc.totalAccess}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{doc.lastAccess}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDetailDoc(doc)}
                        className="px-4 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        Détails
                      </button>
                      {doc.status === 'Actif' && (
                        <button
                          onClick={() => setRevokeConfirm(doc.id)}
                          className="px-4 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
                        >
                          Révoquer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {docsError && (
        <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-700">
          {docsError}
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <MapPinIcon />
            </div>
            <h3 className="font-bold text-gray-900">Géofencing</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Limitez l'accès aux documents selon la localisation GPS de l'utilisateur</p>
          <button
            onClick={() => setConfigModal({ title: 'Géofencing', description: 'Définissez des zones géographiques autorisées pour chaque document.' })}
            className="text-sm text-[#00c9a7] font-semibold hover:underline"
          >
            Configurer →
          </button>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <ClockConfigIcon />
            </div>
            <h3 className="font-bold text-gray-900">Plages horaires</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Définissez des fenêtres temporelles d'accès pour chaque document</p>
          <button
            onClick={() => setConfigModal({ title: 'Plages horaires', description: 'Configurez les plages horaires d\'accès pour vos documents.' })}
            className="text-sm text-[#00c9a7] font-semibold hover:underline"
          >
            Configurer →
          </button>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <SmartphoneIcon />
            </div>
            <h3 className="font-bold text-gray-900">Appareils autorisés</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Liez les accès à des empreintes d'appareils spécifiques</p>
          <button
            onClick={() => setConfigModal({ title: 'Appareils autorisés', description: 'Gérez les appareils autorisés à accéder à vos documents.' })}
            className="text-sm text-[#00c9a7] font-semibold hover:underline"
          >
            Configurer →
          </button>
        </div>
      </div>

      {/* Modals */}
      {detailDoc && <DetailModal document={detailDoc} onClose={() => setDetailDoc(null)} />}
      {showNewPolicy && (
        <NewPolicyModal
          onClose={() => setShowNewPolicy(false)}
          onSave={doc => setDocuments(prev => [doc, ...prev])}
        />
      )}
      {configModal && (
        <ConfigModal title={configModal.title} description={configModal.description} onClose={() => setConfigModal(null)} />
      )}

      {/* Revoke Confirmation */}
      {revokeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Révoquer l'accès ?</h3>
            <p className="text-sm text-gray-500 mb-5">Cette action révoquera l'accès au document <strong>{documents.find(d => d.id === revokeConfirm)?.name}</strong>. Cette action peut être irreversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setRevokeConfirm(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">Annuler</button>
              <button onClick={() => handleRevoke(revokeConfirm)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors">Révoquer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
