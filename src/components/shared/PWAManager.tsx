import React from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const PWAManager = () => {
  const { isInstallable, swUpdateAvailable, promptInstall, reloadApp } = usePWA();
  const { toast } = useToast();

  const handleInstall = async () => {
    try {
      await promptInstall();
      toast({
        title: "App instalado com sucesso!",
        description: "O PlannerSystem agora está disponível na sua tela inicial.",
      });
    } catch (error) {
      toast({
        title: "Erro ao instalar",
        description: "Não foi possível instalar o app. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = () => {
    toast({
      title: "Atualizando aplicativo...",
      description: "O app será recarregado com a nova versão.",
    });
    reloadApp();
  };

  return (
    <>
      {/* Install Prompt */}
      {isInstallable && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="fixed bottom-20 right-4 z-[1030] shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Instalar App
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Instalar PlannerSystem</DialogTitle>
              <DialogDescription>
                Instale o PlannerSystem na sua tela inicial para acesso rápido e uma melhor experiência de uso.
                O app funcionará mesmo offline para algumas funcionalidades.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <DialogTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogTrigger>
              <Button onClick={handleInstall}>
                <Download className="h-4 w-4 mr-2" />
                Instalar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Update Available Prompt */}
      {swUpdateAvailable && (
        <div className="fixed bottom-20 md:bottom-4 left-4 z-[1030]">
          <div className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4" />
              <span className="font-medium">Nova versão disponível!</span>
            </div>
            <p className="text-sm mb-3">
              Uma atualização do PlannerSystem está pronta para ser instalada.
            </p>
            <Button 
              onClick={handleUpdate}
              size="sm" 
              variant="secondary"
              className="w-full"
            >
              Atualizar Agora
            </Button>
          </div>
        </div>
      )}
    </>
  );
};