ALTER TABLE public.team_subscriptions
ALTER COLUMN current_period_ends_at DROP NOT NULL;

UPDATE public.team_subscriptions ts
SET
  status = 'active',
  trial_ends_at = NULL,
  current_period_ends_at = NULL,
  canceled_at = NULL,
  updated_at = now()
FROM public.subscription_plans sp
WHERE sp.id = ts.plan_id
  AND sp.billing_cycle = 'lifetime';
