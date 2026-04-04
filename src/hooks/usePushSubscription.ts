import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BIt17IcmE0C1A6eODRf2JSrZtbImKfTzAOIGyAUg93G4NWmOg9SjSRp_dp6K5nGtL3PSawd5jCA48StW5w9YpeQ';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (registration) {
        const sub = await registration.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch (e) {
      console.error('Check subscription error:', e);
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    // Don't register in iframe or preview
    const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const isPreviewHost = window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com');
    
    if (isInIframe || isPreviewHost) {
      throw new Error('Push notifications are not available in preview mode');
    }

    let registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
      await navigator.serviceWorker.ready;
    }
    return registration;
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setIsLoading(false);
        return false;
      }

      const registration = await registerServiceWorker();
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }

      const subJson = subscription.toJSON();
      
      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      }, { onConflict: 'user_id,endpoint' });

      if (error) throw error;

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (e) {
      console.error('Push subscribe error:', e);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          
          // Remove from database
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
          }
        }
      }
      setIsSubscribed(false);
    } catch (e) {
      console.error('Push unsubscribe error:', e);
    }
    setIsLoading(false);
  }, []);

  return { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe };
}
