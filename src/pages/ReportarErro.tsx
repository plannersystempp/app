import React, { useRef, useEffect } from 'react';
import { ErrorReportDialog } from '@/components/shared/ErrorReportDialog';
import { useNavigate } from 'react-router-dom';

export const ReportarErroPage: React.FC = () => {
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        const title = document.getElementById('error-report-title') as HTMLElement | null;
        if (title) title.focus();
      }, 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      const moreTrigger = document.getElementById('mobile-more-trigger') as HTMLElement | null;
      if (moreTrigger) moreTrigger.focus();
      navigate('/app');
    }
  }, [open, navigate]);

  return (
    <ErrorReportDialog
      isOpen={open}
      onClose={() => setOpen(false)}
      returnFocusTo={triggerRef}
    />
  );
};

export default ReportarErroPage;
