import { useState, useRef, useCallback } from 'react';
import documentService from '../services/documentService';

const FileIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>
);

const FileIconSm = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22,4 12,14.01 9,11.01" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export default function EncoderPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleGenerate = async () => {
    if (!file) return;

    setGenerating(true);
    setError('');

    try {
      await documentService.encodeFile(file, file.name.split('.')[0]);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chiffrement du document');
      console.error('Encode error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSuccess(false);
    setGenerating(false);
    setError('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-[#e8faf6] rounded-xl flex items-center justify-center">
            <FileIconSm />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Encodeur de documents</h2>
            <p className="text-gray-500 text-sm">Transformez vos documents en version protégée par AR</p>
          </div>
        </div>

        {success ? (
          /* Success State */
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <CheckCircleIcon />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Document protégé généré !</h3>
            <p className="text-gray-500 text-sm mb-2">
              <strong>{file?.name}</strong> a été encodé avec succès
            </p>
            <p className="text-gray-400 text-xs mb-8">
              Chiffrement : AES-256-GCM • Le PDF a été téléchargé automatiquement
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Encoder un autre document
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !file && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 mb-8 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-[#00c9a7] bg-[#e8faf6] scale-[1.01]'
                  : file
                  ? 'border-[#00c9a7] bg-[#e8faf6]/50 cursor-default'
                  : 'border-gray-200 bg-gray-50 hover:border-[#00c9a7] hover:bg-[#e8faf6]/30 cursor-pointer'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.gif"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-[#e8faf6] rounded-full flex items-center justify-center mb-4">
                    <FileIcon />
                  </div>
                  <p className="font-semibold text-gray-900 mb-1">{file.name}</p>
                  <p className="text-sm text-gray-400 mb-3">{formatFileSize(file.size)}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-sm transition-colors"
                  >
                    <TrashIcon /> Supprimer le fichier
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-[#e8faf6] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileIcon />
                  </div>
                  <p className="text-gray-700 font-medium mb-1">Glissez-déposez votre document ici</p>
                  <p className="text-[#00c9a7] text-sm mb-4">ou cliquez pour sélectionner un fichier (PDF, DOCX, TXT, JPG, PNG, GIF)</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-6 py-2.5 bg-[#1a2744] text-white rounded-xl font-semibold text-sm hover:bg-[#243460] transition-colors"
                  >
                    Parcourir les fichiers
                  </button>
                </>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={!file || generating}
                className={`flex-1 py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 ${
                  !file
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-[#00c9a7] hover:bg-[#00b396] shadow-md shadow-[#00c9a7]/30'
                }`}
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <LockIcon />
                    Générer le document protégé
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                disabled={generating}
                className="px-8 py-4 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
