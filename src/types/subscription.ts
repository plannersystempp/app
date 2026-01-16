export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price: number;
  billing_cycle: 'monthly' | 'annually' | 'lifetime';
  features: string[];
  limits: {
    max_team_members: number | null;
    max_events_per_month: number | null;
    max_personnel: number | null;
  };
  is_active: boolean;
  is_hidden: boolean;
  sort_order: number;
  is_popular?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TeamSubscription {
  id: string;
  team_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'free';
  current_period_ends_at: string;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends TeamSubscription {
  plan: SubscriptionPlan;
}

export interface CheckoutSession {
  url: string;
  sessionId: string;
}

export interface SubscriptionLimits {
  max_team_members: number | null;
  max_events_per_month: number | null;
  max_personnel: number | null;
}

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'free';