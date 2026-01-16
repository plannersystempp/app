import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { VAPID_PUBLIC_KEY, isVapidConfigured } from '@/constants/notifications';

interface NotificationPreferences {
  event_reminders: boolean;
  payment_reminders: boolean;
  event_start_24h: boolean;
  event_start_48h: boolean;
  allocation_updates: boolean;
  absence_alerts: boolean;
  status_changes: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    event_reminders: true,
    payment_reminders: true,
    event_start_24h: true,
    event_start_48h: false,
    allocation_updates: true,
    absence_alerts: true,
    status_changes: false,
  });
  const [loading, setLoading] = useState(false);

  // Verificar permissão atual
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Carregar preferências do usuário
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id || !activeTeam?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .eq('team_id', activeTeam.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreferences({
            event_reminders: data.event_reminders ?? true,
            payment_reminders: data.payment_reminders ?? true,
            event_start_24h: data.event_start_24h ?? true,
            event_start_48h: data.event_start_48h ?? false,
            allocation_updates: data.allocation_updates ?? true,
            absence_alerts: data.absence_alerts ?? true,
            status_changes: data.status_changes ?? false,
          });

          // Verificar se há subscription salva
          if (data.push_subscription) {
            setIsSubscribed(true);
          }
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    };

    loadPreferences();
  }, [user?.id, activeTeam?.id]);

  // Solicitar permissão de notificações
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Não Suportado',
        description: 'Seu navegador não suporta notificações',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast({
          title: 'Sucesso!',
          description: 'Permissão de notificações concedida',
        });
        return true;
      } else {
        toast({
          title: 'Permissão Negada',
          description: 'Você negou as notificações. Pode ativar nas configurações do navegador.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  // Subscribe para push notifications
  const subscribeToPush = async () => {
    if (!user?.id || !activeTeam?.id) {
      console.error('User or team not available');
      return false;
    }

    try {
      setLoading(true);

      // Verificar se o contexto é seguro (HTTPS ou localhost)
      if (!window.isSecureContext) {
        console.error('Insecure context: Push requires HTTPS or localhost');
        toast({
          title: 'Contexto Não Seguro',
          description: 'Push notifications exigem HTTPS ou localhost.',
          variant: 'destructive',
        });
        return false;
      }

      // Verificar suporte ao PushManager
      if (!('PushManager' in window)) {
        console.error('PushManager not available in this browser');
        toast({
          title: 'Não Suportado',
          description: 'Seu navegador não suporta Push API.',
          variant: 'destructive',
        });
        return false;
      }

      // Verificar permissão primeiro
      if (permission !== 'granted') {
        console.log('Requesting notification permission...');
        const granted = await requestPermission();
        if (!granted) {
          console.error('Permission not granted');
          return false;
        }
      }

      // Verificar se VAPID está configurada depois da permissão
      const vapid = (import.meta.env.VITE_VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY || '').trim();
      if (!vapid) {
        toast({
          title: 'Configuração Incompleta',
          description: 'VAPID keys não foram configuradas. Contate o administrador.',
          variant: 'destructive',
        });
        return false;
      }

      // Verificar se Service Worker está disponível
      if (!('serviceWorker' in navigator)) {
        console.error('Service Worker not supported');
        toast({
          title: 'Não Suportado',
          description: 'Seu navegador não suporta notificações push',
          variant: 'destructive',
        });
        return false;
      }

      // Aguardar Service Worker estar pronto
      console.log('Waiting for service worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker ready:', registration);

      // Caso incomum: pushManager indisponível mesmo com SW pronto
      if (!registration.pushManager) {
        console.error('PushManager not available on registration');
        try {
          console.log('Attempting to re-register service worker with explicit scope');
          await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          const reg2 = await navigator.serviceWorker.ready;
          if (!reg2.pushManager) {
            toast({
              title: 'Push Indisponível',
              description: 'Falha ao inicializar Push Service no navegador.',
              variant: 'destructive',
            });
            return false;
          }
        } catch (reRegError) {
          console.error('Service worker re-registration failed:', reRegError);
          toast({
            title: 'Erro no Service Worker',
            description: 'Falha ao registrar o Service Worker para push.',
            variant: 'destructive',
          });
          return false;
        }
      }

      // Verificar se já existe subscription
      let subscription = await registration.pushManager.getSubscription();
      console.log('Existing subscription:', subscription ? 'Found' : 'None');

      // Se não existir, criar nova subscription com VAPID
      if (!subscription) {
        console.log('Creating new push subscription with VAPID...');
        try {
          const applicationServerKey = urlBase64ToUint8Array(vapid);
          
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as BufferSource
          });
          
          console.log('Push subscription created successfully');
        } catch (subscribeError) {
          console.error('Error creating push subscription:', subscribeError);
          // Mensagens específicas para erros comuns
          const isAbort = subscribeError && (subscribeError as Error).name === 'AbortError';
          const message = isAbort
            ? 'Registro falhou: Push service indisponível. Verifique permissões do navegador e políticas de sistema.'
            : 'Falha ao criar inscrição push. Verifique a configuração VAPID e suporte do navegador.';
          toast({
            title: 'Erro na Inscrição',
            description: message,
            variant: 'destructive',
          });
          return false;
        }
      }

      // Converter subscription para JSON
      const subscriptionData = subscription ? JSON.parse(JSON.stringify(subscription.toJSON())) : null;
      
      if (!subscriptionData) {
        console.error('Failed to create subscription data');
        toast({
          title: 'Erro',
          description: 'Falha ao processar inscrição de notificações',
          variant: 'destructive',
        });
        return false;
      }

      console.log('Saving subscription to database...');
      
      // Salvar preferências e subscription no banco de dados
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert([
          {
            user_id: user.id,
            team_id: activeTeam.id,
            push_subscription: subscriptionData,
            enabled: true,
            event_reminders: preferences.event_reminders,
            payment_reminders: preferences.payment_reminders,
            event_start_24h: preferences.event_start_24h,
            event_start_48h: preferences.event_start_48h,
            allocation_updates: preferences.allocation_updates,
            absence_alerts: preferences.absence_alerts,
            status_changes: preferences.status_changes,
          }
        ], { onConflict: 'user_id,team_id' });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Subscription saved successfully');
      setIsSubscribed(true);
      
      toast({
        title: 'Notificações Ativadas!',
        description: 'Você receberá notificações importantes do PlannerSystem',
      });
      
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      
      // Mensagens de erro mais específicas
      let errorMessage = 'Falha ao ativar notificações';
      if (error instanceof Error) {
        if (error.message.includes('not supported')) {
          errorMessage = 'Push notifications não são suportadas neste navegador';
        } else if (error.message.includes('denied')) {
          errorMessage = 'Permissão de notificações foi negada';
        }
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe de push notifications
  const unsubscribeFromPush = async () => {
    try {
      setLoading(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remover subscription do banco
      if (user?.id && activeTeam?.id) {
        const { error } = await supabase
          .from('user_notification_preferences')
          .update({ 
            push_subscription: null,
            enabled: false
          })
          .eq('user_id', user.id)
          .eq('team_id', activeTeam.id);

        if (error) throw error;
      }

      setIsSubscribed(false);
      toast({
        title: 'Notificações Desativadas',
        description: 'Você não receberá mais notificações push',
      });
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao desativar notificações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Atualizar preferências
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user?.id || !activeTeam?.id) return;

    try {
      setLoading(true);
      const updated = { ...preferences, ...newPreferences };

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert([
          {
            user_id: user.id,
            team_id: activeTeam.id,
            event_reminders: updated.event_reminders,
            payment_reminders: updated.payment_reminders,
            event_start_24h: updated.event_start_24h,
            event_start_48h: updated.event_start_48h,
            allocation_updates: updated.allocation_updates,
            absence_alerts: updated.absence_alerts,
            status_changes: updated.status_changes,
          }
        ], { onConflict: 'user_id,team_id' });

      if (error) throw error;

      setPreferences(updated);
      toast({
        title: 'Salvo!',
        description: 'Preferências de notificação atualizadas',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar preferências',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Enviar notificação de teste (via Notification API local)
  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      toast({
        title: 'Permissão Necessária',
        description: 'Conceda permissão para notificações primeiro',
        variant: 'destructive',
      });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('🎉 Teste de Notificação PlannerSystem', {
        body: 'Se você viu isso, as notificações estão funcionando!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'test-notification',
        data: { type: 'test', url: '/app' }
      });

      toast({
        title: 'Notificação Enviada!',
        description: 'Verifique se recebeu a notificação',
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao enviar notificação de teste',
        variant: 'destructive',
      });
    }
  };

  // Enviar notificação de teste via Backend (Edge Function)
  const sendServerTestNotification = async () => {
    if (!user?.id || !activeTeam?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: '🌐 Teste do Servidor',
          body: 'Esta notificação veio diretamente do servidor via Edge Function!',
          tag: 'server-test',
          data: { type: 'test', source: 'server' }
        }
      });

      if (error) throw error;

      toast({
        title: 'Teste Enviado!',
        description: 'Se tudo estiver correto, você receberá a notificação em instantes.',
      });
      
      console.log('Server test response:', data);
    } catch (error) {
      console.error('Error sending server test notification:', error);
      toast({
        title: 'Erro no Envio',
        description: 'Falha ao invocar Edge Function. Verifique logs do Supabase.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    permission,
    isSubscribed,
    preferences,
    loading,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    updatePreferences,
    sendTestNotification,
    sendServerTestNotification,
  };
};

// Helper function para converter VAPID key (será usado na Fase 5)
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
