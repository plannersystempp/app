import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, Mail, Lock, Building2, User, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { resetPassword } from '@/services/authService';
import { validateEmail, validatePassword, validateName, sanitizeInput } from '@/utils/validation';

export const LoginScreen: React.FC = () => {
  const { login, signup, isLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  
  // Novos estados para o fluxo de empresa
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [confirmAdmin, setConfirmAdmin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [signupMessage, setSignupMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const planParam = searchParams.get('plan') || '';

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (location.pathname === '/auth/signup') {
      setIsSignUp(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (planParam) {
      try {
        const current = localStorage.getItem('pendingSignupPlan');
        if (current !== planParam) {
          localStorage.setItem('pendingSignupPlan', planParam);
        }
      } catch {}
    }
  }, [planParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation for all forms
    if (!validateEmail(email)) {
      toast({
        title: "Erro",
        description: "Por favor, informe um email válido",
        variant: "destructive"
      });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Senha Inválida",
        description: passwordValidation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }
    
    if (isSignUp) {
      if (!validateName(name)) {
        toast({
          title: "Erro",
          description: "Nome deve ter entre 2 e 100 caracteres",
          variant: "destructive"
        });
        return;
      }

      if (!acceptedTerms) {
        toast({
          title: "Erro",
          description: "Você deve aceitar os Termos de Uso e Política de Privacidade para continuar",
          variant: "destructive"
        });
        return;
      }

      if (isCreatingCompany) {
        if (!companyName.trim() || !companyCnpj.trim() || !confirmAdmin) {
          toast({
            title: "Erro",
            description: "Por favor, preencha todos os campos e confirme que é o administrador legal",
            variant: "destructive"
          });
          return;
        }

        try {
          const sanitizedName = sanitizeInput(name);
          const sanitizedCompanyName = sanitizeInput(companyName);
          const sanitizedCnpj = sanitizeInput(companyCnpj);

          const { data: userData, error: signupError } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
              data: { 
                name: sanitizedName,
                isCreatingCompany: true,
                companyName: sanitizedCompanyName,
                companyCnpj: sanitizedCnpj
              },
              emailRedirectTo: `${window.location.origin}/auth/signup${planParam ? `?plan=${encodeURIComponent(planParam)}` : ''}`
            }
          });

          if (signupError) {
            if (signupError.message?.includes('User already registered')) {
              toast({
                title: "Email já cadastrado",
                description: "Já existe uma conta com este email. Tente fazer login.",
                variant: "destructive"
              });
            } else {
              toast({
                title: "Erro no cadastro",
                description: signupError.message,
                variant: "destructive"
              });
            }
            return;
          }

          if (userData.user) {
            setSignUpSuccess(true);
            if (planParam) {
              try {
                localStorage.setItem('pendingSignupPlan', planParam);
              } catch {}
            }
            toast({
              title: "Cadastro realizado!",
              description: "Verifique seu e-mail para confirmar. Após o login, iniciaremos o checkout automaticamente.",
            });
          }
        } catch (error: any) {
          console.error('Error in admin signup:', error);
          toast({
            title: "Erro no cadastro",
            description: error.message || "Erro inesperado durante o cadastro",
            variant: "destructive"
          });
        }
      } else {
        if (!inviteCode.trim()) {
          toast({
            title: "Erro",
            description: "Por favor, informe o código da empresa",
            variant: "destructive"
          });
          return;
        }

        try {
          const sanitizedName = sanitizeInput(name);
          const { data: userData, error: signupError } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
              data: { name: sanitizedName },
              emailRedirectTo: `${window.location.origin}/`
            }
          });

          if (signupError) {
            if (signupError.message?.includes('User already registered')) {
              toast({
                title: "Email já cadastrado",
                description: "Já existe uma conta com este email. Tente fazer login.",
                variant: "destructive"
              });
              return;
            }
            throw signupError;
          }

          if (userData.user) {
            const { data: joinData, error: joinError } = await supabase
              .rpc('join_team_by_invite_code', {
                p_invite_code: inviteCode.trim()
              });

            if (joinError) {
              console.error('Error joining team:', joinError);
              if (joinError.message?.includes('Invalid invite code')) {
                toast({
                  title: "Código inválido",
                  description: "O código da empresa não foi encontrado.",
                  variant: "destructive"
                });
              } else {
                toast({
                  title: "Erro na solicitação",
                  description: "Falha ao solicitar acesso à equipe. Tente novamente.",
                  variant: "destructive"
                });
              }
            } else if (joinData && typeof joinData === 'object' && joinData !== null && 'team_name' in joinData) {
              setSignUpSuccess(true);
              toast({
                title: "Solicitação enviada!",
                description: `Sua solicitação de acesso à ${(joinData as any).team_name} foi enviada para aprovação.`,
              });
            }
          }
        } catch (error: any) {
          console.error('Error in coordinator signup:', error);
          toast({
            title: "Erro no cadastro",
            description: error.message || "Erro inesperado durante o cadastro",
            variant: "destructive"
          });
        }
      }
    } else {
      const { error } = await login(email, password);
      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          toast({
            title: "Credenciais inválidas",
            description: "Verifique seu e-mail e senha ou use 'Esqueci minha senha'.",
            variant: "destructive"
          });
        } else if (error.message?.includes('Email not confirmed')) {
          toast({
            title: "Email não confirmado",
            description: "Verifique seu email e clique no link de confirmação antes de fazer login.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro no login",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira seu email",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await resetPassword(forgotPasswordEmail);
      if (error) {
        if (error.message?.includes('over_email_send_rate_limit') || error.message?.includes('429')) {
          toast({
            title: "Muitas tentativas",
            description: "Por segurança, você só pode solicitar um novo link após alguns minutos. Tente novamente em breve.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }
      toast({
        title: "Link enviado!",
        description: "Link de redefinição enviado! Verifique seu e-mail para redefinir sua senha. O link é válido por 1 hora."
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar email de redefinição",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 overflow-x-hidden bg-background">
      {/* Coluna Esquerda - Branding (Visível apenas em desktop) */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-10 xl:p-16 2xl:p-24 text-white relative h-full min-h-screen">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="z-10 flex items-center gap-3">
          <img src="/icons/logo_plannersystempng.png" alt="Logo" className="h-6 w-auto opacity-90 brightness-0 invert" />
        </div>
        <div className="z-10 max-w-xl 2xl:max-w-2xl">
          <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold leading-tight mb-6">
            Gestão inteligente para eventos de sucesso.
          </h1>
          <p className="text-lg xl:text-xl text-slate-300">
            Simplifique a organização, controle suas equipes e foque no que realmente importa: a experiência.
          </p>
        </div>
        <div className="z-10 text-sm text-slate-400">
          © 2026 PlannerSystem. Todos os direitos reservados.
        </div>
      </div>

      {/* Coluna Direita - Formulário */}
      <div className="flex items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16 2xl:p-24 overflow-y-auto h-full min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[350px] sm:max-w-[400px] xl:max-w-[450px] 2xl:max-w-[500px] space-y-6 lg:space-y-8">
          <div className="flex flex-col space-y-2 text-center">
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-4">
               <img src="/icons/plannersystem-logo.svg" alt="Logo" className="h-10 w-auto" />
            </div>
            
            {/* Desktop Icon (Centered above form) */}
            <div className="hidden lg:flex justify-center mb-6">
              <img src="/icons/plannersystem-logo.svg" alt="Icon" className="h-12 xl:h-16 w-auto" />
            </div>

            <h1 className="text-2xl xl:text-3xl font-semibold tracking-tight">
              {signUpSuccess 
                ? 'Cadastro realizado!' 
                : (isSignUp ? 'Crie sua conta' : 'Bem-vindo de volta')}
            </h1>
            <p className="text-sm xl:text-base text-muted-foreground">
              {signUpSuccess
                ? 'Aguarde a aprovação do administrador.'
                : (isSignUp 
                    ? 'Preencha os dados abaixo para começar.' 
                    : 'Digite suas credenciais para acessar sua conta.')}
            </p>
          </div>

          {signUpSuccess ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-center py-8">
                <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center animate-pulse">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setSignUpSuccess(false);
                    setIsSignUp(false);
                    setEmail('');
                    setPassword('');
                    setName('');
                  }}
                  className="w-full"
                >
                  Voltar para Login
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  {signupMessage && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-sm text-blue-500 text-center">
                      {signupMessage}
                    </div>
                  )}

                  {isSignUp && (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Nome completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="name"
                            placeholder="Ex: João Silva"
                            type="text"
                            autoCapitalize="words"
                            autoComplete="name"
                            autoCorrect="off"
                            disabled={isLoading}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="pl-9 h-11"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 rounded-md border p-3 bg-muted/30">
                        <Checkbox
                          id="createCompany"
                          checked={isCreatingCompany}
                          onCheckedChange={(checked) => setIsCreatingCompany(checked as boolean)}
                        />
                        <Label htmlFor="createCompany" className="text-sm font-normal cursor-pointer flex-1">
                          Quero cadastrar uma empresa
                        </Label>
                      </div>

                      {isCreatingCompany ? (
                        <div className="grid gap-4 pl-4 border-l-2 border-primary/20 animate-in slide-in-from-left-2">
                          <div className="grid gap-2">
                            <Label htmlFor="companyName">Nome da Empresa</Label>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="companyName"
                                placeholder="Sua Empresa Ltda"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="pl-9 h-11"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="companyCnpj">CNPJ</Label>
                            <Input
                              id="companyCnpj"
                              placeholder="00.000.000/0000-00"
                              value={companyCnpj}
                              onChange={(e) => setCompanyCnpj(e.target.value)}
                              className="h-11"
                              required
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="confirmAdmin"
                              checked={confirmAdmin}
                              onCheckedChange={(checked) => setConfirmAdmin(checked as boolean)}
                            />
                            <Label htmlFor="confirmAdmin" className="text-xs font-normal text-muted-foreground">
                              Sou o administrador legal
                            </Label>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-2 animate-in slide-in-from-top-2">
                          <Label htmlFor="inviteCode">Código da Empresa</Label>
                          <Input
                            id="inviteCode"
                            placeholder="CÓDIGO"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            className="uppercase tracking-widest text-center font-mono bg-muted/30 h-11"
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        placeholder="nome@exemplo.com"
                        type="email"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        disabled={isLoading}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      {!isSignUp && (
                        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                          <DialogTrigger asChild>
                            <Button variant="link" size="sm" className="px-0 font-normal h-auto text-xs text-primary hover:no-underline hover:text-primary/80">
                              Esqueceu a senha?
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Recuperar Senha</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="forgot-email">Email</Label>
                                <Input
                                  id="forgot-email"
                                  placeholder="Digite seu email"
                                  value={forgotPasswordEmail}
                                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                />
                              </div>
                              <Button onClick={handleForgotPassword}>Enviar Link</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <PasswordInput
                        id="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 h-11"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {isSignUp && (
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="acceptTerms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                        className="mt-1"
                      />
                      <Label htmlFor="acceptTerms" className="text-xs leading-normal font-normal text-muted-foreground">
                        Concordo com os <a href="#" className="underline hover:text-primary">Termos de Uso</a> e <a href="#" className="underline hover:text-primary">Política de Privacidade</a>.
                      </Label>
                    </div>
                  )}

                  <Button disabled={isLoading} className="w-full h-11 shadow-sm font-medium text-base">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSignUp ? 'Criar conta' : 'Entrar'}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </form>
              
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <Button 
                  variant="outline" 
                  type="button" 
                  disabled={isLoading}
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setSignupMessage('');
                  }}
                  className="h-11 border-dashed border-border hover:border-solid hover:bg-muted/50"
                >
                  {isSignUp ? 'Já tenho uma conta' : 'Criar uma nova conta'}
                </Button>
              </div>
            </div>
          )}
          
          <p className="px-8 text-center text-xs text-muted-foreground">
            Ao clicar em continuar, você concorda com nossos{' '}
            <a href="/termos-de-uso" className="underline underline-offset-4 hover:text-primary">
              Termos de Serviço
            </a>{' '}
            e{' '}
            <a href="/politica-de-privacidade" className="underline underline-offset-4 hover:text-primary">
              Política de Privacidade
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
