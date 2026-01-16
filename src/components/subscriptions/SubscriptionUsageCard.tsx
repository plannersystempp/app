import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Calendar, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UsageData {
  team_members: { current: number; limit: number | null; percentage: number };
  events: { current: number; limit: number | null; percentage: number };
  personnel: { current: number; limit: number | null; percentage: number };
}

interface SubscriptionUsageCardProps {
  usage: UsageData;
  className?: string;
  loading?: boolean;
}

export function SubscriptionUsageCard({ usage, className, loading = false }: SubscriptionUsageCardProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit: number | null) => {
    return limit === null ? '∞' : limit.toString();
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-6 w-20" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Uso do Plano
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Membros da Equipe */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Membros da Equipe</span>
            </div>
            <span className="font-medium">
              {usage.team_members.current} / {formatLimit(usage.team_members.limit)}
            </span>
          </div>
          <Progress 
            value={usage.team_members.percentage} 
            className={`h-2 ${getProgressColor(usage.team_members.percentage)}`}
          />
        </div>

        {/* Eventos por Mês */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Eventos por Mês</span>
            </div>
            <span className="font-medium">
              {usage.events.current} / {formatLimit(usage.events.limit)}
            </span>
          </div>
          <Progress 
            value={usage.events.percentage} 
            className={`h-2 ${getProgressColor(usage.events.percentage)}`}
          />
        </div>

        {/* Cadastros de Pessoal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>Cadastros de Pessoal</span>
            </div>
            <span className="font-medium">
              {usage.personnel.current} / {formatLimit(usage.personnel.limit)}
            </span>
          </div>
          <Progress 
            value={usage.personnel.percentage} 
            className={`h-2 ${getProgressColor(usage.personnel.percentage)}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}