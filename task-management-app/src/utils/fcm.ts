import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

import apiClient from '../Services/apiClient';

const normalizeText = (v: unknown) => String(v || '').trim();

const getOrCreateDeviceId = (): string => {
  const existing = normalizeText(localStorage.getItem('deviceId'));
  if (existing) return existing;

  const generated = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
    ? (globalThis.crypto.randomUUID() as string)
    : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem('deviceId', generated);
  return generated;
};

const ensureFirebaseApp = () => {
  if (getApps().length) return getApps()[0];

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const required = [
    firebaseConfig.apiKey,
    firebaseConfig.projectId,
    firebaseConfig.messagingSenderId,
    firebaseConfig.appId
  ].every((v) => typeof v === 'string' && v.trim().length > 0);

  if (!required) {
    throw new Error('FCM is not configured (missing VITE_FIREBASE_* env vars)');
  }

  return initializeApp(firebaseConfig);
};

const ensureServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    return reg;
  } catch {
    return null;
  }
};

const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // ignore
  }
};

let foregroundListenerAttached = false;

export const initForegroundPushListener = async () => {
  if (foregroundListenerAttached) return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const swReg = await ensureServiceWorker();
  if (!swReg) return;

  const vapidKey = normalizeText(import.meta.env.VITE_FIREBASE_VAPID_KEY);
  if (!vapidKey) return;

  try {
    ensureFirebaseApp();
  } catch {
    return;
  }

  const messaging = getMessaging();
  onMessage(messaging, (payload: any) => {
    playNotificationSound();
    const notification = payload?.notification || {};
    const data = payload?.data || {};

    const title = notification.title || data.title || 'TaskFlow';
    const body = notification.body || data.body || 'New task assigned';
    const url = data.url || '/';

    swReg.showNotification(title, {
      body,
      data: {
        ...data,
        url
      }
    }).catch(() => {
      try {
        new Notification(title, { body });
      } catch {
        return;
      }
    });
  });

  foregroundListenerAttached = true;
};

export const registerPushDevice = async ({ prompt, userEmail }: { prompt: boolean; userEmail?: string }) => {
  const deviceId = getOrCreateDeviceId();

  if (!('Notification' in window)) return { deviceId, token: '' };

  if (prompt) {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { deviceId, token: '' };
  } else {
    if (Notification.permission !== 'granted') return { deviceId, token: '' };
  }

  const swReg = await ensureServiceWorker();
  if (!swReg) return { deviceId, token: '' };

  const vapidKey = normalizeText(import.meta.env.VITE_FIREBASE_VAPID_KEY);
  if (!vapidKey) return { deviceId, token: '' };

  try {
    ensureFirebaseApp();
  } catch {
    return { deviceId, token: '' };
  }

  const messaging = getMessaging();
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
  if (!token) return { deviceId, token: '' };

  localStorage.setItem('fcmToken', token);

  await apiClient.post('/push/register', {
    token,
    deviceId,
    platform: 'web',
    userAgent: navigator.userAgent,
    userEmail: normalizeText(userEmail).toLowerCase()
  });

  try {
    await initForegroundPushListener();
  } catch {
    // ignore
  }

  return { deviceId, token };
};

export const linkPushDeviceToUser = async ({ deviceId, token }: { deviceId?: string; token?: string }) => {
  const resolvedDeviceId = normalizeText(deviceId) || getOrCreateDeviceId();
  const resolvedToken = normalizeText(token) || normalizeText(localStorage.getItem('fcmToken'));

  if (!resolvedDeviceId && !resolvedToken) return;

  await apiClient.post('/push/link', {
    deviceId: resolvedDeviceId,
    token: resolvedToken
  });
};

export const getNotificationPermission = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

export const initPushIfAlreadyGranted = async () => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    await registerPushDevice({ prompt: false });
  } catch {
    return;
  }
};
