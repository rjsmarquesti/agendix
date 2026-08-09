import { useState, useEffect } from 'react';
import { api } from '../services/api';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

export function usePushNotifications() {
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [erro, setErro]             = useState('');

  useEffect(() => {
    if (!supported || Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    );
  }, []);

  async function subscribe() {
    if (!supported) return;
    setLoading(true);
    setErro('');
    try {
      const reg  = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setErro('Permissão de notificação negada pelo navegador.');
        return;
      }

      const data = await api.get('/push/vapid-key');
      if (!data?.publicKey) {
        setErro('Servidor não configurado para push (VAPID_PUBLIC_KEY ausente). Contate o suporte.');
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      const json = sub.toJSON();
      await api.post('/push/subscribe', {
        endpoint: json.endpoint,
        p256dh:   json.keys.p256dh,
        auth:     json.keys.auth,
      });

      setSubscribed(true);
    } catch (err) {
      console.error('[push subscribe]', err);
      setErro(err.message || 'Erro desconhecido ao ativar notificações.');
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    setErro('');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Primeiro remove do browser, depois do backend
        await sub.unsubscribe();
        try {
          await api.post('/push/unsubscribe', { endpoint: sub.endpoint });
        } catch (e) {
          console.warn('[push unsubscribe backend]', e.message);
        }
      }
      setSubscribed(false);
    } catch (err) {
      console.error('[push unsubscribe]', err);
      setErro('Erro ao desativar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return { supported, permission, subscribed, loading, subscribe, unsubscribe, erro };
}
