import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, Loader2, Shield, Zap, Crown, Star, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { toast } from '@/hooks/use-toast';
import { useStripeCheckoutEnhanced } from '@/hooks/useStripeCheckoutEnhanced';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePlans } from '@/hooks/usePlans';
import { useUserSubscription } from '@/hooks/useUserSubscription';

export default function UpgradePlan() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { createCheckout, isLoading: isCreatingCheckout, error: checkoutError, resetError } = useStripeCheckoutEnhanced();
  const { user } = useAuth();
  const { activeTeam } = useTeam();
  
  // Usar novos hooks
  const { plans, isLoading: plansLoading, error: plansError } = usePlans();
  const { subscription: currentSubscription, isLoading: subscriptionLoading } = useUserSubscription(activeTeam?.id);

  // Check if user is superadmin
  const { data: isSuperAdmin, isLoading: checkingSuperAdmin } = useQuery({
    queryKey: ['is-superadmin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_super_admin');
      if (error) throw error;
      return data as boolean;
    }
  });

  useEffect(() => {
    if (activeTeam) {
      setTeamId(activeTeam.id);
    }
  }, [activeTeam]);

  const getPlanIcon = (planName: string) => {
    if (planName.includes('starter')) return <Zap className="h-8 w-8 text-blue-500" />;
    if (planName.includes('pro')) return <Star className="h-8 w-8 text-purple-500" />;
    if (planName.includes('enterprise')) return <Crown className="h-8 w-8 text-amber-500" />;
    return <Check className="h-8 w-8 text-primary" />;
  };

  const planoAtual = currentSubscription ? plans.find((p) => p.id === currentSubscription.plan_id) : null;
  const maiorOrdem = plans.reduce((max, p) => Math.max(max, p.sort_order ?? 0), 0);
  const estaNoMelhorPlano = !!planoAtual && (planoAtual.sort_order ?? 0) >= maiorOrdem;

  const handleSelectPlan = async (planId: string, planName: string) => {
    // Resetar erro anterior
    resetError();
    
    if (!user) {
      toast({
        title: "Autenticação necessária",
        description: "Você precisa estar logado para assinar um plano.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (!teamId) {
      toast({
        title: "Equipe não encontrada",
        description: "Você precisa estar vinculado a uma equipe.",
        variant: "destructive"
      });
      return;
    }

    // Se for trial, redirecionar para auth
    if (planName.toLowerCase() === 'trial') {
      navigate('/auth');
      return;
    }

    // Verificar se é upgrade ou downgrade
    const ordemSelecionado = plans.find((p) => p.id === planId)?.sort_order ?? 0;
    const ordemAtual = currentSubscription ? (plans.find((p) => p.id === currentSubscription.plan_id)?.sort_order ?? 0) : 0;
    const isUpgrade = !currentSubscription || ordemSelecionado > ordemAtual;

    const confirmed = window.confirm(
      `Deseja ${isUpgrade ? 'fazer upgrade para' : 'mudar para'} o plano ${planName}?\n\n` +
      `Você será redirecionado para o pagamento seguro via Stripe.`
    );

    if (!confirmed) return;

    try {
      await createCheckout({ planId, teamId });
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      // O erro já será tratado pelo hook
    }
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan_id === planId;
  };

  // Estado de erro
  if (plansError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="text-center max-w-md mx-auto p-6">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {plansError.message || 'Erro ao carregar planos. Por favor, tente novamente.'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            size="lg"
          >
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  // Estado de loading
  if (plansLoading || subscriptionLoading || checkingSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando planos disponíveis...</p>
        </div>
      </div>
    );
  }

  // SuperAdmin special view
  if (isSuperAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert className="mb-8 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <Shield className="h-5 w-5 text-purple-600" />
          <AlertTitle className="text-purple-800">Acesso de Super Administrador</AlertTitle>
          <AlertDescription className="text-purple-700">
            Você possui acesso total ao sistema como Super Admin. Esta página é destinada apenas para equipes que precisam gerenciar suas assinaturas.
          </AlertDescription>
        </Alert>
        
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Shield className="h-5 w-5" />
              Privilégios de Super Admin
            </CardTitle>
            <CardDescription className="text-purple-700">
              Como Super Admin, você tem acesso ilimitado a todas as funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-purple-800">
                <Check className="h-4 w-4 text-green-500" />
                <span>Acesso ilimitado a todas as funcionalidades</span>
              </li>
              <li className="flex items-center gap-3 text-purple-800">
                <Check className="h-4 w-4 text-green-500" />
                <span>Gerenciamento de todas as equipes e usuários</span>
              </li>
              <li className="flex items-center gap-3 text-purple-800">
                <Check className="h-4 w-4 text-green-500" />
                <span>Sem restrições de planos ou limites</span>
              </li>
            </ul>
            
            <Button 
              onClick={() => navigate('/app')} 
              variant="outline"
              className="mt-6 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
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
        <div className="max-w-6xl mx-auto">
          {/* Header Contextual */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-primary/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {currentSubscription ? (estaNoMelhorPlano ? 'Você já está no melhor plano' : 'Upgrade de Plano') : 'Escolha seu Plano'}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              {currentSubscription
                ? estaNoMelhorPlano
                  ? 'Se quiser reduzir, escolha um plano abaixo para fazer downgrade.'
                  : 'Faça upgrade para desbloquear mais recursos e crescer sua equipe'
                : 'Gerencie seus eventos sem limites. Faça upgrade a qualquer momento.'}
            </p>
            {checkoutError && (
              <Alert variant="destructive" className="mt-6 text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro ao processar pagamento</AlertTitle>
                <AlertDescription>{checkoutError.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Grid de Planos - Layout responsivo 4 colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 mb-8 sm:mb-12">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group h-fit ${
                  isCurrentPlan(plan.id) 
                    ? 'border-primary shadow-lg scale-100 xl:scale-105 z-10 bg-gradient-to-br from-primary/5 to-primary/10' 
                    : 'border-border hover:border-primary/50 bg-card/50 backdrop-blur-sm'
                }`}
              >
                {isCurrentPlan(plan.id) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-2 py-0.5 text-xs font-semibold shadow-lg">
                      Plano Atual
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="space-y-2 sm:space-y-3 pb-2 sm:pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-1.5 sm:p-2 rounded-lg ${
                      isCurrentPlan(plan.id) 
                        ? 'bg-primary/10 ring-1 ring-primary/20' 
                        : 'bg-muted/50 group-hover:bg-primary/10'
                    } transition-all duration-300`}>
                      {getPlanIcon(plan.name)}
                    </div>
                    {plan.is_popular && !isCurrentPlan(plan.id) && (
                      <Badge variant="secondary" className="text-xs">
                        Recomendado
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base sm:text-lg lg:text-xl font-bold leading-tight">
                      {plan.display_name}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm leading-relaxed line-clamp-2">
                      {plan.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6">
                  {/* Pricing - Compacto */}
                  <div className="text-center py-1 sm:py-2">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        R$ {plan.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        /{plan.billing_cycle === 'monthly' ? 'mês' : plan.billing_cycle === 'annually' ? 'ano' : 'vitalício'}
                      </span>
                    </div>
                    {plan.billing_cycle === 'annually' && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Economize 20%
                      </Badge>
                    )}
                  </div>

                  {/* Features - Todos os recursos visíveis */}
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                        Recursos Inclusos
                      </h4>
                      <ul className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        {(plan.features as string[]).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 group/item">
                            <div className="p-0.5 rounded-full bg-primary/10 group-hover/item:bg-primary/20 transition-colors mt-0.5 flex-shrink-0">
                              <Check className="h-2 w-2 text-primary" />
                            </div>
                            <span className="text-xs leading-relaxed text-left">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Limits - Compacto */}
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <div className="grid gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-primary/60"></div>
                        {plan.limits.max_team_members === null ? (
                          <span className="text-green-600 font-medium">Membros ilimitados</span>
                        ) : (
                          <span>Até <strong>{plan.limits.max_team_members}</strong> membros</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-primary/60"></div>
                        {plan.limits.max_events_per_month === null ? (
                          <span className="text-green-600 font-medium">Eventos ilimitados</span>
                        ) : (
                          <span>Até <strong>{plan.limits.max_events_per_month}</strong> eventos/mês</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-primary/60"></div>
                        {plan.limits.max_personnel === null ? (
                          <span className="text-green-600 font-medium">Pessoal ilimitado</span>
                        ) : (
                          <span>Até <strong>{plan.limits.max_personnel}</strong> cadastros</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 px-3 sm:px-4 lg:px-6">
                  <Button
                    size="sm"
                    className={`w-full h-8 sm:h-10 text-xs sm:text-sm font-semibold transition-all duration-300 ${
                      isCurrentPlan(plan.id) 
                        ? 'bg-secondary text-secondary-foreground' 
                        : plan.is_popular 
                        ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl' 
                        : 'hover:bg-primary/90 hover:shadow-lg'
                    }`}
                    variant={isCurrentPlan(plan.id) ? 'secondary' : plan.is_popular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan.id, plan.display_name)}
                    disabled={isCurrentPlan(plan.id) || isCreatingCheckout}
                  >
                    {isCreatingCheckout ? (
                      <>
                        <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        {isCurrentPlan(plan.id) ? (
                          <>
                            <Check className="mr-1 h-2.5 w-2.5" />
                            Plano Atual
                          </>
                        ) : plan.price === 0 ? (
                          <>
                            <Zap className="mr-1 h-2.5 w-2.5" />
                            Começar Grátis
                          </>
                        ) : (
                          <>
                            <Crown className="mr-1 h-2.5 w-2.5" />
                            Assinar Agora
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
