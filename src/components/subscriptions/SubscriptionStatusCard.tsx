import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, Clock } from 'lucide-react';
import { SubscriptionStatusBadge } from '@/components/shared/SubscriptionStatusBadge';
import { formatDateShort } from '@/utils/dateUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface SubscriptionStatusCardProps {
  planName: string;
  status: string;
  currentPeriodEnds: string | null;
  trialEnds: string | null;
  isLifetime: boolean;
  className?: string;
  loading?: boolean;
}

export function SubscriptionStatusCard({ 
  planName, 
  status, 
  currentPeriodEnds, 
  trialEnds, 
  isLifetime,
  className,
  loading = false 
}: SubscriptionStatusCardProps) {
  const getStatusInfo = () => {
    if (isLifetime) {
      return {
        icon: <CreditCard className="h-5 w-5 text-green-600" />,
        text: 'Sem renovação',
        description: 'Acesso vitalício ao plano'
      };
    }
    
    if (trialEnds) {
      return {
        icon: <Clock className="h-5 w-5 text-blue-600" />,
        text: `Trial expira em: ${formatDateShort(trialEnds)}`,
        description: 'Período de teste gratuito'
      };
    }
    
    if (currentPeriodEnds) {
      return {
        icon: <Calendar className="h-5 w-5 text-primary" />,
        text: `Renovação em: ${formatDateShort(currentPeriodEnds)}`,
        description: 'Próxima cobrança programada'
      };
    }
    
    return {
      icon: <CreditCard className="h-5 w-5 text-muted-foreground" />,
      text: 'Status indefinido',
      description: 'Entre em contato com o suporte'
    };
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-6 w-20" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-5" />
          </div>
          <div className="border-t pt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Plano Atual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{planName}</p>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span>Status:</span>
              <SubscriptionStatusBadge status={status as any} />
            </div>
          </div>
          {statusInfo.icon}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            {statusInfo.icon}
            <span className="text-sm">{statusInfo.text}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{statusInfo.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}