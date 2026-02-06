
import React, { useRef, useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { ScrollNavigationButtons } from './shared/ScrollNavigationButtons';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import { useTeam } from '@/contexts/TeamContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { SkipToContent } from '@/components/a11y/SkipToContent';
import { AppMobileBottomNav } from '@/components/shared/AppMobileBottomNav';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const mainRef = useRef<HTMLElement>(null);
  const { showScrollToTop, scrollToTop } = 
    useScrollNavigation(mainRef);
  const { activeTeam } = useTeam();

  // Check if user is superadmin
  const { data: isSuperAdmin } = useQuery({
    queryKey: ['is-superadmin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_super_admin');
      if (error) throw error;
      return data as boolean;
    }
  });

  const { data: subscription } = useQuery({
    queryKey: ['team-subscription', activeTeam?.id],
    queryFn: async () => {
      if (!activeTeam?.id) return null;

      const { data, error } = await supabase
        .from('team_subscriptions')
        .select(`
          status,
          plan_id,
          subscription_plans(display_name, billing_cycle)
        `)
        .eq('team_id', activeTeam.id)
        .single();

      if (error) {
        console.error('Erro ao buscar assinatura:', error);
        return null;
      }

      const nestedPlan = (data.subscription_plans as any) || null;
      let planName = nestedPlan?.display_name;
      let billingCycle = nestedPlan?.billing_cycle;

      // Fallback: se o join não trouxe o plano, buscar direto por plan_id
      if ((!planName || !billingCycle) && data.plan_id) {
        const { data: planRow } = await supabase
          .from('subscription_plans')
          .select('display_name, billing_cycle')
          .eq('id', data.plan_id)
          .single();
        if (planRow) {
          planName = planRow.display_name || planName;
          billingCycle = planRow.billing_cycle || billingCycle;
        }
      }

      // Planos vitalícios ou status free devem ser mostrados como Plano Vitalício
      const isLifetime = (billingCycle === 'lifetime') || (data.status === 'free');
      if (isLifetime) {
        planName = 'Plano Vitalício';
      } else if (!planName) {
        planName = data.plan_id ? 'Assinante' : 'Free';
      }

      return {
        status: data.status,
        planName,
        isLifetime
      };
    },
    enabled: !!activeTeam?.id && !isSuperAdmin
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col relative">
          {/* Link de pular para o conteúdo principal (a11y) */}
          <SkipToContent />
          <header role="banner" className="h-14 border-b bg-background">
            <div className="ps-container h-14 flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex-1" />

              {isSuperAdmin ? (
                <Badge variant="destructive" className="flex items-center gap-1" aria-live="polite" aria-atomic="true">
                  <Shield className="w-3 h-3" />
                  Super Admin
                </Badge>
              ) : subscription && (
                <Badge variant="outline" className="flex items-center gap-1" aria-live="polite" aria-atomic="true">
                  <Crown className="w-3 h-3" />
                  {subscription.planName}
                </Badge>
              )}
            </div>
          </header>
          <main
            id="conteudo-principal"
            role="main"
            aria-label="Conteúdo principal"
            tabIndex={-1}
            ref={mainRef}
            className="flex-1 min-h-0 overflow-y-auto"
          >
            <div className="w-full ps-container py-3 sm:py-4 md:py-6 pb-20 md:pb-6">
              {children}
            </div>
          </main>
          <ScrollNavigationButtons 
            showScrollToTop={showScrollToTop}
            scrollToTop={scrollToTop}
          />
          {/* Menu inferior móvel com rotas principais */}
          <AppMobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
};
