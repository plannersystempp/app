import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, Check, AlertCircle } from 'lucide-react';
import { useErrorReporting } from '@/hooks/useErrorReporting';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/contexts/TeamContext';
import { toast } from '@/hooks/use-toast';

interface ErrorReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  returnFocusTo?: React.RefObject<HTMLElement>;
}

export const ErrorReportDialog: React.FC<ErrorReportDialogProps> = ({ isOpen, onClose, returnFocusTo }) => {
  const { submitErrorReport, isSubmitting } = useErrorReporting();
  const { activeTeam } = useTeam();
  
  const [whatTrying, setWhatTrying] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [steps, setSteps] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [reportNumber, setReportNumber] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const payload = {
        action: 'ERROR_REPORT_OPENED',
        table_name: 'error_reports',
        record_id: null,
        new_values: { url: window.location.href },
        team_id: activeTeam?.id || null,
        user_id: null,
      } as any;
      supabase.from('audit_logs').insert(payload);
    }
  }, [isOpen, activeTeam?.id]);

  const handleClose = () => {
    onClose();
    if (returnFocusTo?.current) {
      returnFocusTo.current.focus();
    }
  };

  const handleScreenshot = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'Arquivo muito grande',
            description: 'A imagem deve ter no máximo 5MB',
            variant: 'destructive'
          });
          return;
        }
        setScreenshot(file);
        toast({
          title: 'Imagem anexada',
          description: file.name,
        });
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!whatTrying.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Descreva o que você estava tentando fazer',
        variant: 'destructive'
      });
      return;
    }

    if (!whatHappened.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Descreva o que aconteceu de inesperado',
        variant: 'destructive'
      });
      return;
    }

    const number = await submitErrorReport({
      whatTryingToDo: whatTrying,
      whatHappened: whatHappened,
      stepsToReproduce: steps || undefined,
      urgency,
      screenshot: screenshot || undefined
    });

    if (number) {
      setReportNumber(number);
      setShowSuccess(true);

      const telemetryPayload = {
        action: 'ERROR_REPORT_SUBMITTED',
        table_name: 'error_reports',
        record_id: number,
        new_values: { urgency, url: window.location.href },
        team_id: activeTeam?.id || null,
        user_id: null,
      } as any;
      supabase.from('audit_logs').insert(telemetryPayload);

      if (urgency === 'high') {
        const { data: superadmins } = await supabase.rpc('get_superadmin_user_ids');
        const ids: string[] = Array.isArray(superadmins) ? superadmins : [];
        await Promise.all(ids.map(async (uid) => {
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: uid,
                title: 'Erro crítico reportado',
                body: `Reporte ${number}: ${whatHappened.substring(0, 100)}`,
                tag: 'error-high',
                data: { reportNumber: number }
              }
            });
          } catch (e) {
            console.warn('Push notify failed for superadmin', uid, e);
          }
        }));
      }
      
      setTimeout(() => {
        setWhatTrying('');
        setWhatHappened('');
        setSteps('');
        setUrgency('medium');
        setScreenshot(null);
        setShowSuccess(false);
        setReportNumber(null);
        handleClose();
      }, 3000);
    }
  };

  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reporte enviado</DialogTitle>
            <DialogDescription>
              Obrigado por nos ajudar a melhorar. Número do relatório: {reportNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <Alert className="w-full" role="alert" aria-live="polite" aria-atomic="true">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Número do Relatório:</p>
                  <p className="text-lg font-mono font-bold">{reportNumber}</p>
                </div>
              </AlertDescription>
            </Alert>

            <p className="text-xs text-center text-muted-foreground max-w-sm">
              Nossa equipe irá analisar seu reporte em breve. Caso seja algo crítico, 
              entraremos em contato por e-mail.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle tabIndex={-1} id="error-report-title">🐞 Reportar Erro</DialogTitle>
          <DialogDescription>
            Nos ajude a melhorar o PlannerSystem! Descreva o problema que encontrou.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="what-trying" className="flex items-center gap-1">
              O que você estava tentando fazer? 
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="what-trying"
              placeholder="Ex: Estava tentando adicionar um novo freelancer à equipe..."
              value={whatTrying}
              onChange={(e) => setWhatTrying(e.target.value)}
              maxLength={500}
              className="mt-1.5 min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {whatTrying.length}/500 caracteres
            </p>
          </div>

          <div>
            <Label htmlFor="what-happened" className="flex items-center gap-1">
              O que aconteceu de inesperado? 
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="what-happened"
              placeholder="Ex: Ao clicar em 'Salvar', apareceu uma mensagem de erro e a página ficou em branco..."
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              maxLength={1000}
              className="mt-1.5 min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {whatHappened.length}/1000 caracteres
            </p>
          </div>

          <div>
            <Label htmlFor="steps" className="flex items-center gap-1">
              Passos para reproduzir o erro 
              <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="steps"
              placeholder="1. Acessei a página de Pessoal&#10;2. Cliquei em 'Adicionar Freelancer'&#10;3. Preenchi os campos..."
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              maxLength={2000}
              className="mt-1.5 min-h-[100px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {steps.length}/2000 caracteres
            </p>
          </div>

          <div>
            <Label className="mb-2 block">Urgência / Impacto</Label>
            <RadioGroup value={urgency} onValueChange={(v: any) => setUrgency(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="urgency-low" />
                <Label htmlFor="urgency-low" className="font-normal cursor-pointer">
                  🟢 Baixo - Incômodo pequeno, consigo contornar
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="urgency-medium" />
                <Label htmlFor="urgency-medium" className="font-normal cursor-pointer">
                  🟡 Médio - Dificulta o trabalho, mas não impede
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="urgency-high" />
                <Label htmlFor="urgency-high" className="font-normal cursor-pointer">
                  🔴 Alto - Sistema travado, não consigo trabalhar
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-2 block">Captura de Tela (opcional)</Label>
            <Button
              type="button"
              variant="outline"
              onClick={handleScreenshot}
              className="w-full justify-center"
            >
              <Camera className="mr-2 h-4 w-4" />
              {screenshot ? screenshot.name : 'Anexar Imagem'}
            </Button>
            {screenshot && (
              <p className="text-xs text-muted-foreground mt-1">
                ✓ Imagem anexada: {(screenshot.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Reporte'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
