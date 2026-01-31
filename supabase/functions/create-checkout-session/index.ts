import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  planId: string;
  teamId: string;
  successUrl?: string;
  cancelUrl?: string;
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
    const { planId, teamId, successUrl, cancelUrl }: CheckoutRequest = await req.json();

    console.log(`📥 Request recebido: planId=${planId}, teamId=${teamId}`);

    // Validações
    if (!planId || !teamId) {
      console.error('❌ Erro: planId ou teamId ausente');
      return new Response(
        JSON.stringify({ error: 'planId e teamId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados do plano
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error('❌ Plano não encontrado:', planError);
      throw new Error('Plano não encontrado');
    }

    console.log(`📋 Plano encontrado: ${plan.display_name} (stripe_price_id: ${plan.stripe_price_id || 'NULL'})`);

    // Validar se plano tem stripe_price_id
    if (!plan.stripe_price_id) {
      console.error(`❌ Plano "${plan.display_name}" não tem stripe_price_id configurado`);
      return new Response(
        JSON.stringify({ 
          error: 'Este plano ainda não está disponível para pagamento',
          details: `O plano "${plan.display_name}" precisa ter um stripe_price_id configurado no banco de dados`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados da equipe
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('name, owner_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      throw new Error('Equipe não encontrada');
    }

    // Verificar se usuário é owner da equipe
    if (team.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Apenas o dono da equipe pode assinar planos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar ou criar Customer no Stripe
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, name')
      .eq('user_id', user.id)
      .single();

    const customerEmail = userProfile?.email || user.email;
    const customerName = userProfile?.name || team.name;

    // Verificar se já existe customer
    let customerId: string | undefined;
    const { data: existingSubscription } = await supabase
      .from('team_subscriptions')
      .select('gateway_customer_id')
      .eq('team_id', teamId)
      .not('gateway_customer_id', 'is', null)
      .maybeSingle();

    if (existingSubscription?.gateway_customer_id) {
      customerId = existingSubscription.gateway_customer_id;
    } else {
      // Criar novo customer
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          team_id: teamId,
          user_id: user.id,
          planner_team_name: team.name
        }
      });
      customerId = customer.id;
    }

    console.log(`📧 Customer: ${customerId} | Email: ${customerEmail}`);

    // URL base para redirecionamento (apenas usado como fallback)
    const defaultBaseUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'http://localhost:8080';

    // Criar Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${defaultBaseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}&team=${teamId}`,
      cancel_url: cancelUrl || `${defaultBaseUrl}/plans?payment=canceled`,
      metadata: {
        team_id: teamId,
        plan_id: planId,
        user_id: user.id,
        plan_name: plan.name
      },
      subscription_data: {
        metadata: {
          team_id: teamId,
          plan_id: planId,
          plan_name: plan.name
        }
      },
      client_reference_id: teamId,
      billing_address_collection: 'required',
      allow_promotion_codes: true,
    });

    console.log(`✅ Checkout Session criada: ${session.id}`);

    // Log de auditoria
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        team_id: teamId,
        action: 'CHECKOUT_SESSION_CREATED',
        table_name: 'team_subscriptions',
        record_id: session.id,
        new_values: {
          plan_id: planId,
          plan_name: plan.display_name,
          stripe_session_id: session.id,
          customer_id: customerId
        }
      });
    } catch (auditError) {
      console.error('⚠️ Erro ao registrar audit log:', auditError);
      // Não interromper o fluxo se o log falhar, pois a sessão já foi criada no Stripe
    }

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erro ao criar checkout session:', error);

    // Mapear erros comuns do Stripe para respostas mais claras
    const stripeError: any = error;
    let status = 500;
    let body: Record<string, unknown> = { error: 'Erro desconhecido' };

    // price_id inexistente ou inválido
    if (stripeError?.raw?.code === 'resource_missing' && stripeError?.raw?.param === 'line_items[0][price]') {
      status = 400;
      body = {
        error: 'Preço do Stripe inválido',
        details: 'O stripe_price_id configurado para este plano não existe no Stripe. Atualize o campo stripe_price_id no plano para um Price válido do mesmo ambiente (test/live) do STRIPE_SECRET_KEY.',
        stripe_message: stripeError?.raw?.message,
        stripe_request_id: stripeError?.raw?.requestId || stripeError?.raw?.request_id,
      };
    } else if (stripeError?.statusCode === 400) {
      status = 400;
      body = {
        error: 'Requisição inválida ao Stripe',
        details: stripeError?.raw?.message || 'Verifique os dados enviados para o Stripe',
      };
    } else if (error instanceof Error) {
      body = { error: error.message };
    }

    return new Response(
      JSON.stringify(body),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
