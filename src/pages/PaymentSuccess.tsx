import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVerifyPayment } from '@/hooks/useVerifyPayment';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { mutate: verifyPayment } = useVerifyPayment();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const planId = searchParams.get('plan');
    const teamId = searchParams.get('team');
    
    if (!sessionId || !planId || !teamId) {
      setVerificationStatus('error');
      setErrorMessage('Parâmetros inválidos na URL');
      return;
    }

    supabase
      .rpc('is_super_admin')
      .then(({ data, error }) => {
        if (!error && data) {
          navigate('/app');
        }
      })
      .catch(() => {
        return;
      });

    // Aguardar 2 segundos para dar tempo do Stripe processar
    const timer = setTimeout(() => {
      verifyPayment(
        { sessionId, teamId, planId },
        {
          onSuccess: async (data) => {
            if (data.success) {
              // Buscar detalhes do plano
              const { data: plan } = await supabase
                .from('subscription_plans')
                .select('display_name, price, features, billing_cycle')
                .eq('id', planId)
                .single();

              setSubscriptionDetails({
                ...data.subscription,
                plan_details: plan
              });
              setVerificationStatus('success');
            } else {
              setVerificationStatus('error');
              setErrorMessage(data.message || 'Pagamento ainda não foi confirmado');
            }
          },
          onError: (error: Error) => {
            console.error('Erro ao verificar pagamento:', error);
            setVerificationStatus('error');
            setErrorMessage(error.message);
          }
        }
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams, verifyPayment]);

  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-semibold">Confirmando seu pagamento...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Aguarde enquanto ativamos sua assinatura
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Erro ao Confirmar Pagamento</CardTitle>
            <CardDescription>
              Não foi possível confirmar seu pagamento no momento
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                {errorMessage || 'Ocorreu um erro desconhecido'}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Por favor, entre em contato com o suporte ou tente novamente.
              </p>

              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/plans')}
              >
                Voltar para Planos
              </Button>

              <Button
                size="lg"
                className="w-full"
                onClick={() => navigate('/app')}
              >
                Ir para o Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
          <CardDescription>
            Sua assinatura foi ativada com sucesso
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {subscriptionDetails && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">
                {subscriptionDetails.plan_name}
              </h3>
              {subscriptionDetails.plan_details && (
                <>
                  <p className="text-2xl font-bold text-primary">
                    {subscriptionDetails.plan_details.billing_cycle === 'lifetime'
                      ? `R$ ${subscriptionDetails.plan_details.price.toFixed(2)} (pagamento único)`
                      : subscriptionDetails.plan_details.billing_cycle === 'yearly'
                        ? `R$ ${subscriptionDetails.plan_details.price.toFixed(2)}/ano`
                        : `R$ ${subscriptionDetails.plan_details.price.toFixed(2)}/mês`}
                  </p>
                  
                  {subscriptionDetails.plan_details.features?.length > 0 && (
                    <ul className="text-sm space-y-1 mt-3">
                      {subscriptionDetails.plan_details.features.slice(0, 3).map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-center text-muted-foreground">
              Você já pode começar a usar todos os recursos do seu plano!
            </p>

            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate('/app')}
            >
              Ir para o Dashboard
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/app/settings')}
            >
              Gerenciar Assinatura
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>Você receberá um email de confirmação com os detalhes da sua assinatura.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
