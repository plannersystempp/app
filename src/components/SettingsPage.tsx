import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, Lock, User, ArrowLeft, Menu, X, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { validatePassword } from '@/utils/validation';
import { Link, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APP_VERSION } from '@/constants/app';
import { DangerZone } from '@/components/admin/DangerZone';
import { TeamPayrollConfig } from './settings/TeamPayrollConfig';
import { NotificationSettings } from './settings/NotificationSettings';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useTeam } from '@/contexts/TeamContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { userRole } = useTeam();
  const navigate = useNavigate();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Erro",
        description: "A nova senha e a confirmação não coincidem",
        variant: "destructive"
      });
      return;
    }

    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Senha Inválida",
        description: passwordValidation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({ 
        password: passwordForm.newPassword 
      });

      if (error) {
        if (error.message.includes('New password should be different')) {
          toast({
            title: "Erro",
            description: "A nova senha deve ser diferente da atual",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Sucesso!",
        description: "Senha alterada com sucesso"
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Erro",
        description: "Falha ao alterar senha. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileForm.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome não pode estar vazio",
        variant: "destructive"
      });
      return;
    }

    try {
      setProfileLoading(true);
      
      // Atualizar no Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: profileForm.name }
      });

      if (authError) throw authError;

      // Atualizar no perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          name: profileForm.name,
          email: profileForm.email 
        })
        .eq('user_id', user?.id);

      if (profileError) throw profileError;

      toast({
        title: "Sucesso!",
        description: "Perfil atualizado com sucesso"
      });

    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar perfil",
        variant: "destructive"
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const getTabLabel = (tab: string) => {
    const labels = {
      profile: 'Perfil',
      security: 'Segurança',
      notifications: 'Notificações',
      payroll: 'Folha',
      subscription: 'Assinatura',
      account: 'Conta'
    };
    return labels[tab as keyof typeof labels] || 'Configurações';
  };

  return (
    <div className="space-y-4 sm:space-y-6 relative min-h-screen">
      <div className="flex items-center gap-4">
        <Link to="/app">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 break-words">
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            <span>Configurações</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie suas configurações pessoais e de segurança
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        {/* Menu Desktop - Abas horizontais */}
        <TabsList className="hidden md:grid w-full grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          {userRole === 'admin' && (
            <TabsTrigger value="payroll">Folha</TabsTrigger>
          )}
          <TabsTrigger value="subscription">Assinatura</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
        </TabsList>

        {/* Menu Mobile - Hambúrguer */}
        <div className="md:hidden">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between sheet-trigger touch-manipulation"
                style={{ touchAction: 'manipulation' }}
              >
                <span>{getTabLabel(activeTab)}</span>
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto touch-manipulation">
              <SheetHeader>
                <SheetTitle>
                  <VisuallyHidden>Menu de configurações</VisuallyHidden>
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 py-4">
                <Button
                  variant={activeTab === 'profile' ? 'default' : 'ghost'}
                  className="justify-start touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => {
                    setActiveTab('profile');
                    setIsMenuOpen(false);
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Perfil
                </Button>
                <Button
                  variant={activeTab === 'security' ? 'default' : 'ghost'}
                  className="justify-start touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => {
                    setActiveTab('security');
                    setIsMenuOpen(false);
                  }}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Segurança
                </Button>
                <Button
                  variant={activeTab === 'notifications' ? 'default' : 'ghost'}
                  className="justify-start touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => {
                    setActiveTab('notifications');
                    setIsMenuOpen(false);
                  }}
                >
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Notificações
                </Button>
                {userRole === 'admin' && (
                  <Button
                    variant={activeTab === 'payroll' ? 'default' : 'ghost'}
                    className="justify-start touch-manipulation"
                    style={{ touchAction: 'manipulation' }}
                    onClick={() => {
                      setActiveTab('payroll');
                      setIsMenuOpen(false);
                    }}
                  >
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Folha
                  </Button>
                )}
                <Button
                  variant={activeTab === 'subscription' ? 'default' : 'ghost'}
                  className="justify-start touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => {
                    setActiveTab('subscription');
                    setIsMenuOpen(false);
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Assinatura
                </Button>
                <Button
                  variant={activeTab === 'account' ? 'default' : 'ghost'}
                  className="justify-start touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => {
                    setActiveTab('account');
                    setIsMenuOpen(false);
                  }}
                >
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Conta
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações do Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="bg-muted"
                    placeholder="Seu email"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O email não pode ser alterado
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={profileLoading}
                >
                  {profileLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Digite sua nova senha"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mínimo 8 caracteres com maiúscula, minúscula e número
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirme sua nova senha"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                >
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="payroll">
          {userRole === 'admin' ? (
            <TeamPayrollConfig />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Acesso restrito</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Apenas administradores podem alterar configurações de horas extras e de folha.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Gerenciar Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Visualize detalhes da sua assinatura, limites do plano e faça upgrade quando necessário.
              </p>
              <Button onClick={() => navigate('/app/subscription')}>
                Ir para Gerenciamento de Assinatura
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <DangerZone />
        </TabsContent>
      </Tabs>

      {/* Version display */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
        PlannerSystem v{APP_VERSION}
      </div>
    </div>
  );
};
