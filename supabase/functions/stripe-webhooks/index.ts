import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
});

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return new Response('Webhook Error: Missing signature or secret', { status: 400 });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('Received Stripe webhook event:', event.type);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);

        // Update subscription with Stripe IDs
        if (session.subscription && session.customer) {
          const { error } = await supabaseAdmin
            .from('team_subscriptions')
            .update({
              gateway_customer_id: session.customer as string,
              gateway_subscription_id: session.subscription as string,
              status: 'active',
            })
            .eq('team_id', session.metadata?.team_id);

          if (error) {
            console.error('Error updating subscription:', error);
          } else {
            console.log('Subscription updated with Stripe IDs');
          }

          // Log to audit
          await supabaseAdmin.from('audit_logs').insert({
            team_id: session.metadata?.team_id,
            action: 'STRIPE_CHECKOUT_COMPLETED',
            table_name: 'team_subscriptions',
            new_values: {
              customer_id: session.customer,
              subscription_id: session.subscription,
            },
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice paid:', invoice.id);

        // Update subscription status to active
        if (invoice.subscription) {
          const { data: subRow } = await supabaseAdmin
            .from('team_subscriptions')
            .select('id, subscription_plans(billing_cycle)')
            .eq('gateway_subscription_id', invoice.subscription as string)
            .maybeSingle();

          const billingCycle = (subRow as any)?.subscription_plans?.billing_cycle as string | undefined;
          if (billingCycle === 'lifetime') {
            break;
          }

          const { error } = await supabaseAdmin
            .from('team_subscriptions')
            .update({ status: 'active' })
            .eq('gateway_subscription_id', invoice.subscription as string);

          if (error) {
            console.error('Error updating subscription status:', error);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment failed:', invoice.id);

        // Update subscription status to past_due
        if (invoice.subscription) {
          const { data: subRow } = await supabaseAdmin
            .from('team_subscriptions')
            .select('id, subscription_plans(billing_cycle)')
            .eq('gateway_subscription_id', invoice.subscription as string)
            .maybeSingle();

          const billingCycle = (subRow as any)?.subscription_plans?.billing_cycle as string | undefined;
          if (billingCycle === 'lifetime') {
            break;
          }

          const { error } = await supabaseAdmin
            .from('team_subscriptions')
            .update({ status: 'past_due' })
            .eq('gateway_subscription_id', invoice.subscription as string);

          if (error) {
            console.error('Error updating subscription status:', error);
          }

          // Log to audit
          await supabaseAdmin.from('audit_logs').insert({
            action: 'STRIPE_PAYMENT_FAILED',
            table_name: 'team_subscriptions',
            new_values: {
              invoice_id: invoice.id,
              subscription_id: invoice.subscription,
              amount: invoice.amount_due,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);

        const { data: subRow } = await supabaseAdmin
          .from('team_subscriptions')
          .select('id, subscription_plans(billing_cycle)')
          .eq('gateway_subscription_id', subscription.id)
          .maybeSingle();

        const billingCycle = (subRow as any)?.subscription_plans?.billing_cycle as string | undefined;
        if (billingCycle === 'lifetime') {
          break;
        }

        // Update subscription status
        const statusMap: Record<string, string> = {
          active: 'active',
          past_due: 'past_due',
          canceled: 'canceled',
          unpaid: 'past_due',
          trialing: 'trial',
        };

        const { error } = await supabaseAdmin
          .from('team_subscriptions')
          .update({
            status: statusMap[subscription.status] || subscription.status,
            current_period_starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
          })
          .eq('gateway_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription deleted:', subscription.id);

        const { data: subRow } = await supabaseAdmin
          .from('team_subscriptions')
          .select('id, subscription_plans(billing_cycle)')
          .eq('gateway_subscription_id', subscription.id)
          .maybeSingle();

        const billingCycle = (subRow as any)?.subscription_plans?.billing_cycle as string | undefined;
        if (billingCycle === 'lifetime') {
          break;
        }

        // Update subscription status to canceled
        const { error } = await supabaseAdmin
          .from('team_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('gateway_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        }

        // Log to audit
        await supabaseAdmin.from('audit_logs').insert({
          action: 'STRIPE_SUBSCRIPTION_DELETED',
          table_name: 'team_subscriptions',
          new_values: {
            subscription_id: subscription.id,
          },
        });
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  }
});
