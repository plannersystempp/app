import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

interface NotificationPayload {
  userId?: string;
  teamId?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  // Preflight CORS antes de validações
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Exigir Authorization para requisições reais
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente com contexto do usuário para validar JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente com Service Role para consultar preferências e enviar push
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    const { userId, teamId, title, body, icon, badge, tag, data } = payload;

    console.log('Sending push notification:', { userId, teamId, title });

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId && !teamId) {
      return new Response(
        JSON.stringify({ error: 'Either userId or teamId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let query = supabase
      .from('user_notification_preferences')
      .select('user_id, push_subscription, enabled');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: preferences, error: prefsError } = await query;

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notification preferences' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!preferences || preferences.length === 0) {
      console.log('No users with notification preferences found');
      return new Response(
        JSON.stringify({ message: 'No users to notify', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validSubscriptions = preferences.filter(
      pref => pref.enabled && pref.push_subscription
    );

    console.log(`Found ${validSubscriptions.length} valid subscriptions`);

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@plannersystem.app';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-192x192.png',
      tag: tag || 'plannersystem-notification',
      data: data || {},
    });

    const results = await Promise.allSettled(
      validSubscriptions.map(async (pref) => {
        try {
          const subscription = typeof pref.push_subscription === 'string' 
            ? JSON.parse(pref.push_subscription) 
            : pref.push_subscription;

          await webpush.sendNotification(subscription, notificationPayload);
          console.log(`Notification sent to user ${pref.user_id}`);
          return { success: true, userId: pref.user_id };
        } catch (error: any) {
          console.error(`Failed to send to user ${pref.user_id}:`, error);
          return { success: false, userId: pref.user_id, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failureCount = results.length - successCount;

    console.log(`Notifications sent: ${successCount} success, ${failureCount} failures`);

    return new Response(
      JSON.stringify({
        message: 'Notifications processed',
        sent: successCount,
        failed: failureCount,
        total: results.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
