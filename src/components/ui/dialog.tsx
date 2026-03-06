import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[1060] bg-black/50  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  
  // Track open state for scroll locking
  React.useEffect(() => {
    const element = ref && 'current' in ref ? ref.current : null;
    if (element) {
      const observer = new MutationObserver(() => {
        const state = element.getAttribute('data-state');
        setIsOpen(state === 'open');
      });
      observer.observe(element, { attributes: true, attributeFilter: ['data-state'] });
      
      // Initial check
      setIsOpen(element.getAttribute('data-state') === 'open');
      
      return () => observer.disconnect();
    }
  }, [ref]);

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Handle ESC key in capture phase to ensure it always works
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        closeRef.current?.click();
      }
    };

    // Use capture phase to catch the event before any child handlers
    document.addEventListener('keydown', handleEscapeKey, true);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey, true);
    };
  }, [isOpen]);

  return (
    <DialogPortal container={typeof document !== "undefined" ? document.body : undefined}>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        aria-modal="true"
        onPointerDownOutside={(e) => {
          const el = e.target as Element | null
          if (
            el && (
              el.closest('[data-dropdown-menu-content="true"]') ||
              el.closest('[data-radix-select-content]') ||
              el.closest('[data-radix-popover-content]') ||
              el.closest('[data-radix-tooltip-content]') ||
              el.closest('[role="menu"]')
            )
          ) {
            // Permitir interação com conteúdos portados (dropdowns, selects, popovers)
            return
          }
          e.preventDefault()
        }}
        onInteractOutside={(e) => {
          const el = e.target as Element | null
          if (
            el && (
              el.closest('[data-dropdown-menu-content="true"]') ||
              el.closest('[data-radix-select-content]') ||
              el.closest('[data-radix-popover-content]') ||
              el.closest('[data-radix-tooltip-content]') ||
              el.closest('[role="menu"]')
            )
          ) {
            // Permitir interação com conteúdos portados (dropdowns, selects, popovers)
            return
          }
          e.preventDefault()
        }}
        className={cn(
          "fixed left-[50%] top-[50%] z-[1070] grid w-[calc(100%-1rem)] sm:w-full sm:max-w-lg max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background px-3 py-6 sm:px-6 shadow-lg duration-200 overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close 
          ref={closeRef}
          aria-label="Fechar"
          className="absolute right-2 top-2 sm:right-4 sm:top-4 z-[999] inline-flex h-8 w-8 items-center justify-center rounded-md pointer-events-auto opacity-70 hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left pr-10 sm:pr-12",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
