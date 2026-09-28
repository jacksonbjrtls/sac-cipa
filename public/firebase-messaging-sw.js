// Firebase Cloud Messaging Service Worker for SAC CIPA
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "sac-cipa-firebase",
  appId: "1:872407971337:web:6b60d8e836717e47efead8",
  apiKey: "AIzaSyAfqmq2jvYCABepTfyozK1YXjv5LMzWoVU",
  messagingSenderId: "872407971337"
});

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensagem push em segundo plano recebida:', payload);
    const notificationTitle = payload.notification?.title || 'SAC CIPA - Novo Chamado Recebido';
    const notificationOptions = {
      body: payload.notification?.body || 'Uma nova manifestação ou ocorrência foi enviada pelo formulário.',
      icon: '/logo/apple-touch-icon.png',
      badge: '/logo/apple-touch-icon.png',
      tag: 'sac-cipa-new-report',
      renotify: true,
      data: payload.data || { url: '/' }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('[firebase-messaging-sw.js] Falha ao inicializar messaging:', err);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
