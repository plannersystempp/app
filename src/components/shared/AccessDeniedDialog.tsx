import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type AccessDeniedAttempt = {
  pageLabel: string;
  path: string;
};

export const AccessDeniedDialog: React.FC<{
  open: boolean;
  attempt: AccessDeniedAttempt | null;
  onOpenChange: (open: boolean) => void;
}> = ({ open, attempt, onOpenChange }) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Acesso negado</AlertDialogTitle>
          <AlertDialogDescription>
            {attempt
              ? `Você não tem permissão para acessar a página “${attempt.pageLabel}” (${attempt.path}).`
              : 'Você não tem permissão para acessar esta página.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

