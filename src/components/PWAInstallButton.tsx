import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Monitor, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  // If already running inside standalone app, don't show install prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
      }
    } else {
      // If prompt isn't directly available (iOS or desktop browser without ambient prompt), show guided modal
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        id="btn-pwa-install"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
        title="Instalar SAC CIPA no computador ou celular com o logo oficial"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">App</span>
      </button>

      {/* Guided Install Modal for iOS and Desktop */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* App Header & Official Logo */}
            <div className="flex items-center gap-3.5 mb-5">
              <img
                src="/apple-touch-icon.png"
                alt="Logo SAC CIPA"
                className="w-14 h-14 rounded-xl border border-slate-200 shadow-sm object-contain p-1 bg-white"
              />
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  Instalar SAC CIPA
                </h3>
                <p className="text-xs text-slate-500">
                  Aplicativo oficial para Computador, Android e iPhone/iPad
                </p>
              </div>
            </div>

            {/* Platform instructions */}
            {isIOS ? (
              <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                    <Share className="h-4 w-4" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      1. Toque em Compartilhar
                    </strong>
                    <span>No navegador Safari do seu iPhone ou iPad, toque no ícone de compartilhamento na barra inferior.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                    <PlusSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      2. Adicionar à Tela de Início
                    </strong>
                    <span>Role para baixo nas opções e toque em <strong>"Adicionar à Tela de Início"</strong>. O aplicativo será instalado com o logo oficial da CIPA.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      Computador (Chrome / Edge / Windows / Mac)
                    </strong>
                    <span>Clique no ícone de instalação <Download className="inline h-3 w-3 text-emerald-700 mx-0.5" /> na barra de endereços do navegador no topo da tela.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      Celular Android
                    </strong>
                    <span>Toque nos 3 pontos do menu do navegador e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    setShowModal(false);
                    await install();
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Instalar Agora</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
