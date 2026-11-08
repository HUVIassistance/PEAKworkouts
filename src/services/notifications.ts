/** Notifications de repos — pour être prévenu même sur une autre app.
 *
 *  Android Chrome interdit `new Notification()` depuis une page : il faut
 *  passer par `registration.showNotification()` (service worker). On garde le
 *  constructeur en repli pour les navigateurs de bureau.
 */

let registration: ServiceWorkerRegistration | null = null;
let warnTimer: number | null = null;
let endTimer: number | null = null;

export type NotifPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationPermission(): NotifPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as NotifPermission;
}

/** À appeler une fois au démarrage de l'app. */
export async function initNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    registration = await navigator.serviceWorker.register('/sw.js');
  } catch {
    registration = null;
  }
}

/** Demande la permission — doit partir d'un geste utilisateur (bouton). */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

async function send(title: string, body: string, tag = 'peak-rest'): Promise<void> {
  const reg = registration || (('serviceWorker' in navigator) ? await navigator.serviceWorker.ready : null);
  if (reg) {
    try {
      await reg.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag,
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: '/' },
      } as NotificationOptions);
      return;
    } catch {
      /* on tente le repli */
    }
  }
  try {
    new Notification(title, { body, icon: '/icon-192.png', tag });
  } catch {
    /* silencieux : pas de notification possible */
  }
}

export function cancelRestAlerts(): void {
  if (warnTimer !== null) window.clearTimeout(warnTimer);
  if (endTimer !== null) window.clearTimeout(endTimer);
  warnTimer = null;
  endTimer = null;
}

/** Programme l'alerte « 10 s » et la fin de repos, sur l'échéance absolue.
 *  Uniquement si l'app n'est pas au premier plan : inutile de notifier
 *  quelqu'un qui regarde déjà le chrono. */
export function scheduleRestAlerts(deadlineMs: number, warnBeforeSeconds = 10): void {
  cancelRestAlerts();
  if (notificationPermission() !== 'granted') return;

  const now = Date.now();
  const warnIn = deadlineMs - warnBeforeSeconds * 1000 - now;
  if (warnIn > 0) {
    warnTimer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') {
        void send('Repos : 10 secondes', 'Termine ton repos et place-toi pour la série suivante.');
      }
    }, warnIn);
  }

  const endIn = deadlineMs - now;
  if (endIn > 0) {
    endTimer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') {
        void send('Repos terminé', 'La prochaine série t’attend dans PEAK.');
      }
    }, endIn);
  }
}
