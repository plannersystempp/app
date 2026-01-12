
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { Personnel } from '@/contexts/EnhancedDataContext';
import { PersonnelFormHeader } from './PersonnelFormHeader';
import { PersonnelFormFields } from './PersonnelFormFields';
import { PersonnelFormActions } from './PersonnelFormActions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTeam } from '@/contexts/TeamContext';
import { validateUniquePersonnelName, validateUniqueCPF, validateUniqueCNPJ } from '@/utils/validation';
import { useCheckSubscriptionLimits } from '@/hooks/useCheckSubscriptionLimits';
import { UpgradePrompt } from '@/components/subscriptions/UpgradePrompt';
import { useCreatePersonnelMutation, useUpdatePersonnelMutation, usePersonnelQuery } from '@/hooks/queries/usePersonnelQuery';

interface PersonnelFormProps {
  personnel?: Personnel;
  onClose: () => void;
  onSuccess: () => void;
}

interface PersonnelFormData {
  name: string;
  email: string;
  phone: string;
  phone_secondary: string;
  type: 'fixo' | 'freelancer';
  functionIds: string[];
  primaryFunctionId: string;
  monthly_salary: number;
  event_cache: number;
  overtime_rate: number;
  cpf: string;
  cnpj: string;
  pixKey: string;
  photo_url: string;
  shirt_size: string;
  address_zip_code: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  functionCaches: Record<string, number>;
}

export const PersonnelForm: React.FC<PersonnelFormProps> = ({ personnel, onClose, onSuccess }) => {
  const { functions } = useEnhancedData();
  const { data: allPersonnel = [] } = usePersonnelQuery();
  const { userRole, activeTeam } = useTeam();
  const { toast } = useToast();
  const checkLimits = useCheckSubscriptionLimits();
  const createPersonnel = useCreatePersonnelMutation();
  const updatePersonnel = useUpdatePersonnelMutation();
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [limitCheckResult, setLimitCheckResult] = useState<any>(null);
  const [formData, setFormData] = useState<PersonnelFormData>({
    name: '',
    email: '',
    phone: '',
    phone_secondary: '',
    type: 'freelancer',
    functionIds: [],
    primaryFunctionId: '',
    monthly_salary: 0,
    event_cache: 0,
    overtime_rate: 0,
    cpf: '',
    cnpj: '',
    pixKey: '',
    photo_url: '',
    shirt_size: '',
    address_zip_code: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    functionCaches: {},
    functionOvertimes: {}
  });
  const [loading, setLoading] = useState(false);

  // Snapshot do estado inicial para detectar alterações (isDirty)
  const initialDataRef = useRef<PersonnelFormData>(formData);

  useEffect(() => {
    if (personnel) {
      const initialData = {
        name: personnel.name,
        email: personnel.email || '',
        phone: personnel.phone || '',
        phone_secondary: personnel.phone_secondary || '',
        type: personnel.type as 'fixo' | 'freelancer',
        functionIds: personnel.functions?.map(f => f.id) || [],
        primaryFunctionId: personnel.primaryFunctionId || (personnel.functions?.[0]?.id || ''),
        monthly_salary: personnel.monthly_salary || 0,
        event_cache: personnel.event_cache || 0,
        overtime_rate: personnel.overtime_rate || 0,
        cpf: personnel.cpf || '',
        cnpj: personnel.cnpj || '',
        pixKey: '',
        photo_url: personnel.photo_url || '',
        shirt_size: personnel.shirt_size || '',
        address_zip_code: personnel.address_zip_code || '',
        address_street: personnel.address_street || '',
        address_number: personnel.address_number || '',
        address_complement: personnel.address_complement || '',
        address_neighborhood: personnel.address_neighborhood || '',
        address_city: personnel.address_city || '',
        address_state: personnel.address_state || '',
        functionCaches: personnel.functions?.reduce((acc, f) => {
          if (f.custom_cache !== undefined && f.custom_cache !== null) acc[f.id] = f.custom_cache;
          return acc;
        }, {} as Record<string, number>) || {},
        functionOvertimes: personnel.functions?.reduce((acc, f) => {
          if (f.custom_overtime !== undefined && f.custom_overtime !== null) acc[f.id] = f.custom_overtime;
          return acc;
        }, {} as Record<string, number>) || {}
      };
      setFormData(initialData);
      initialDataRef.current = initialData;
    }
  }, [personnel]);

  // Fetch PIX key for admins when editing personnel
  useEffect(() => {
    const fetchPixKey = async () => {
      if (personnel && (userRole === 'admin' || userRole === 'superadmin')) {
        console.log('Fetching PIX key for personnel:', personnel.id);
        try {
          const { data, error } = await supabase.functions.invoke('pix-key/get', {
            body: { personnel_ids: [personnel.id] }
          });

          console.log('PIX key response:', { data, error });
          
          const map = (data && (data as any).pix_keys) ? (data as any).pix_keys : data as any;
          if (!error && map && map[personnel.id]) {
            console.log('Setting PIX key:', map[personnel.id]);
            setFormData(prev => ({ ...prev, pixKey: map[personnel.id] }));
          } else {
            console.log('No PIX key found for personnel:', personnel.id);
          }
        } catch (error) {
          console.error('Error fetching PIX key:', error);
        }
      }
    };

    fetchPixKey();
  }, [personnel, userRole]);

  // Detectar alterações não salvas comparando formData com initialDataRef
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialDataRef.current);
  }, [formData]);

  const handleFieldChange = (field: keyof PersonnelFormData, value: string | number | string[] | Record<string, number>) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({ ...prev, phone: value }));
  };

  // Prevenir submit involuntário por Enter em qualquer campo
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      console.log('[PersonnelForm] Enter prevenido - submit bloqueado');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar limites apenas ao criar novo pessoal
    if (!personnel && activeTeam) {
      const result = await checkLimits.mutateAsync({
        teamId: activeTeam.id,
        action: 'add_personnel'
      });

      if (!result.can_proceed) {
        setLimitCheckResult(result);
        setUpgradePromptOpen(true);
        return;
      }
    }
    
    // Validação de nome único
    const nameValidation = validateUniquePersonnelName(
      formData.name, 
      allPersonnel, 
      personnel?.id
    );
    
    if (!nameValidation.isValid) {
      toast({
        title: "Nome duplicado",
        description: nameValidation.suggestedName 
          ? `${nameValidation.message}. Sugestão: "${nameValidation.suggestedName}"`
          : nameValidation.message,
        variant: "destructive"
      });
      return;
    }
    
    // Validação de campos obrigatórios
    if (!formData.name.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.type) {
      toast({
        title: "Campos obrigatórios", 
        description: "Selecione o tipo (fixo ou freelancer)",
        variant: "destructive"
      });
      return;
    }
    
    // Validação de CPF obrigatório
    if (!formData.cpf.trim()) {
      toast({
        title: "CPF obrigatório",
        description: "Informe o CPF para cadastrar",
        variant: "destructive"
      });
      return;
    }

    // Validar CPF único
    const cpfValidation = validateUniqueCPF(
      formData.cpf,
      allPersonnel,
      personnel?.id
    );

    if (!cpfValidation.isValid) {
      toast({
        title: "CPF inválido",
        description: cpfValidation.message,
        variant: "destructive"
      });
      return;
    }

    // Validar CNPJ se fornecido
    if (formData.cnpj.trim()) {
      const cnpjValidation = validateUniqueCNPJ(
        formData.cnpj,
        allPersonnel,
        personnel?.id
      );
      
      if (!cnpjValidation.isValid) {
        toast({
          title: "CNPJ inválido",
          description: cnpjValidation.message,
          variant: "destructive"
        });
        return;
      }
    }
    
    // Permitir zero; apenas bloquear valores negativos
    if (formData.event_cache < 0) {
      toast({
        title: "Valor inválido",
        description: "Cachê do evento não pode ser negativo",
        variant: "destructive" 
      });
      return;
    }
    
    if (formData.overtime_rate < 0) {
      toast({
        title: "Valor inválido",
        description: "Valor de hora extra não pode ser negativo",
        variant: "destructive"
      });
      return;
    }
    
    // Em criação exigimos ao menos uma função; em edição, não bloqueamos
    if (!personnel && formData.functionIds.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione ao menos uma função",
        variant: "destructive"
      });
      return;
    }

    // Quando houver múltiplas funções selecionadas, exigir principal
    if (formData.functionIds.length > 1 && !formData.primaryFunctionId) {
      toast({
        title: "Função principal",
        description: "Selecione a função principal",
        variant: "destructive"
      });
      return;
    }

    // A função principal deve estar entre as selecionadas (se informada)
    if (formData.primaryFunctionId && !formData.functionIds.includes(formData.primaryFunctionId)) {
      toast({
        title: "Função principal",
        description: "A função principal deve estar entre as selecionadas",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho de camisa se informado
    if (formData.shirt_size && !['PP', 'P', 'M', 'G', 'GG', 'XG'].includes(formData.shirt_size)) {
      toast({
        title: "Tamanho inválido",
        description: "Selecione um tamanho válido ou deixe em branco",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    try {
      console.log('[PersonnelForm] Submitting form...', { 
        isUpdate: !!personnel, 
        name: formData.name,
        type: formData.type 
      });
      
      let personnelId: string;
      
      if (personnel) {
        // Update existing personnel
        const updatePayload: any = { ...formData };
        // Evitar remoção involuntária de funções: se o usuário não tocou nas funções
        if (formData.functionIds.length === 0 && (personnel.functions?.length || 0) > 0) {
          delete updatePayload.functionIds;
          delete updatePayload.primaryFunctionId;
        }
        console.log('[PersonnelForm] Updating personnel...', personnel.id);
        await updatePersonnel.mutateAsync({
          id: personnel.id,
          ...updatePayload
        });
        personnelId = personnel.id;
      } else {
        // Create new personnel
        console.log('[PersonnelForm] Creating new personnel...');
        const newPersonnel = await createPersonnel.mutateAsync(formData);
        personnelId = newPersonnel.id;
        console.log('[PersonnelForm] Personnel created:', personnelId);
      }

      // Handle PIX key if provided
      if (formData.pixKey.trim()) {
        await handlePixKeyUpdate(personnelId, formData.pixKey.trim());
      }

      toast({
        title: personnel ? "Pessoa atualizada" : "Pessoa cadastrada",
        description: personnel ? "Os dados foram atualizados com sucesso" : "Nova pessoa foi cadastrada com sucesso",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving personnel:', error);
      
      let errorMessage = "Ocorreu um erro ao salvar os dados";
      
      if (error instanceof Error) {
        if (error.message.includes('idx_personnel_cpf_unique')) {
          errorMessage = "CPF já cadastrado nesta equipe";
        } else if (error.message.includes('idx_personnel_cnpj_unique')) {
          errorMessage = "CNPJ já cadastrado nesta equipe";
        } else if (error.message.includes('duplicate key')) {
          errorMessage = "Dados duplicados. Verifique CPF/CNPJ.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro ao salvar",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fechamento com confirmação quando houver alterações não salvas
  const handleCloseRequest = () => {
    if (loading) return;
    if (isDirty) {
      const confirmClose = window.confirm('Existem alterações não salvas. Deseja descartar?');
      if (!confirmClose) return;
    }
    onClose();
  };

  const handlePixKeyUpdate = async (personnelId: string, pixKey: string) => {
    try {
      const { error } = await supabase.functions.invoke('pix-key/set', {
        body: { personnel_id: personnelId, pix_key: pixKey }
      });

      if (error) {
        console.error('Error updating PIX key:', error);
        toast({
          title: "Aviso",
          description: "Dados salvos, mas houve erro ao salvar a chave PIX",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error calling PIX key function:', error);
      toast({
        title: "Aviso", 
        description: "Dados salvos, mas houve erro ao salvar a chave PIX",
        variant: "destructive"
      });
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        // Fechar apenas se clicar no backdrop e não está salvando
        if (e.target === e.currentTarget && !loading) {
          if (isDirty) {
            const confirmClose = window.confirm('Existem alterações não salvas. Deseja descartar?');
            if (!confirmClose) return;
          }
          onClose();
        }
      }}
    >
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <PersonnelFormHeader personnel={personnel} onClose={handleCloseRequest} />
        <CardContent>
          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} autoComplete="off">
            <PersonnelFormFields 
          formData={formData}
          functions={functions}
          personnelId={personnel?.id}
          onFieldChange={handleFieldChange}
          onPhoneChange={handlePhoneChange}
        />
            
            <PersonnelFormActions
              loading={loading}
              onCancel={handleCloseRequest}
              hasUnsavedPhoto={formData.photo_url !== (personnel?.photo_url || '')}
            />
          </form>
        </CardContent>
      </Card>
      <UpgradePrompt
        open={upgradePromptOpen}
        onOpenChange={setUpgradePromptOpen}
        reason={limitCheckResult?.reason || ''}
        currentPlan={limitCheckResult?.current_plan}
        limit={limitCheckResult?.limit}
        currentCount={limitCheckResult?.current_count}
      />
    </div>
  );
};
