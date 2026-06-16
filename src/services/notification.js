const SERVICE_WORKER_PATH = '/sw.js';
const DEFAULT_PUSH_PUBLIC_KEY =
  'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

export const PUSH_PUBLIC_KEY = import.meta.env.VITE_PUSH_PUBLIC_KEY || DEFAULT_PUSH_PUBLIC_KEY;

export function isPushSupported() {
  return import.meta.env.PROD && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_PATH);
}

export async function getServiceWorkerRegistration() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    throw new Error('Service worker is not supported in this browser.');
  }

  return navigator.serviceWorker.ready;
}

export async function getExistingSubscription() {
  const registration = await getServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('Push notification is not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await getServiceWorkerRegistration();
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    return existingSubscription;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUSH_PUBLIC_KEY),
  });
}

export async function unsubscribeFromPush() {
  const subscription = await getExistingSubscription();
  if (!subscription) {
    return null;
  }

  await subscription.unsubscribe();
  return subscription;
}

export function serializeSubscription(subscription) {
  const json = subscription.toJSON();

  return {
    endpoint: json.endpoint,
    keys: {
      auth: json.keys?.auth,
      p256dh: json.keys?.p256dh,
    },
  };
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawValue = window.atob(base64);
  const output = new Uint8Array(rawValue.length);

  for (let index = 0; index < rawValue.length; index += 1) {
    output[index] = rawValue.charCodeAt(index);
  }

  return output;
}
