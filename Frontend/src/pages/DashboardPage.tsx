import { useState, useEffect } from 'react';
import { activityItems } from '../data/mockData';

const FileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const AlertIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>
);

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const EyeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const LockSmIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ShieldSmIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const stats = [
  { label: 'Documents protégés', value: '1,247', icon: <FileIcon />, bg: 'bg-blue-500', iconBg: 'bg-blue-500' },
  { label: 'Accès accordés', value: '8,532', icon: <CheckIcon />, bg: 'bg-[#00c9a7]', iconBg: 'bg-[#00c9a7]' },
  { label: 'Accès refusés', value: '124', icon: <AlertIcon />, bg: 'bg-orange-500', iconBg: 'bg-orange-500' },
  { label: 'Utilisateurs actifs', value: '342', icon: <UsersIcon />, bg: 'bg-purple-500', iconBg: 'bg-purple-500' },
];

export default function DashboardPage() {
  const [activities, setActivities] = useState(activityItems);
  const [_counter, setCounter] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter(c => c + 1);
      // Simulate new activity
      const newNames = ['Dr. Paul Renard', 'Mme. Laure Simon', 'M. Eric Blanc', 'Prof. Anne Duval'];
      const newDocs = ['Dossier médical #9012', 'Rapport confidentiel #3345', 'Plan stratégique #7890'];
      const newLocs = ['CHU Lille', 'Siège Paris 8', 'Usine Marseille', 'Bureau Lyon'];
      const types: ('Accès accordé' | 'Accès refusé')[] = ['Accès accordé', 'Accès refusé'];
      const newActivity = {
        id: Date.now().toString(),
        user: newNames[Math.floor(Math.random() * newNames.length)],
        accessType: types[Math.floor(Math.random() * types.length)],
        document: newDocs[Math.floor(Math.random() * newDocs.length)],
        time: 'À l\'instant',
        location: newLocs[Math.floor(Math.random() * newLocs.length)],
      };
      setActivities(prev => [newActivity, ...prev.slice(0, 4)]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Hero Banner */}
      <div className="bg-[#1a2744] rounded-2xl p-8 mb-6 flex items-center justify-between relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2">Protection de documents par réalité augmentée</h2>
          <p className="text-gray-300 text-sm mb-5 max-w-lg">
            Rendez vos documents physiques illisibles à l'œil nu. Seule l'application AR authentifiée peut révéler le contenu protégé.
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 bg-white/10 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
              <LockSmIcon /> Chiffrement AES-256-GCM
            </span>
            <span className="flex items-center gap-2 bg-white/10 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
              <ShieldSmIcon /> Authentification multi-facteur
            </span>
          </div>
        </div>
        <div className="w-28 h-28 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 flex-shrink-0">
          <EyeIcon />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center text-white mb-4`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Real-time Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ActivityIcon />
            <span className="font-bold text-gray-900">Activité en temps réel</span>
          </div>
          <span className="text-sm text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00c9a7] animate-pulse inline-block"></span>
            Mise à jour automatique
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {activities.map((item, index) => (
            <div
              key={item.id}
              className={`px-6 py-4 flex items-start justify-between transition-all duration-500 ${index === 0 ? 'bg-[#00c9a7]/5' : ''}`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{item.user}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    item.accessType === 'Accès accordé'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {item.accessType}
                  </span>
                </div>
                <div className="text-sm text-gray-500">{item.document}</div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <ClockIcon /> {item.time}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPinIcon /> {item.location}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
