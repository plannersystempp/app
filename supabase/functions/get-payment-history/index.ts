import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { teamId, limit = 5 } = await req.json();

    if (!teamId) {
      return new Response(
        JSON.stringify({ error: 'Missing teamId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is member of the team
    const { data: member, error: memberError } = await supabaseClient
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Not a team member' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription details from database
    const { data: subscription, error: subError } = await supabaseClient
      .from('team_subscriptions')
      .select('gateway_customer_id, gateway_subscription_id')
      .eq('team_id', teamId)
      .single();

    if (subError || !subscription) {
      // It's okay if no subscription found, just return empty payments
      return new Response(
        JSON.stringify({ payments: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no Stripe customer ID, return empty list
    if (!subscription.gateway_customer_id) {
      return new Response(
        JSON.stringify({ payments: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    console.log(`Fetching payments for customer: ${subscription.gateway_customer_id}`);

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.gateway_customer_id,
      limit: limit,
      status: 'paid', // Only show paid invoices
    });

    // Format response
    const payments = invoices.data.map((invoice: any) => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      status: invoice.status === 'paid' ? 'succeeded' : invoice.status,
      created: new Date(invoice.created * 1000).toISOString(),
      invoice_url: invoice.hosted_invoice_url,
      pdf_url: invoice.invoice_pdf,
    }));

    return new Response(JSON.stringify({ payments }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
