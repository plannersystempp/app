import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionUpdateResult {
  team_id: string;
  team_name: string;
  old_status: string;
  new_status: string;
  reason: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Iniciando verificação de assinaturas...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const expiredTrials: SubscriptionUpdateResult[] = [];
    const expiredSubscriptions: SubscriptionUpdateResult[] = [];
    
    // ========================================================================
    // TAREFA 1: Expirar Trials
    // ========================================================================
    console.log('📋 Verificando trials expirados...');
    
    const { data: trialsToExpire, error: trialsError } = await supabase
      .from('team_subscriptions')
      .select(`
        id,
        team_id,
        status,
        trial_ends_at,
        teams!inner(name)
      `)
      .eq('status', 'trial')
      .lt('trial_ends_at', new Date().toISOString())
      .limit(100);

    if (trialsError) {
      console.error('❌ Erro ao buscar trials:', trialsError);
      throw trialsError;
    }

    console.log(`✅ Encontrados ${trialsToExpire?.length || 0} trials para expirar`);

    // Processar cada trial expirado
    for (const subscription of trialsToExpire || []) {
      const { error: updateError } = await supabase
        .from('team_subscriptions')
        .update({ 
          status: 'trial_expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error(`❌ Erro ao expirar trial ${subscription.id}:`, updateError);
        continue;
      }

      // Registrar no audit log
      await supabase.from('audit_logs').insert({
        team_id: subscription.team_id,
        action: 'SUBSCRIPTION_STATUS_CHANGE',
        table_name: 'team_subscriptions',
        record_id: subscription.id,
        old_values: { status: 'trial' },
        new_values: { status: 'trial_expired' }
      });

      expiredTrials.push({
        team_id: subscription.team_id,
        team_name: (subscription as any).teams.name,
        old_status: 'trial',
        new_status: 'trial_expired',
        reason: 'Trial period ended'
      });

      console.log(`✅ Trial expirado: ${(subscription as any).teams.name}`);
    }

    // ========================================================================
    // TAREFA 2: Marcar Assinaturas Vencidas
    // ========================================================================
    console.log('📋 Verificando assinaturas vencidas...');
    
    const { data: subscriptionsToExpire, error: subsError } = await supabase
      .from('team_subscriptions')
      .select(`
        id,
        team_id,
        status,
        current_period_ends_at,
        subscription_plans!inner(billing_cycle),
        teams!inner(name)
      `)
      .eq('status', 'active')
      .not('current_period_ends_at', 'is', null)
      .neq('subscription_plans.billing_cycle', 'lifetime')
      .lt('current_period_ends_at', new Date().toISOString())
      .limit(100);

    if (subsError) {
      console.error('❌ Erro ao buscar assinaturas:', subsError);
      throw subsError;
    }

    console.log(`✅ Encontradas ${subscriptionsToExpire?.length || 0} assinaturas para marcar como vencidas`);

    // Processar cada assinatura vencida
    for (const subscription of subscriptionsToExpire || []) {
      const { error: updateError } = await supabase
        .from('team_subscriptions')
        .update({ 
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error(`❌ Erro ao marcar assinatura como vencida ${subscription.id}:`, updateError);
        continue;
      }

      // Registrar no audit log
      await supabase.from('audit_logs').insert({
        team_id: subscription.team_id,
        action: 'SUBSCRIPTION_STATUS_CHANGE',
        table_name: 'team_subscriptions',
        record_id: subscription.id,
        old_values: { status: 'active' },
        new_values: { status: 'past_due' }
      });

      expiredSubscriptions.push({
        team_id: subscription.team_id,
        team_name: (subscription as any).teams.name,
        old_status: 'active',
        new_status: 'past_due',
        reason: 'Payment period expired'
      });

      console.log(`✅ Assinatura marcada como vencida: ${(subscription as any).teams.name}`);
    }

    // ========================================================================
    // RESULTADO FINAL
    // ========================================================================
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        trials_expired: expiredTrials.length,
        subscriptions_expired: expiredSubscriptions.length,
        total_processed: expiredTrials.length + expiredSubscriptions.length
      },
      details: {
        expired_trials: expiredTrials,
        expired_subscriptions: expiredSubscriptions
      }
    };

    console.log('✅ Verificação concluída:', result.summary);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erro fatal na verificação:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});
