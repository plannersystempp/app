import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/contexts/TeamContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubscriptionStatusBadge } from '@/components/shared/SubscriptionStatusBadge';
import { Loader2, Shield, AlertCircle, TrendingUp, Eye, MessageCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDateShort } from '@/utils/dateUtils';
import { SubscriptionStatusCard } from '@/components/subscriptions/SubscriptionStatusCard';
import { SubscriptionUsageCard } from '@/components/subscriptions/SubscriptionUsageCard';
import { SubscriptionActions } from '@/components/subscriptions/SubscriptionActions';
import { useUserSubscription, useSubscriptionLimits } from '@/hooks/useUserSubscription';
import { usePaymentHistory } from '@/hooks/usePaymentStatus';
import { company } from '@/config/company';

interface SubscriptionData {
  plan_name: string;
  status: string;
  current_period_ends_at: string | null;
  trial_ends_at: string | null;
  billing_cycle?: string | null;
  is_lifetime?: boolean;
  limits: {
    max_team_members: number | null;
    max_events_per_month: number | null;
    max_personnel: number | null;
  };
}

interface UsageData {
  team_members: { current: number; limit: number | null; percentage: number };
  events: { current: number; limit: number | null; percentage: number };
  personnel: { current: number; limit: number | null; percentage: number };
}

export default function ManageSubscription() {
  const navigate = useNavigate();
  const { activeTeam } = useTeam();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  
  // Usar novos hooks
  const { subscription, isLoading: subscriptionLoading, error: subscriptionError, refetch: refetchSubscription } = useUserSubscription(activeTeam?.id);
  const { data: limits, isLoading: limitsLoading } = useSubscriptionLimits(activeTeam?.id);

  // Check if user is superadmin
  const { data: isSuperAdmin, isLoading: checkingSuperAdmin } = useQuery({
    queryKey: ['is-superadmin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_super_admin');
      if (error) return false;
      return data as boolean;
    },
    retry: false
  });

  const paymentsTeamId = isSuperAdmin ? activeTeam?.id : undefined;
  const { payments, isLoading: paymentsLoading, error: paymentsError } = usePaymentHistory({ teamId: paymentsTeamId, limit: 5 });

  useEffect(() => {
    if (activeTeam && limits && !isSuperAdmin) {
      loadUsageData(activeTeam.id);
    }
  }, [activeTeam, limits, isSuperAdmin]);



  const loadUsageData = async (teamId: string) => {
    if (!limits) {
      console.warn('Limites não disponíveis, ignorando carregamento de dados de uso');
      return;
    }
    
    try {
      setLoadingUsage(true);
      
      // Buscar contagem de membros
      const { count: membersCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'approved');

      // Buscar contagem de eventos do mês
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .gte('created_at', startOfMonth);

      // Buscar contagem de pessoal
      const { count: personnelCount } = await supabase
        .from('personnel')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      setUsage({
        team_members: {
          current: membersCount || 0,
          limit: limits?.maxTeamMembers ?? null,
          percentage: limits?.maxTeamMembers ? Math.min(((membersCount || 0) / limits?.maxTeamMembers) * 100, 100) : 0
        },
        events: {
          current: eventsCount || 0,
          limit: limits?.events ?? null,
          percentage: limits?.events ? Math.min(((eventsCount || 0) / limits?.events) * 100, 100) : 0
        },
        personnel: {
          current: personnelCount || 0,
          limit: limits?.personnel ?? null,
          percentage: limits?.personnel ? Math.min(((personnelCount || 0) / limits?.personnel) * 100, 100) : 0
        }
      });
    } catch (error) {
      console.error('Erro ao carregar dados de uso:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar dados de uso',
        variant: 'destructive'
      });
    } finally {
      setLoadingUsage(false);
    }
  };

  // Estado de erro
  if (subscriptionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar assinatura</AlertTitle>
            <AlertDescription>
              {subscriptionError instanceof Error ? subscriptionError.message : 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => refetchSubscription()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
            <Button onClick={() => navigate('/app')} variant="ghost">
              Voltar para Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Estado de loading
  if (subscriptionLoading || checkingSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando informações da assinatura...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SuperAdmin special view
  if (isSuperAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertTitle>Acesso de Super Administrador</AlertTitle>
          <AlertDescription>
            Como Super Admin, você não possui uma assinatura pessoal. Você tem acesso ilimitado a todas as funcionalidades do sistema.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Privilégios de Super Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Acesso ilimitado a todas as funcionalidades</span>
              </li>
              <li className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span>Gerenciamento de todas as equipes e usuários</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <span>Sem restrições de planos ou limites</span>
              </li>
            </ul>
            
            <Button 
              onClick={() => navigate('/app')} 
              variant="outline"
              className="mt-6"
            >
              Voltar para Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="hover:bg-primary/10"
              >
                Voltar
              </Button>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Gerenciar Assinatura
              </h1>
              <p className="text-muted-foreground">
                Visualize e controle sua assinatura do PlannerSystem
              </p>
            </div>
          </div>

          {!subscription ? (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Nenhuma assinatura encontrada</h2>
                <p className="text-muted-foreground mb-4">
                  Você ainda não possui uma assinatura ativa.
                </p>
                <Button onClick={() => navigate('/app/upgrade')}>
                  Ver Planos Disponíveis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna Principal */}
              <div className="lg:col-span-2 space-y-6">
                {/* Status da Assinatura */}
                <SubscriptionStatusCard 
                  planName={subscription.subscription_plans?.display_name || 'Plano Atual'}
                  status={subscription.status}
                  currentPeriodEnds={subscription.current_period_ends_at}
                  trialEnds={subscription.trial_ends_at}
                  isLifetime={false}
                />

                {/* Uso do Plano */}
                {usage && limits && (
                  <SubscriptionUsageCard 
                    usage={usage}
                    loading={loadingUsage}
                  />
                )}

                {/* Informações do Plano */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhes do Plano</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {limitsLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
                          <div className="text-2xl font-bold text-primary mb-1">
                            <div className="animate-pulse bg-primary/20 h-8 w-12 mx-auto rounded"></div>
                          </div>
                          <div className="text-sm text-muted-foreground">Membros</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            <div className="animate-pulse bg-blue-200 h-8 w-12 mx-auto rounded"></div>
                          </div>
                          <div className="text-sm text-muted-foreground">Eventos/mês</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            <div className="animate-pulse bg-green-200 h-8 w-12 mx-auto rounded"></div>
                          </div>
                          <div className="text-sm text-muted-foreground">Pessoal</div>
                        </div>
                      </div>
                    ) : limits ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
                          <div className="text-2xl font-bold text-primary mb-1">
                            {limits?.maxTeamMembers === null ? '∞' : limits?.maxTeamMembers || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Membros</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {limits?.events === null ? '∞' : limits?.events || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Eventos/mês</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            {limits?.personnel === null ? '∞' : limits?.personnel || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Pessoal</div>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Ações Rápidas */}
                <SubscriptionActions 
                  subscription={subscription}
                  onUpdate={refetchSubscription}
                />

                {/* Histórico de Pagamentos */}
                {payments && payments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Últimos Pagamentos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                          <div>
                            <p className="font-medium">{formatDateShort(payment.created)}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.amount} {payment.currency?.toUpperCase()}
                            </p>
                          </div>
                          <Badge 
                            variant={payment.status === 'succeeded' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {payment.status === 'succeeded' ? 'Pago' : 'Falhou'}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Suporte */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Precisa de Ajuda?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(company.contact.whatsapp.link, '_blank')}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp Suporte
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => window.location.href = `mailto:${company.contact.email}`}
                    >
                      Email de Suporte
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
