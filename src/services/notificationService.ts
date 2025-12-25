import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

interface SendNotificationParams extends NotificationData {
  userId?: string;
  teamId?: string;
}

class NotificationService {
  // Enviar notificação local (via Service Worker)
  async sendLocalNotification(notification: NotificationData) {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/icon-192x192.png',
        tag: notification.tag || 'plannersystem-notification',
        data: notification.data || {},
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  // Enviar notificação via Edge Function (para push notifications)
  async sendPushNotification(params: SendNotificationParams) {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: params.userId,
          teamId: params.teamId,
          title: params.title,
          body: params.body,
          icon: params.icon,
          badge: params.badge,
          tag: params.tag,
          data: params.data,
        },
      });

      if (error) throw error;
      console.log('Push notification sent:', data);
      return data;
    } catch (error) {
      console.warn('Warning: Failed to send push notification. This is likely due to CORS configuration or the Edge Function not being deployed.', error);
      // Return null instead of throwing to avoid disrupting the application flow
      return null;
    }
  }

  // Método unificado para enviar notificações (local + push)
  async notify(params: SendNotificationParams) {
    // Enviar notificação local para o usuário atual
    await this.sendLocalNotification({
      title: params.title,
      body: params.body,
      icon: params.icon,
      badge: params.badge,
      tag: params.tag,
      data: params.data,
    });

    // Se userId ou teamId foi fornecido, enviar push notification
    if (params.userId || params.teamId) {
      await this.sendPushNotification(params);
    }
  }

  // Notificações específicas do sistema
  async notifyEventCreated(eventName: string, teamId: string) {
    await this.notify({
      teamId,
      title: '🎉 Novo Evento Criado',
      body: `O evento "${eventName}" foi criado com sucesso!`,
      tag: 'event-created',
      data: { type: 'event-created', eventName },
    });
  }

  async notifyEventUpdated(eventName: string, teamId: string) {
    await this.notify({
      teamId,
      title: '📝 Evento Atualizado',
      body: `O evento "${eventName}" foi atualizado.`,
      tag: 'event-updated',
      data: { type: 'event-updated', eventName },
    });
  }

  async notifyEventStatusChanged(eventName: string, newStatus: string, teamId: string) {
    await this.notify({
      teamId,
      title: '🔄 Status do Evento Alterado',
      body: `"${eventName}" agora está ${newStatus}`,
      tag: 'event-status-changed',
      data: { type: 'event-status-changed', eventName, status: newStatus },
    });
  }

  async notifyAllocationCreated(personnelName: string, eventName: string, teamId: string) {
    await this.notify({
      teamId,
      title: '👥 Nova Alocação',
      body: `${personnelName} foi alocado(a) para "${eventName}"`,
      tag: 'allocation-created',
      data: { type: 'allocation-created', personnelName, eventName },
    });
  }

  async notifyEventReminder(eventName: string, hoursUntilStart: number, teamId: string) {
    await this.notify({
      teamId,
      title: `⏰ Lembrete: Evento em ${hoursUntilStart}h`,
      body: `O evento "${eventName}" começa em ${hoursUntilStart} horas!`,
      tag: 'event-reminder',
      data: { type: 'event-reminder', eventName, hoursUntilStart },
    });
  }

  async notifyPaymentDue(eventName: string, daysUntilDue: number, teamId: string) {
    await this.notify({
      teamId,
      title: '💰 Pagamento Pendente',
      body: `Pagamento de "${eventName}" vence em ${daysUntilDue} dias`,
      tag: 'payment-due',
      data: { type: 'payment-due', eventName, daysUntilDue },
    });
  }

  async notifyAbsenceRegistered(personnelName: string, eventName: string, date: string, teamId: string) {
    await this.notify({
      teamId,
      title: '⚠️ Falta Registrada',
      body: `${personnelName} faltou em "${eventName}" no dia ${date}`,
      tag: 'absence-registered',
      data: { type: 'absence-registered', personnelName, eventName, date },
    });
  }

  async notifyPaymentReceived(amount: number, eventName: string, teamId: string) {
    await this.notify({
      teamId,
      title: '✅ Pagamento Registrado',
      body: `Pagamento de R$ ${amount.toFixed(2)} registrado para "${eventName}"`,
      tag: 'payment-received',
      data: { type: 'payment-received', amount, eventName },
    });
  }

  // ============= SUPPLIER NOTIFICATIONS =============
  
  async notifySupplierAdded(supplierName: string, teamId: string) {
    await this.notify({
      teamId,
      title: '🏢 Novo Fornecedor Cadastrado',
      body: `"${supplierName}" foi adicionado aos seus fornecedores`,
      tag: 'supplier-added',
      data: { type: 'supplier-added', supplierName },
    });
  }

  async notifySupplierCostAdded(supplierName: string, eventName: string, amount: number, teamId: string) {
    await this.notify({
      teamId,
      title: '💵 Custo de Fornecedor Adicionado',
      body: `Custo de R$ ${amount.toFixed(2)} de "${supplierName}" adicionado ao evento "${eventName}"`,
      tag: 'supplier-cost-added',
      data: { type: 'supplier-cost-added', supplierName, eventName, amount },
    });
  }

  async notifySupplierPaymentDue(supplierName: string, eventName: string, daysUntilDue: number, teamId: string) {
    await this.notify({
      teamId,
      title: '⚠️ Pagamento de Fornecedor Pendente',
      body: `Pagamento de "${supplierName}" para "${eventName}" vence em ${daysUntilDue} dias`,
      tag: 'supplier-payment-due',
      data: { type: 'supplier-payment-due', supplierName, eventName, daysUntilDue },
    });
  }

  async notifySupplierPaymentReceived(supplierName: string, amount: number, eventName: string, teamId: string) {
    await this.notify({
      teamId,
      title: '✅ Pagamento a Fornecedor Registrado',
      body: `Pagamento de R$ ${amount.toFixed(2)} registrado para "${supplierName}" (${eventName})`,
      tag: 'supplier-payment-received',
      data: { type: 'supplier-payment-received', supplierName, amount, eventName },
    });
  }

  async notifySupplierRated(supplierName: string, rating: number, eventName: string, teamId: string) {
    await this.notify({
      teamId,
      title: '⭐ Fornecedor Avaliado',
      body: `"${supplierName}" recebeu ${rating} estrelas no evento "${eventName}"`,
      tag: 'supplier-rated',
      data: { type: 'supplier-rated', supplierName, rating, eventName },
    });
  }
}

export const notificationService = new NotificationService();
