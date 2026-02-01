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

class HttpError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(params: { status: number; code: string; message: string; details?: Record<string, unknown> }) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

function jsonResponse(status: number, body: Record<string, unknown>, requestId: string) {
  return new Response(JSON.stringify({ ...body, request_id: requestId }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    if (req.method !== 'POST') {
      return jsonResponse(405, { error: 'Método não suportado', code: 'METHOD_NOT_ALLOWED' }, requestId);
    }

    // Inicializar Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error(JSON.stringify({ level: 'error', requestId, event: 'STRIPE_CONFIG_MISSING' }));
      return jsonResponse(
        500,
        { error: 'Configuração de pagamento indisponível. Tente novamente mais tarde.', code: 'STRIPE_CONFIG_MISSING' },
        requestId
      );
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Inicializar Supabase Admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(JSON.stringify({ level: 'error', requestId, event: 'SUPABASE_CONFIG_MISSING' }));
      return jsonResponse(
        500,
        { error: 'Configuração interna indisponível. Tente novamente mais tarde.', code: 'SUPABASE_CONFIG_MISSING' },
        requestId
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, { error: 'Usuário não autenticado', code: 'UNAUTHENTICATED' }, requestId);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return jsonResponse(401, { error: 'Token inválido', code: 'INVALID_TOKEN' }, requestId);
    }

    // Parse do corpo da requisição
    let payload: CheckoutRequest;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse(400, { error: 'JSON inválido no corpo da requisição', code: 'INVALID_JSON' }, requestId);
    }

    const { planId, teamId, successUrl, cancelUrl } = payload;

    console.log(JSON.stringify({ level: 'info', requestId, event: 'CHECKOUT_REQUEST', planId, teamId, userId: user.id }));

    // Validações
    if (!planId || !teamId) {
      return jsonResponse(400, { error: 'planId e teamId são obrigatórios', code: 'MISSING_PARAMS' }, requestId);
    }

    // Buscar dados do plano
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error(JSON.stringify({ level: 'warn', requestId, event: 'PLAN_NOT_FOUND', planId, planError }));
      return jsonResponse(404, { error: 'Plano não encontrado', code: 'PLAN_NOT_FOUND' }, requestId);
    }

    console.log(`📋 Plano encontrado: ${plan.display_name} (stripe_price_id: ${plan.stripe_price_id || 'NULL'})`);

    // Validar se plano tem stripe_price_id
    if (!plan.stripe_price_id) {
      return jsonResponse(
        400,
        {
          error: 'Este plano ainda não está disponível para pagamento',
          code: 'PLAN_NOT_CONFIGURED',
          details: `O plano "${plan.display_name}" precisa ter um stripe_price_id configurado no banco de dados`,
        },
        requestId
      );
    }

    // Buscar dados da equipe
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('name, owner_id, is_system')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error(JSON.stringify({ level: 'warn', requestId, event: 'TEAM_NOT_FOUND', teamId, teamError }));
      return jsonResponse(404, { error: 'Equipe não encontrada', code: 'TEAM_NOT_FOUND' }, requestId);
    }

    if (team.is_system) {
      return jsonResponse(
        400,
        { error: 'Este time não pode assinar planos', code: 'SYSTEM_TEAM_NOT_ALLOWED' },
        requestId
      );
    }

    const { data: requesterProfile, error: requesterProfileError } = await supabase
      .from('user_profiles')
      .select('email, name, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (requesterProfileError) {
      console.error(JSON.stringify({ level: 'warn', requestId, event: 'REQUESTER_PROFILE_ERROR', requesterProfileError }));
    }

    const isSuperadmin = requesterProfile?.role === 'superadmin';

    let isTeamAdmin = false;
    if (!isSuperadmin) {
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('role, status')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (membershipError) {
        console.error(JSON.stringify({ level: 'warn', requestId, event: 'MEMBERSHIP_CHECK_ERROR', membershipError }));
      }

      isTeamAdmin = membership?.role === 'admin';
    }

    const canManageBilling = isSuperadmin || isTeamAdmin || team.owner_id === user.id;
    if (!canManageBilling) {
      return jsonResponse(
        403,
        { error: 'Você não tem permissão para assinar planos deste time', code: 'FORBIDDEN' },
        requestId
      );
    }

    // Buscar ou criar Customer no Stripe
    const customerEmail = requesterProfile?.email || user.email;
    const customerName = requesterProfile?.name || team.name;

    // Verificar se já existe customer
    let customerId: string | undefined;
    const { data: existingSubscription, error: existingSubscriptionError } = await supabase
      .from('team_subscriptions')
      .select('id, gateway_customer_id')
      .eq('team_id', teamId)
      .maybeSingle();

    if (existingSubscriptionError) {
      console.error(JSON.stringify({ level: 'warn', requestId, event: 'SUBSCRIPTION_LOOKUP_ERROR', existingSubscriptionError }));
    }

    if (existingSubscription?.gateway_customer_id) {
      customerId = existingSubscription.gateway_customer_id;
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if (
          !existingCustomer ||
          (typeof existingCustomer === 'object' &&
            existingCustomer !== null &&
            'deleted' in existingCustomer &&
            Boolean((existingCustomer as { deleted?: boolean }).deleted))
        ) {
          customerId = undefined;
        }
      } catch {
        customerId = undefined;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          team_id: teamId,
          user_id: user.id,
          planner_team_name: team.name,
        },
      });
      customerId = customer.id;

      if (existingSubscription?.id) {
        const { error: updateCustomerError } = await supabase
          .from('team_subscriptions')
          .update({ gateway_customer_id: customerId, updated_at: new Date().toISOString() })
          .eq('id', existingSubscription.id);

        if (updateCustomerError) {
          console.error(
            JSON.stringify({ level: 'warn', requestId, event: 'SUBSCRIPTION_CUSTOMER_UPDATE_ERROR', updateCustomerError })
          );
        }
      }
    }

    console.log(JSON.stringify({ level: 'info', requestId, event: 'STRIPE_CUSTOMER_RESOLVED', customerId, customerEmail }));

    // URL base para redirecionamento (apenas usado como fallback)
    const defaultBaseUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'http://localhost:8080';

    const createSession = async (resolvedCustomerId: string) => {
      return stripe.checkout.sessions.create({
        customer: resolvedCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripe_price_id,
            quantity: 1,
          },
        ],
        success_url:
          successUrl ||
          `${defaultBaseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}&team=${teamId}`,
        cancel_url: cancelUrl || `${defaultBaseUrl}/plans?payment=canceled`,
        metadata: {
          team_id: teamId,
          plan_id: planId,
          user_id: user.id,
          plan_name: plan.name,
        },
        subscription_data: {
          metadata: {
            team_id: teamId,
            plan_id: planId,
            plan_name: plan.name,
          },
        },
        client_reference_id: teamId,
        billing_address_collection: 'required',
        allow_promotion_codes: true,
      });
    };

    let session;
    try {
      session = await createSession(customerId);
    } catch (e) {
      const stripeLikeError = e as { raw?: { code?: string; param?: string } };
      const raw = stripeLikeError?.raw;
      const isMissingCustomer = raw?.code === 'resource_missing' && raw?.param === 'customer';
      if (!isMissingCustomer) {
        throw e;
      }

      const newCustomer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          team_id: teamId,
          user_id: user.id,
          planner_team_name: team.name,
        },
      });
      customerId = newCustomer.id;

      if (existingSubscription?.id) {
        const { error: updateCustomerError } = await supabase
          .from('team_subscriptions')
          .update({ gateway_customer_id: customerId, updated_at: new Date().toISOString() })
          .eq('id', existingSubscription.id);

        if (updateCustomerError) {
          console.error(
            JSON.stringify({ level: 'warn', requestId, event: 'SUBSCRIPTION_CUSTOMER_UPDATE_ERROR', updateCustomerError })
          );
        }
      }

      session = await createSession(customerId);
    }

    console.log(JSON.stringify({ level: 'info', requestId, event: 'CHECKOUT_SESSION_CREATED', sessionId: session.id }));

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

    return jsonResponse(200, { url: session.url, sessionId: session.id }, requestId);

  } catch (error) {
    console.error(JSON.stringify({ level: 'error', requestId, event: 'CHECKOUT_ERROR', error: String(error) }));

    if (error instanceof HttpError) {
      return jsonResponse(
        error.status,
        { error: error.message, code: error.code, ...(error.details ? { details: error.details } : {}) },
        requestId
      );
    }

    const stripeError = error as {
      raw?: {
        code?: string;
        param?: string;
        requestId?: string;
        request_id?: string;
        message?: string;
      };
      statusCode?: number;
    };
    const stripeRaw = stripeError?.raw;

    if (stripeRaw?.code === 'resource_missing' && stripeRaw?.param === 'line_items[0][price]') {
      return jsonResponse(
        400,
        {
          error: 'Preço do Stripe inválido',
          code: 'STRIPE_PRICE_INVALID',
          details:
            'O stripe_price_id configurado para este plano não existe no Stripe. Atualize o campo stripe_price_id no plano para um Price válido do mesmo ambiente (test/live) do STRIPE_SECRET_KEY.',
          stripe_request_id: stripeRaw?.requestId || stripeRaw?.request_id,
        },
        requestId
      );
    }

    if (stripeError?.statusCode === 400) {
      return jsonResponse(
        400,
        {
          error: 'Requisição inválida ao Stripe',
          code: 'STRIPE_BAD_REQUEST',
          details: stripeRaw?.message || 'Verifique os dados enviados para o Stripe',
          stripe_request_id: stripeRaw?.requestId || stripeRaw?.request_id,
        },
        requestId
      );
    }

    return jsonResponse(
      500,
      {
        error: 'Falha ao iniciar o checkout. Tente novamente em alguns instantes.',
        code: 'CHECKOUT_FAILED',
        stripe_request_id: stripeRaw?.requestId || stripeRaw?.request_id,
      },
      requestId
    );
  }
});
