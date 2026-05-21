import { Page } from '../types';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function Navbar({ currentPage, onNavigate, onLogout }: NavbarProps) {
  return (
    <nav className="bg-[#1a2744] text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
      {/* Logo */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
        <div className="w-9 h-9 bg-[#00c9a7] rounded-lg flex items-center justify-center text-white">
          <ShieldIcon />
        </div>
        <div>
          <div className="text-lg font-bold leading-tight">
            <span className="text-white">AR</span>
            <span className="text-[#00c9a7]">Doc</span>
            <span className="text-white">Shield</span>
          </div>
          <div className="text-xs text-gray-400 leading-tight">Système de protection visuelle par RA</div>
        </div>
      </div>

      {/* Nav Links */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentPage === 'dashboard'
              ? 'bg-[#00c9a7] text-white'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Tableau de bord
        </button>

        <button
          onClick={() => onNavigate('encoder')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentPage === 'encoder'
              ? 'bg-[#00c9a7] text-white'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Encodeur
        </button>

        <button
          onClick={() => onNavigate('access')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentPage === 'access'
              ? 'bg-[#00c9a7] text-white'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Gestion des accès
        </button>

        <button
          onClick={() => onNavigate('users')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentPage === 'users'
              ? 'bg-[#00c9a7] text-white'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Utilisateurs
        </button>

        <button
          onClick={() => onNavigate('scanner')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
            currentPage === 'scanner'
              ? 'bg-[#00c9a7] border-[#00c9a7] text-white'
              : 'border-[#00c9a7] text-[#00c9a7] hover:bg-[#00c9a7] hover:text-white'
          }`}
        >
          <CameraIcon />
          Scanner
        </button>

        <button
          onClick={onLogout}
          className="ml-2 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
          title="Se déconnecter"
        >
          <LogoutIcon />
        </button>
      </div>
    </nav>
  );
}
