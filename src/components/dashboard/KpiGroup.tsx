import React from 'react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface KpiGroupProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const KpiGroup: React.FC<KpiGroupProps> = ({ title, description, icon, children, className }) => {
  return (
    <section className={cn('space-y-2', className)} aria-label={title}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null}
          <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground ml-1">{description}</p>
        )}
      </div>
      <Separator className="my-1" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
        {children}
      </div>
    </section>
  );
};

export default KpiGroup;