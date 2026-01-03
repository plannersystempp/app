import React, { useState, useRef } from 'react';
import { Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ErrorReportDialog } from './ErrorReportDialog';

export const ErrorReportFAB: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  const fabButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed z-40 shadow-lg transition-all duration-300",
          isMobile 
            ? "bottom-20 left-4 h-14 rounded-full" 
            : "bottom-6 right-6 h-12 rounded-full hover:shadow-xl",
          isHovered && !isMobile ? "px-4" : "w-12 px-0"
        )}
        variant="default"
        size="icon"
        aria-label="Reportar Erro"
        ref={fabButtonRef}
      >
        <Bug className={cn("h-5 w-5", isHovered && !isMobile && "mr-2")} />
        {isHovered && !isMobile && (
          <span className="whitespace-nowrap text-sm font-medium">
            Reportar Erro
          </span>
        )}
      </Button>

      <ErrorReportDialog 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        returnFocusTo={fabButtonRef}
      />
    </>
  );
};
