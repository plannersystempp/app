import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  accentClassName?: string; // ex: "border-yellow-200 bg-yellow-50/50"
  valueClassName?: string; // ex: "text-yellow-600"
  size?: 'xs' | 'sm' | 'md';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon,
  accentClassName,
  valueClassName,
  size = 'md',
}) => {
  const titleSizeClass = size === 'xs' ? 'text-[10px] uppercase tracking-wider' : size === 'sm' ? 'text-xs' : 'text-sm';
  const headerPaddingClass = size === 'xs' ? 'pb-0' : size === 'sm' ? 'pb-1' : 'pb-2';
  const valueSizeClass = size === 'xs' ? 'text-lg' : size === 'sm' ? 'text-xl' : 'text-2xl';
  const cardPaddingClass = size === 'xs' ? 'p-3' : 'p-6';
  
  return (
    <Card className={cn('bg-muted/30 dark:bg-muted/20 hover:shadow-md transition-shadow group', accentClassName)}>
      <CardHeader className={cn('flex flex-row items-center justify-between space-y-0', headerPaddingClass, size === 'xs' ? 'p-3 pb-0' : '')}>
        <CardTitle className={cn('font-medium text-muted-foreground', titleSizeClass)}>{title}</CardTitle>
        {icon ? (
          <span className={cn(
            "inline-flex transition-transform duration-200 ease-out motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3 group-focus-visible:scale-110 group-focus-visible:-rotate-3",
            size === 'xs' ? 'scale-75 origin-right' : ''
          )}>
            {icon}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className={cn(size === 'xs' ? 'p-3 pt-1' : '')}>
        <div className={cn(valueSizeClass, 'font-bold', valueClassName)}>{value}</div>
      </CardContent>
    </Card>
  );
};

export default KpiCard;