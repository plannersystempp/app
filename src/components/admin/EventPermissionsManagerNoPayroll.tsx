import React, { useState } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { TeamService } from '@/contexts/team/teamService';
import { useQuery } from '@tanstack/react-query';
import {
  useEventPermissions,
  useGrantEventPermission,
  useRevokeEventPermission
} from '@/hooks/useEventPermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, UserCheck, Trash2, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EventPermissionsManagerProps {
  eventId: string;
  eventName: string;
}

export const EventPermissionsManagerNoPayroll: React.FC<EventPermissionsManagerProps> = ({
  eventId,
  eventName
}) => {
  const { activeTeam, userRole } = useTeam();
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>('');
  const [permissions, setPermissions] = useState({
    can_view_details: true,
    can_edit: false,
    can_manage_allocations: true,
    can_manage_costs: false,
  });

  const grantMutation = useGrantEventPermission();
  const revokeMutation = useRevokeEventPermission();
  const { data: existingPermissions = [] } = useEventPermissions(eventId);

  // Buscar coordenadores da equipe
  const { data: coordinators = [], isLoading: loadingCoordinators } = useQuery({
    queryKey: ['team-coordinators', activeTeam?.id],
    queryFn: async () => {
      if (!activeTeam?.id) return [];
      const list = await TeamService.getApprovedCoordinatorsWithProfiles(activeTeam.id);
      return list;
    },
    enabled: !!activeTeam?.id && userRole === 'admin'
  });

  // Apenas admins podem gerenciar permissões
  if (userRole !== 'admin') {
    return null;
  }

  const handleGrant = async () => {
    if (!selectedCoordinator || !activeTeam) return;

    await grantMutation.mutateAsync({
      coordinatorId: selectedCoordinator,
      eventId,
      teamId: activeTeam.id,
      permissions
    });

    // Reset form
    setSelectedCoordinator('');
    setPermissions({
      can_view_details: true,
      can_edit: false,
      can_manage_allocations: true,
      can_manage_costs: false,
    });
  };

  const handleRevoke = async (coordinatorId: string) => {
    await revokeMutation.mutateAsync({ coordinatorId, eventId });
  };

  const getCoordinatorName = (coordinatorId: string) => {
    const coordinator = coordinators.find(c => c.id === coordinatorId);
    return coordinator?.name || 'Coordenador';
  };

  const handleSelectCoordinator = (value: string) => {
    setSelectedCoordinator(value);
    const existing = existingPermissions.find(p => p.coordinator_id === value);
    if (existing) {
      setPermissions({
        can_view_details: !!existing.can_view_details,
        can_edit: !!existing.can_edit,
        can_manage_allocations: !!existing.can_manage_allocations,
        can_manage_costs: !!existing.can_manage_costs,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>Gerenciar Permissões de Acesso</CardTitle>
        </div>
        <CardDescription>
          Controle quais coordenadores podem acessar "{eventName}"
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Permissões Existentes */}
        {existingPermissions.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-left">
              <Users className="w-4 h-4" />
              Coordenadores com Acesso
            </Label>
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              {existingPermissions.map(perm => (
                <div key={perm.id} className="flex items-center justify-between p-3 bg-background rounded border">
                  <div className="flex-1 text-left">
                    <p className="font-medium text-left">{getCoordinatorName(perm.coordinator_id)}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {perm.can_view_details && <Badge variant="outline" className="text-xs">Ver Detalhes</Badge>}
                      {perm.can_edit && <Badge variant="outline" className="text-xs">Editar</Badge>}
                      {perm.can_manage_allocations && <Badge variant="outline" className="text-xs">Alocações</Badge>}
                      {perm.can_manage_costs && <Badge variant="outline" className="text-xs">Custos</Badge>}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revogar Permissão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover o acesso deste coordenador ao evento?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevoke(perm.coordinator_id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Revogar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Adicionar Nova Permissão */}
        <div className="space-y-4">
          <Label className="text-left">Conceder Acesso a Novo Coordenador</Label>
          
          {/* Seletor de Coordenador */}
          <div className="space-y-2">
            <Select
              value={selectedCoordinator}
              onValueChange={handleSelectCoordinator}
            >
              <SelectTrigger className="text-left">
                <SelectValue placeholder="Selecione um coordenador" />
              </SelectTrigger>
              <SelectContent className="z-50" position="popper">
                {loadingCoordinators && (
                  <SelectItem disabled value="__loading">Carregando coordenadores...</SelectItem>
                )}
                {!loadingCoordinators && coordinators.length === 0 && (
                  <SelectItem disabled value="__empty">Nenhum coordenador aprovado nesta equipe</SelectItem>
                )}
                {coordinators.map(coord => (
                  <SelectItem 
                    key={coord.id} 
                    value={coord.id}
                  >
                    {coord.name}
                    {existingPermissions.some(p => p.coordinator_id === coord.id) && 
                      <Badge variant="secondary" className="ml-2">Já tem acesso</Badge>
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Switches de Permissões */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 text-left">
                <Label htmlFor="can_view" className="text-left">Ver Detalhes</Label>
                <p className="text-xs text-muted-foreground text-left">Acesso aos dados do evento</p>
              </div>
              <Switch
                id="can_view"
                checked={permissions.can_view_details}
                onCheckedChange={(checked) =>
                  setPermissions(prev => ({ ...prev, can_view_details: checked }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 text-left">
                <Label htmlFor="can_edit" className="text-left">Editar Evento</Label>
                <p className="text-xs text-muted-foreground text-left">Modificar dados básicos</p>
              </div>
              <Switch
                id="can_edit"
                checked={permissions.can_edit}
                onCheckedChange={(checked) =>
                  setPermissions(prev => ({ ...prev, can_edit: checked }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 text-left">
                <Label htmlFor="can_allocations" className="text-left">Gerenciar Alocações</Label>
                <p className="text-xs text-muted-foreground text-left">Alocar e editar equipe</p>
              </div>
              <Switch
                id="can_allocations"
                checked={permissions.can_manage_allocations}
                onCheckedChange={(checked) =>
                  setPermissions(prev => ({ ...prev, can_manage_allocations: checked }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 text-left">
                <Label htmlFor="can_costs" className="text-left">Gerenciar Custos</Label>
                <p className="text-xs text-muted-foreground text-left">Acesso a fornecedores e despesas</p>
              </div>
              <Switch
                id="can_costs"
                checked={permissions.can_manage_costs}
                onCheckedChange={(checked) =>
                  setPermissions(prev => ({ ...prev, can_manage_costs: checked }))
                }
              />
            </div>
          </div>

          {/* Botão de Conceder */}
          <Button
            onClick={handleGrant}
            disabled={!selectedCoordinator || grantMutation.isPending}
            className="w-full"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            {grantMutation.isPending ? 'Concedendo...' : 'Conceder Permissões'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};