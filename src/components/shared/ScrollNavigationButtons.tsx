import React from 'react';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollNavigationButtonsProps {
  showScrollToTop: boolean;
  scrollToTop: () => void;
}

export const ScrollNavigationButtons: React.FC<ScrollNavigationButtonsProps> = ({ 
  showScrollToTop,
  scrollToTop,
}) => {

  return (
    <>
      {/* Home Button - Top Center */}
      <Button
        size="icon"
        variant="secondary"
        className={cn(
          "fixed top-6 left-1/2 transform -translate-x-1/2 z-30",
          "h-10 w-10 rounded-full shadow-lg transition-all duration-300",
          "bg-background/90 backdrop-blur-sm border border-border",
          "hover:bg-accent hover:text-accent-foreground",
          "text-muted-foreground hover:scale-105",
          showScrollToTop 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 -translate-y-2 pointer-events-none"
        )}
        onClick={scrollToTop}
        aria-label="Ir ao topo"
      >
        <Home className="h-4 w-4" />
      </Button>
    </>
  );
};