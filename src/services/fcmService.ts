import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from '../firebase';

let messagingInstance: Messaging | null = null;
let isFCMSupported: boolean | null = null;

/**
 * Checks if Firebase Cloud Messaging is supported in this browser/device
 */
export async function checkFCMSupport(): Promise<boolean> {
  if (isFCMSupported !== null) return isFCMSupported;
  try {
    if (typeof window === 'undefined') {
      isFCMSupported = false;
      return false;
    }
    const supported = await isSupported();
    isFCMSupported = supported;
    return supported;
  } catch (err) {
    console.warn('Erro ao verificar suporte a FCM:', err);
    isFCMSupported = false;
    return false;
  }
}

/**
 * Retrieves or initializes the Firebase Messaging instance
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await checkFCMSupport();
  if (!supported) return null;

  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn('Falha ao instanciar Firebase Messaging:', err);
    return null;
  }
}

/**
 * Synthesizes a clean, pleasant, dual-tone notification chime using Web Audio API
 * No external audio files or network traffic required!
 */
export function playNotificationChime(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5 note)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: 880.00 Hz (A5 note) - crisp harmonized chord
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.08);
    gain2.gain.setValueAtTime(0.22, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn('Não foi possível reproduzir aviso sonoro:', e);
  }
}

/**
 * Requests browser push notification permissions and saves the FCM token to Firestore
 */
export async function requestFCMNotificationPermission(adminEmail: string): Promise<{
  granted: boolean;
  token: string | null;
  error?: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, token: null, error: 'Notificações não são suportadas neste navegador.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { granted: false, token: null, error: 'Permissão de notificação negada pelo usuário.' };
    }

    const messaging = await getMessagingInstance();
    let fcmToken: string | null = null;

    if (messaging) {
      try {
        // Attempt to register service worker if available
        let swReg: ServiceWorkerRegistration | undefined;
        if ('serviceWorker' in navigator) {
          swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
          if (!swReg) {
            swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          }
        }

        fcmToken = await getToken(messaging, {
          serviceWorkerRegistration: swReg,
        }).catch((err) => {
          console.warn('Aviso ao obter token FCM (continuando com Web Push nativo):', err.message);
          return null;
        });
      } catch (tokenErr: any) {
        console.warn('Erro ao requisitar token FCM:', tokenErr);
      }
    }

    // Persist registration in Firestore `fcm_tokens` collection if admin is authenticated
    if (adminEmail) {
      const sanitizedEmail = adminEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const docId = fcmToken ? fcmToken.slice(-24).replace(/[^a-zA-Z0-9_-]/g, '') : `web_${sanitizedEmail}`;

      try {
        await setDoc(doc(db, 'fcm_tokens', docId), {
          token: fcmToken || 'native_web_push',
          email: adminEmail,
          deviceInfo: navigator.userAgent || 'Desconhecido',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (firestoreErr) {
        console.warn('Não foi possível persistir token no Firestore:', firestoreErr);
      }
    }

    return { granted: true, token: fcmToken };
  } catch (err: any) {
    console.error('Erro ao solicitar permissão de notificações:', err);
    return { granted: false, token: null, error: err.message || 'Erro desconhecido.' };
  }
}

/**
 * Fires a system-level desktop/mobile push notification via ServiceWorker or Notification API
 */
export async function triggerSystemNotification(
  title: string,
  body: string,
  tag: string = 'sac-cipa-alert',
  dataPayload?: any
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: '/logo/apple-touch-icon.png',
    badge: '/logo/apple-touch-icon.png',
    tag,
    renotify: true,
    data: dataPayload,
    requireInteraction: true,
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch (err) {
    try {
      new Notification(title, options);
      return true;
    } catch (fallbackErr) {
      console.warn('Falha ao disparar notificação nativa:', fallbackErr);
      return false;
    }
  }
}

/**
 * Listens for FCM foreground messages
 */
export async function listenToForegroundMessages(
  onNotification: (payload: { title?: string; body?: string; data?: any }) => void
): Promise<(() => void) | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Mensagem FCM em primeiro plano recebida:', payload);
      onNotification({
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data,
      });
    });
    return unsubscribe;
  } catch (err) {
    console.warn('Erro ao escutar mensagens FCM em primeiro plano:', err);
    return null;
  }
}
