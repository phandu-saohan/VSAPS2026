import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FRONTEND_URL } from '../constants';

let oneSignalInitPromise: Promise<void> | null = null;

const ONE_SIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

const OneSignalInitializer = () => {
  const { profile } = useAuth();

  useEffect(() => {
    if (!ONE_SIGNAL_APP_ID || oneSignalInitPromise) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      oneSignalInitPromise = OneSignal.init({
        appId: ONE_SIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        origin: FRONTEND_URL,
        serviceWorkerPath: '/service-worker.js',
        serviceWorkerUpdaterPath: '/service-worker.js',
        serviceWorkerParam: { scope: '/' },
      });

      await oneSignalInitPromise;
      OneSignal.Notifications.addEventListener('click', (event) => {
        const url = event.notification.launchURL;
        if (!url) return;

        try {
          const path = new URL(url).hash.substring(1);
          if (path) window.location.hash = path;
        } catch (error) {
          console.error('[OneSignal] Could not parse launchURL:', error);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!oneSignalInitPromise) return;

    const syncUser = async () => {
      await oneSignalInitPromise;
      const OneSignal = window.OneSignal;
      if (!OneSignal) return;

      if (profile?.id) {
        await OneSignal.login(profile.id);
      } else {
        const externalId = OneSignal.User.getExternalId();
        if (externalId) {
          try {
            await OneSignal.logout();
          } catch (error: any) {
            if (!error?.message?.includes('No aliases found')) {
              console.error('[OneSignal] Logout error:', error);
            }
          }
        }
      }
    };

    syncUser();
  }, [profile]);

  return null;
};

export default OneSignalInitializer;
