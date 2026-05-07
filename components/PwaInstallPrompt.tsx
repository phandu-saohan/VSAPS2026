import React, { useEffect, useState } from 'react';
import { DownloadIcon } from './icons/DownloadIcon';

declare global {
  interface Window {
    OneSignalDeferred?: any[];
  }
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandalone());

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (isInstalled || !visible) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-4 bottom-20 md:bottom-6 z-50 mx-auto max-w-md">
      <div className="rounded-2xl border border-white/10 bg-[#061D5F] text-white shadow-2xl p-4 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
            <DownloadIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold">Cài ứng dụng VSAPS 2026</p>
            <p className="text-sm text-white/70 mt-1">
              Thêm ra màn hình chính để mở nhanh hơn, hỗ trợ offline tốt hơn và trải nghiệm như app.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 rounded-xl bg-secondary text-white text-sm font-bold hover:brightness-110"
              >
                Cài ngay
              </button>
              <button
                onClick={() => setVisible(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/15"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
