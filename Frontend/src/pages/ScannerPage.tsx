import { useState, useRef, useEffect } from 'react';

const CameraIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22,4 12,14.01 9,11.01" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16,16 12,12 8,16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,4 23,10 17,10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

const mockResults = [
  { id: 'DOC-4521', name: 'Dossier médical patient #4521', type: 'Médical', status: 'Actif', user: 'Dr. Marie Dupont' },
  { id: 'DOC-8834', name: 'Contrat juridique #8834', type: 'Juridique', status: 'Actif', user: 'Me. Jean Martin' },
  { id: 'DOC-7712', name: 'Examen final 2026', type: 'Éducation', status: 'Révoqué', user: null },
];

export default function ScannerPage() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<typeof mockResults[0] | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
      setUseCamera(true);
    } catch {
      setHasCameraPermission(false);
    }
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const simulateScan = (isError = false) => {
    setScanState('scanning');
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          if (isError) {
            setScanState('error');
            setResult(mockResults[2]);
          } else {
            setScanState('success');
            setResult(mockResults[Math.floor(Math.random() * 2)]);
          }
        }, 300);
      }
      setProgress(Math.min(p, 100));
    }, 150);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isError = Math.random() > 0.7;
      simulateScan(isError);
    }
  };

  const handleReset = () => {
    setScanState('idle');
    setProgress(0);
    setResult(null);
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-[#e8faf6] rounded-xl flex items-center justify-center">
              <CameraIcon />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Scanner AR</h2>
              <p className="text-gray-500 text-sm">Scannez un document pour révéler son contenu protégé</p>
            </div>
          </div>

          {scanState === 'idle' && (
            <div className="space-y-4">
              {/* Camera View */}
              {useCamera ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {/* Scan overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-40 border-2 border-[#00c9a7] rounded-lg relative">
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-[#00c9a7] rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-[#00c9a7] rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-[#00c9a7] rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-[#00c9a7] rounded-br-lg"></div>
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-[#00c9a7]/60 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
                    <button
                      onClick={() => simulateScan(Math.random() > 0.7)}
                      className="px-6 py-2.5 bg-[#00c9a7] text-white rounded-xl font-semibold text-sm hover:bg-[#00b396] transition-colors shadow-lg"
                    >
                      Scanner
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-6 py-2.5 bg-white/90 text-gray-700 rounded-xl font-semibold text-sm hover:bg-white transition-colors shadow-lg"
                    >
                      Arrêter
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center bg-gray-50">
                  <div className="w-20 h-20 bg-[#e8faf6] rounded-full flex items-center justify-center mx-auto mb-5">
                    <ShieldIcon />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">Aucun document scanné</p>
                  <p className="text-gray-400 text-sm mb-6">Activez la caméra ou importez une image</p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={startCamera}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-[#00c9a7] text-white rounded-xl font-semibold text-sm hover:bg-[#00b396] transition-colors shadow-md"
                    >
                      <CameraIcon />
                      Activer la caméra
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                    >
                      <UploadIcon />
                      Importer une image
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                  </div>

                  {hasCameraPermission === false && (
                    <p className="mt-4 text-red-500 text-sm">Permission caméra refusée. Veuillez autoriser l'accès dans les paramètres.</p>
                  )}
                </div>
              )}

              {/* Quick Scan Buttons for Demo */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-600 font-semibold mb-2 uppercase tracking-wide">Démonstration</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => simulateScan(false)} className="px-4 py-2 bg-[#00c9a7] text-white text-xs rounded-lg font-medium hover:bg-[#00b396] transition-colors">
                    Simuler accès accordé
                  </button>
                  <button onClick={() => simulateScan(true)} className="px-4 py-2 bg-red-400 text-white text-xs rounded-lg font-medium hover:bg-red-500 transition-colors">
                    Simuler accès refusé
                  </button>
                </div>
              </div>
            </div>
          )}

          {scanState === 'scanning' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-[#e8faf6] rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse">
                <ShieldIcon />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Analyse en cours...</h3>
              <p className="text-gray-500 text-sm mb-6">Vérification du document AR</p>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                <div
                  className="bg-[#00c9a7] h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">{Math.round(progress)}%</p>
            </div>
          )}

          {(scanState === 'success' || scanState === 'error') && result && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                {scanState === 'success' ? <CheckIcon /> : <AlertCircleIcon />}
              </div>
              <h3 className={`text-xl font-bold mb-2 ${scanState === 'success' ? 'text-gray-900' : 'text-red-600'}`}>
                {scanState === 'success' ? 'Accès accordé !' : 'Accès refusé'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {scanState === 'success'
                  ? 'Le document AR a été authentifié avec succès'
                  : 'Ce document est révoqué ou vous n\'êtes pas autorisé'}
              </p>

              {/* Result Card */}
              <div className={`rounded-xl p-5 text-left mb-6 border ${
                scanState === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">ID Document</span>
                    <span className="text-sm font-semibold text-[#00c9a7]">{result.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Nom</span>
                    <span className="text-sm font-semibold text-gray-900">{result.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Type</span>
                    <span className="text-sm text-gray-700">{result.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Statut</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      result.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  {result.user && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Utilisateur</span>
                      <span className="text-sm text-gray-700">{result.user}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-[#1a2744] text-white rounded-xl font-semibold text-sm hover:bg-[#243460] transition-colors"
              >
                <RefreshIcon /> Scanner un autre document
              </button>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Comment fonctionne le scanner AR ?</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { step: '1', title: 'Pointez', desc: 'Dirigez la caméra vers le document protégé' },
              { step: '2', title: 'Analysez', desc: 'Le système détecte le pattern AR chiffré' },
              { step: '3', title: 'Révélez', desc: 'Le contenu protégé est déchiffré et affiché' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-8 h-8 bg-[#e8faf6] rounded-full flex items-center justify-center mx-auto mb-2 text-[#00c9a7] font-bold text-sm">
                  {item.step}
                </div>
                <p className="font-semibold text-gray-900 text-xs mb-1">{item.title}</p>
                <p className="text-gray-400 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
