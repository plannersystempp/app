import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPaymentRequest {
  sessionId: string;
  teamId: string;
  planId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Inicializar Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY não configurado');
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Inicializar Supabase Admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Usuário não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Token inválido');
    }

    // Parse do corpo da requisição
    const { sessionId, teamId: requestTeamId, planId: requestPlanId }: Partial<VerifyPaymentRequest> = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Verificando pagamento - Session: ${sessionId}`);

    // Buscar session no Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const metadataTeamId = session.metadata?.team_id || null;
    const metadataPlanId = session.metadata?.plan_id || null;

    if (metadataTeamId && requestTeamId && metadataTeamId !== requestTeamId) {
      return new Response(
        JSON.stringify({ error: 'teamId não confere com o metadata do Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (metadataPlanId && requestPlanId && metadataPlanId !== requestPlanId) {
      return new Response(
        JSON.stringify({ error: 'planId não confere com o metadata do Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamId = metadataTeamId || requestTeamId || null;
    const planId = metadataPlanId || requestPlanId || null;

    if (!teamId || !planId) {
      console.error('❌ teamId ou planId não encontrados no request nem no metadata do Stripe');
      return new Response(
        JSON.stringify({ error: 'Não foi possível identificar o time ou plano da assinatura' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: session.payment_status,
          message: 'Pagamento ainda não foi confirmado' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar plano no banco
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error('Plano não encontrado no banco');
    }

    const isLifetime = plan.billing_cycle === 'lifetime' || session.mode === 'payment';

    const customerId = (session.customer as string | null) || null;

    if (isLifetime) {
      const paymentIntentId = (session.payment_intent as string | null) || null;

      if (!paymentIntentId) {
        throw new Error('Payment Intent não encontrado na session');
      }

      const { data: existingSubscription } = await supabase
        .from('team_subscriptions')
        .select('id')
        .eq('team_id', teamId)
        .maybeSingle();

      const periodStart = new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000);

      if (existingSubscription) {
        const { error: updateError } = await supabase
          .from('team_subscriptions')
          .update({
            plan_id: planId,
            status: 'active',
            gateway_payment_intent_id: paymentIntentId,
            gateway_customer_id: customerId,
            gateway_subscription_id: null,
            current_period_starts_at: periodStart.toISOString(),
            current_period_ends_at: null,
            trial_ends_at: null,
            canceled_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('team_subscriptions')
          .insert({
            team_id: teamId,
            plan_id: planId,
            status: 'active',
            gateway_payment_intent_id: paymentIntentId,
            gateway_customer_id: customerId,
            gateway_subscription_id: null,
            current_period_starts_at: periodStart.toISOString(),
            current_period_ends_at: null,
            trial_ends_at: null,
          });

        if (insertError) throw insertError;
      }

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        team_id: teamId,
        action: 'SUBSCRIPTION_ACTIVATED',
        table_name: 'team_subscriptions',
        record_id: paymentIntentId,
        new_values: {
          plan_name: plan.display_name,
          stripe_payment_intent_id: paymentIntentId,
          stripe_customer_id: customerId,
          status: 'active',
          lifetime: true,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          status: 'active',
          subscription: {
            id: paymentIntentId,
            plan_name: plan.display_name,
            period_start: periodStart.toISOString(),
            period_end: null,
            billing_cycle: 'lifetime',
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Pagamento confirmado, buscar subscription
    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      throw new Error('Subscription ID não encontrado na session');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    console.log(`✅ Pagamento confirmado - Subscription: ${subscriptionId}`);

    // Verificar se já existe assinatura para a equipe
    const { data: existingSubscription } = await supabase
      .from('team_subscriptions')
      .select('id')
      .eq('team_id', teamId)
      .maybeSingle();

    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    if (existingSubscription) {
      // Atualizar assinatura existente
      const { error: updateError } = await supabase
        .from('team_subscriptions')
        .update({
          plan_id: planId,
          status: 'active',
          gateway_subscription_id: subscriptionId,
          gateway_customer_id: customerId,
          current_period_starts_at: periodStart.toISOString(),
          current_period_ends_at: periodEnd.toISOString(),
          trial_ends_at: null,
          canceled_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id);

      if (updateError) throw updateError;
      console.log(`✅ Assinatura atualizada: ${existingSubscription.id}`);

    } else {
      // Criar nova assinatura
      const { error: insertError } = await supabase
        .from('team_subscriptions')
        .insert({
          team_id: teamId,
          plan_id: planId,
          status: 'active',
          gateway_subscription_id: subscriptionId,
          gateway_customer_id: customerId,
          current_period_starts_at: periodStart.toISOString(),
          current_period_ends_at: periodEnd.toISOString(),
          trial_ends_at: null
        });

      if (insertError) throw insertError;
      console.log(`✅ Nova assinatura criada para team ${teamId}`);
    }

    // Registrar no audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      team_id: teamId,
      action: 'SUBSCRIPTION_ACTIVATED',
      table_name: 'team_subscriptions',
      record_id: subscriptionId,
      new_values: {
        plan_name: plan.display_name,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: 'active',
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString()
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        status: 'active',
        subscription: {
          id: subscriptionId,
          plan_name: plan.display_name,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          billing_cycle: plan.billing_cycle
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erro ao verificar pagamento:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
