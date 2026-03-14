import React from 'react';
import { Calculator, Users } from 'lucide-react';
import { PayrollDetails } from './types';
import { PayrollDetailsCard } from './PayrollDetailsCard';
import { SkeletonCard } from '@/components/shared/SkeletonCard';

interface PayrollListProps {
  payrollDetails: PayrollDetails[];
  loading: boolean;
  pixKeys: Record<string, string>;
  onRegisterPayment: (
    personnelId: string,
    totalAmount: number,
    notes?: string,
    snapshot?: { cacheRate?: number; overtimeRate?: number }
  ) => void;
  onRegisterPartialPayment: (personnelId: string, amount: number, notes: string) => void;
  onCancelPayment: (paymentId: string, personnelName: string) => void;
}

export const PayrollList: React.FC<PayrollListProps> = ({
  payrollDetails,
  loading,
  pixKeys,
  onRegisterPayment,
  onRegisterPartialPayment,
  onCancelPayment
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard showSubtitle={false} />
          <SkeletonCard showSubtitle={false} />
          <SkeletonCard showSubtitle={false} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (payrollDetails.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Nenhum profissional alocado neste evento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payrollDetails.map(detail => (
        <PayrollDetailsCard
          key={detail.id}
          detail={detail}
          onRegisterPayment={onRegisterPayment}
          onRegisterPartialPayment={onRegisterPartialPayment}
          onCancelPayment={onCancelPayment}
          loading={loading}
          pixKey={pixKeys[detail.personnelId]}
          hasEventSpecificCache={detail.hasEventSpecificCache}
          eventSpecificCacheRate={detail.eventSpecificCacheRate}
        />
      ))}
    </div>
  );
};
