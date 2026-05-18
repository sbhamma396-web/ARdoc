import { useState } from 'react';
import { Page } from '../types';

interface LoginPageProps {
  onLogin: (page: Page) => void;
}

const ShieldIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const FingerprintIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
    <path d="M2 12a10 10 0 0 1 18-6" />
    <path d="M2 17c.01 2.07.9 4.54 3 6" />
    <path d="M5 14a14.44 14.44 0 0 0 .96 5.38" />
    <path d="M8.5 10a3.5 3.5 0 1 0-1.8 3" />
    <path d="M22 6c0 .18-.02.35-.05.52" />
    <path d="M22 12c0 4.18-1.3 7.73-3 10" />
  </svg>
);

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [tab, setTab] = useState<'password' | 'biometric'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [bioState, setBioState] = useState<'waiting' | 'scanning' | 'success'>('waiting');
  const [error, setError] = useState('');

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError('');
    onLogin('dashboard');
  };

  const handleBiometricLogin = () => {
    setBioState('scanning');
    setTimeout(() => {
      setBioState('success');
      setTimeout(() => {
        onLogin('dashboard');
      }, 800);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#1a2744] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#00c9a7] rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
          <ShieldIcon />
        </div>
        <h1 className="text-3xl font-bold text-white">
          <span className="text-white">AR</span>
          <span className="text-[#00c9a7]">Doc</span>
          <span className="text-white">Shield</span>
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Système de protection visuelle par réalité augmentée</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Connexion sécurisée</h2>

        {/* Tabs */}
        <div className="flex rounded-xl border border-gray-200 mb-6 overflow-hidden">
          <button
            onClick={() => { setTab('password'); setBioState('waiting'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              tab === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600 bg-gray-50'
            }`}
          >
            Mot de passe
          </button>
          <button
            onClick={() => { setTab('biometric'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              tab === 'biometric' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600 bg-gray-50'
            }`}
          >
            Biométrie
          </button>
        </div>

        {tab === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Identifiant</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 accent-[#00c9a7]"
                />
                <span className="text-sm text-gray-600">Se souvenir</span>
              </label>
              <button type="button" className="text-sm text-[#00c9a7] hover:underline font-medium">
                Mot de passe oublié ?
              </button>
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">{error}</div>
            )}
            <button
              type="submit"
              className="w-full py-3.5 bg-[#00c9a7] text-white rounded-xl font-semibold text-sm hover:bg-[#00b396] transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-[#00c9a7]/30"
            >
              <LockIcon />
              Se connecter
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center space-y-5">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 ${
              bioState === 'waiting' ? 'bg-[#e8faf6] text-[#00c9a7]' :
              bioState === 'scanning' ? 'bg-[#00c9a7]/20 text-[#00c9a7] animate-pulse' :
              'bg-green-100 text-green-500'
            }`}>
              <FingerprintIcon />
            </div>
            <p className="text-gray-700 text-sm font-medium">Placez votre doigt sur le capteur biométrique</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                bioState === 'waiting' ? 'bg-yellow-400' :
                bioState === 'scanning' ? 'bg-[#00c9a7] animate-pulse' :
                'bg-green-500'
              }`}></span>
              <span className="text-sm text-gray-500">
                {bioState === 'waiting' ? 'En attente de l\'authentification...' :
                 bioState === 'scanning' ? 'Scan en cours...' :
                 'Authentification réussie !'}
              </span>
            </div>
            <button
              onClick={handleBiometricLogin}
              disabled={bioState === 'scanning'}
              className="w-full py-3.5 bg-[#00c9a7] text-white rounded-xl font-semibold text-sm hover:bg-[#00b396] transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-[#00c9a7]/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <FingerprintIcon />
              Utiliser la biométrie
            </button>
          </div>
        )}

        {/* Footer badges */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1 text-[#00c9a7]"><LockIcon /> AES-256-GCM</span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center gap-1"><ClockIcon /> JWT Auth</span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center gap-1"><EyeIcon /> MFA</span>
        </div>
      </div>

      {/* Bottom copyright */}
      <p className="text-gray-500 text-sm mt-6">© 2026 ARDocShield – Tous droits réservés</p>
    </div>
  );
}
