
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';

type StatusType = 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' | 'concluido_pagamento_pendente';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  showLabel?: boolean; // permite ocultar label em espaços reduzidos
  compact?: boolean; // aplica "hidden sm:inline" no label
  labelOverride?: string; // opcional para sobrescrever o texto
  size?: 'sm' | 'md'; // controla tamanho do ícone e padding do badge
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  showLabel = true,
  compact = true,
  labelOverride,
  size = 'md',
}) => {
  const config: Record<StatusType, { label: string; icon: React.ElementType; className: string }> = {
    planejado: {
      label: 'Planejado',
      icon: Clock,
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
    },
    em_andamento: {
      label: 'Em Andamento',
      icon: AlertCircle,
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
    },
    concluido: {
      label: 'Concluído',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
    },
    cancelado: {
      label: 'Cancelado',
      icon: AlertCircle,
      className: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    },
    concluido_pagamento_pendente: {
      label: 'Pagamento Pendente',
      icon: DollarSign,
      className: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
    },
  };

  const chosen = config[status];
  const label = labelOverride ?? chosen.label;
  const isEmAndamento = status === 'em_andamento';
  const effectiveSize = size === 'md' && isEmAndamento ? 'sm' : size;
  const labelClass = compact ? (isEmAndamento ? 'ml-1 hidden md:inline' : 'ml-1 hidden md:inline') : 'ml-1';
  const iconSizeClass = effectiveSize === 'sm' ? 'h-2.5 w-2.5' : 'h-4 w-4';
  const paddingClass = effectiveSize === 'sm' ? 'px-1.5 py-0' : '';
  const labelSizeClass = effectiveSize === 'sm' ? 'text-[10px]' : '';

  const Icon = chosen.icon;

  return (
    <Badge className={`${chosen.className} ${paddingClass} ${className ?? ''}`}>
      {Icon && <Icon className={iconSizeClass} />}
      {showLabel && <span className={`${labelClass} ${labelSizeClass}`}>{label}</span>}
    </Badge>
  );
};
