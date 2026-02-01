import React, { createContext, useContext, useMemo, useState } from 'react';
import { AccessDeniedDialog, type AccessDeniedAttempt } from '@/components/shared/AccessDeniedDialog';

type AccessControlContextValue = {
  denyAccess: (attempt: AccessDeniedAttempt) => void;
};

const AccessControlContext = createContext<AccessControlContextValue | undefined>(undefined);

export const AccessControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [attempt, setAttempt] = useState<AccessDeniedAttempt | null>(null);

  const value = useMemo<AccessControlContextValue>(() => {
    return {
      denyAccess: (nextAttempt) => setAttempt(nextAttempt),
    };
  }, []);

  return (
    <AccessControlContext.Provider value={value}>
      {children}
      <AccessDeniedDialog
        open={!!attempt}
        attempt={attempt}
        onOpenChange={(open) => {
          if (!open) setAttempt(null);
        }}
      />
    </AccessControlContext.Provider>
  );
};

export const useAccessControl = () => {
  const ctx = useContext(AccessControlContext);
  if (!ctx) throw new Error('useAccessControl must be used within AccessControlProvider');
  return ctx;
};

