import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ehPlanoEnterprise } from '@/utils/assinaturaUtils';

interface SubscriptionActionsProps {
  className?: string;
  subscription?: any;
  onUpdate?: () => void;
}

export function SubscriptionActions({ className, subscription }: SubscriptionActionsProps) {
  const navigate = useNavigate();
  const nomePlano = subscription?.subscription_plans?.name || subscription?.subscription_plans?.display_name || '';
  const isEnterprise = ehPlanoEnterprise(nomePlano);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Ações Disponíveis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEnterprise ? (
          <Button className="w-full" onClick={() => navigate('/app/plans')} size="sm" variant="outline">
            <TrendingDown className="mr-2 h-4 w-4" />
            Fazer Downgrade do Plano
          </Button>
        ) : (
          <Button className="w-full" onClick={() => navigate('/app/upgrade')} size="sm">
            <TrendingUp className="mr-2 h-4 w-4" />
            Fazer Upgrade do Plano
          </Button>
        )}
        <Button 
          className="w-full" 
          variant="outline"
          onClick={() => navigate('/app/plans')}
          size="sm"
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver Todos os Planos
        </Button>
        {isEnterprise && (
          <p className="text-xs text-muted-foreground text-center">
            Você já está no melhor plano disponível.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
