
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Func } from '@/contexts/EnhancedDataContext';
import { formatCurrency, formatCPF, formatCNPJ } from '@/utils/formatters';
import { FunctionMultiSelect } from './FunctionMultiSelect';
import { PersonnelPhotoUpload } from './PersonnelPhotoUpload';
import { useTeam } from '@/contexts/TeamContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, CheckCircle2, XCircle } from 'lucide-react';
import { useCPFValidation } from '@/hooks/useCPFValidation';
import {
  applyCEPMask,
  fetchAddressByCEP,
  BRAZILIAN_STATES
} from '@/utils/supplierUtils';
import type { PersonnelFormData } from '@/types/personnelForm';

interface PersonnelFormFieldsProps {
  formData: PersonnelFormData;
  functions: Func[];
  personnelId?: string;
  onFieldChange: (field: keyof PersonnelFormData, value: string | number | string[] | Record<string, number>) => void;
  onPhoneChange: (value: string) => void;
  onPhotoUploadingChange?: (uploading: boolean) => void;
}

export const PersonnelFormFields: React.FC<PersonnelFormFieldsProps> = ({
  formData,
  functions,
  personnelId,
  onFieldChange,
  onPhoneChange,
  onPhotoUploadingChange
}) => {
  const { userRole } = useTeam();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const [loadingCEP, setLoadingCEP] = useState(false);
  
  const cpfValidation = useCPFValidation(formData.cpf, personnelId);

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    
    if (cleaned.startsWith('+55')) {
      const numbers = cleaned.substring(3);
      if (numbers.length <= 11) {
        const formatted = numbers.length === 11 
          ? `+55 (${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`
          : numbers.length === 10
          ? `+55 (${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`
          : `+55 ${numbers}`;
        onPhoneChange(formatted);
      }
    } else {
      if (cleaned.length <= 11) {
        const formatted = cleaned.length === 11 
          ? cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
          : cleaned.length === 10
          ? cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
          : cleaned;
        onPhoneChange(formatted);
      }
    }
  };

  const handleCEPSearchAuto = async (cep: string) => {
    setLoadingCEP(true);
    try {
      const address = await fetchAddressByCEP(cep);
      if (address) {
        onFieldChange('address_street', address.street);
        onFieldChange('address_neighborhood', address.neighborhood);
        onFieldChange('address_city', address.city);
        onFieldChange('address_state', address.state);
        toast({
          title: 'Endereço encontrado!',
          description: 'Dados preenchidos automaticamente'
        });
      }
    } catch (error) {
      console.error('Error fetching CEP:', error);
    } finally {
      setLoadingCEP(false);
    }
  };

  useEffect(() => {
    const cep = formData.address_zip_code.replace(/\D/g, '');
    if (cep.length !== 8) return;

    const timer = setTimeout(() => {
      handleCEPSearchAuto(cep);
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.address_zip_code]);

  const handleCEPSearch = async () => {
    const cep = formData.address_zip_code.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast({
        title: 'CEP inválido',
        description: 'CEP deve ter 8 dígitos',
        variant: 'destructive'
      });
      return;
    }

    await handleCEPSearchAuto(cep);
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================
          SEÇÃO 1: FOTO (sempre visível)
      ======================================== */}
      <div className="pb-4 border-b">
        <PersonnelPhotoUpload
          currentPhotoUrl={formData.photo_url}
          personnelId={personnelId}
          personnelName={formData.name}
          onPhotoChange={(url) => onFieldChange('photo_url', url || '')}
          onUploadingChange={onPhotoUploadingChange}
        />
      </div>

        {/* ========================================
            SEÇÃO 2: DADOS OBRIGATÓRIOS
            (sempre visível, sem Accordion)
        ======================================== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base font-semibold">Dados Pessoais & Documentos</span>
            <span className="text-xs text-muted-foreground">(campos essenciais)</span>
          </div>

          {/* Nome * */}
          <div>
            <Label htmlFor="name">Nome Completo <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder="Nome completo do profissional"
              required
            />
          </div>

          {/* CPF * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cpf">CPF <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value);
                    onFieldChange('cpf', formatted);
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                  className={
                    formData.cpf && !cpfValidation.isChecking
                      ? cpfValidation.isValid
                        ? 'border-green-500'
                        : 'border-red-500'
                      : ''
                  }
                />
                {formData.cpf && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {cpfValidation.isChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : cpfValidation.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {formData.cpf && !cpfValidation.isValid && !cpfValidation.isChecking && (
                <p className="text-xs text-red-500 mt-1">{cpfValidation.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={formData.rg || ''}
                onChange={(e) => onFieldChange('rg', e.target.value)}
                placeholder="00.000.000-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birth_date">Data de Nascimento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date || ''}
                onChange={(e) => onFieldChange('birth_date', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="mothers_name">Nome da Mãe</Label>
              <Input
                id="mothers_name"
                value={formData.mothers_name || ''}
                onChange={(e) => onFieldChange('mothers_name', e.target.value)}
                placeholder="Nome completo da mãe"
              />
            </div>
          </div>

        {/* Tipo * */}
        <div>
          <Label htmlFor="type">Tipo <span className="text-red-500">*</span></Label>
          <Select 
            value={formData.type} 
            onValueChange={(value: 'fixo' | 'freelancer') => onFieldChange('type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="freelancer">Freelancer</SelectItem>
              <SelectItem value="fixo">Funcionário Fixo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Funções * */}
        <FunctionMultiSelect
          functions={functions}
          selectedFunctionIds={formData.functionIds}
          onSelectionChange={(functionIds) => onFieldChange('functionIds', functionIds)}
          primaryFunctionId={formData.primaryFunctionId}
          onPrimaryChange={(fid) => onFieldChange('primaryFunctionId', fid || '')}
          functionCaches={formData.functionCaches || {}}
          onCacheChange={(fid, val) => {
            const newCaches = { ...formData.functionCaches };
            if (val === null) {
              delete newCaches[fid];
            } else {
              newCaches[fid] = val;
            }
            onFieldChange('functionCaches', newCaches);
          }}
          functionOvertimes={formData.functionOvertimes || {}}
          onOvertimeChange={(fid, val) => {
            const newOvertimes = { ...formData.functionOvertimes };
            if (val === null) {
              delete newOvertimes[fid];
            } else {
              newOvertimes[fid] = val;
            }
            onFieldChange('functionOvertimes', newOvertimes);
          }}
          placeholder="Selecione as funções"
        />

        {/* Cachê por Evento * */}
        <div>
          <Label htmlFor="event_cache">Cachê por Evento <span className="text-red-500">*</span></Label>
          <CurrencyInput
            id="event_cache"
            value={formData.event_cache}
            onChange={(value) => onFieldChange('event_cache', value)}
            placeholder="R$ 450,00"
            required
            enterKeyHint="next"
            inputMode="numeric"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Valor do cachê diário; na conversão de HE, cada cachê cobre até 8h extras no mesmo dia.
          </p>
        </div>

        {/* Valor Hora Extra * */}
        <div>
          <Label htmlFor="overtime_rate">Valor Hora Extra <span className="text-red-500">*</span></Label>
          <CurrencyInput
            id="overtime_rate"
            value={formData.overtime_rate}
            onChange={(value) => onFieldChange('overtime_rate', value)}
            placeholder="R$ 37,50"
            required
            enterKeyHint="next"
            inputMode="numeric"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Valor por hora para HE avulsas (dias abaixo do limiar ou acima de 8h no dia).
          </p>
        </div>
      </div>

      {/* ========================================
          SEÇÃO 3: ACCORDIONS PARA OPCIONAIS
      ======================================== */}
      <Accordion type="multiple" defaultValue={[]} className="w-full">
        
        {/* =====================
            ACCORDION 1: CONTATO
        ===================== */}
        <AccordionItem value="contato">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span>📞</span>
              <span>Contato</span>
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => onFieldChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              {/* Telefone */}
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+55 (11) 99999-9999"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formato recomendado: +55 (XX) XXXXX-XXXX para melhor integração com WhatsApp
                </p>
              </div>

              {/* Telefone Secundário */}
              <div>
                <Label htmlFor="phone_secondary">Telefone Secundário</Label>
                <Input
                  id="phone_secondary"
                  value={formData.phone_secondary || ''}
                  onChange={(e) => onFieldChange('phone_secondary', e.target.value)}
                  placeholder="+55 (11) 98888-8888"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ================================
            ACCORDION 2: DADOS PROFISSIONAIS
        ================================ */}
        <AccordionItem value="profissional">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span>💼</span>
              <span>Dados Profissionais</span>
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {/* CNPJ */}
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => {
                    const formatted = formatCNPJ(e.target.value);
                    onFieldChange('cnpj', formatted);
                  }}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  🏢 Informe se pessoa jurídica
                </p>
              </div>

              {/* Salário Mensal (apenas tipo Fixo) */}
              {formData.type === 'fixo' && (
                <div>
                  <Label htmlFor="monthly_salary">Salário Mensal</Label>
                  <CurrencyInput
                    id="monthly_salary"
                    value={formData.monthly_salary}
                    onChange={(value) => onFieldChange('monthly_salary', value)}
                    placeholder="R$ 3.500,00"
                    enterKeyHint="next"
                    inputMode="numeric"
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  />
                </div>
              )}

              {/* Chave PIX (apenas admin) */}
              {isAdmin && (
                <div>
                  <Label htmlFor="pixKey">Chave PIX</Label>
                  <Input
                    id="pixKey"
                    value={formData.pixKey}
                    onChange={(e) => onFieldChange('pixKey', e.target.value)}
                    placeholder="Chave PIX para pagamentos"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    🔒 Informação sensível - visível apenas para administradores
                  </p>
                </div>
              )}

              {/* Tamanho da Camisa */}
              <div>
                <Label htmlFor="shirt_size">Tamanho da Camisa</Label>
                <Select 
                  value={formData.shirt_size || 'NOT_SELECTED'} 
                  onValueChange={(value) => {
                    onFieldChange('shirt_size', value === 'NOT_SELECTED' ? '' : value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Não informado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_SELECTED">Não informado</SelectItem>
                    <SelectItem value="PP">PP - Extra Pequeno</SelectItem>
                    <SelectItem value="P">P - Pequeno</SelectItem>
                    <SelectItem value="M">M - Médio</SelectItem>
                    <SelectItem value="G">G - Grande</SelectItem>
                    <SelectItem value="GG">GG - Extra Grande</SelectItem>
                    <SelectItem value="XG">XG - Extra Extra Grande</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  👕 Informação útil para gestão de uniformes e materiais
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ========================
            ACCORDION 3: ENDEREÇO
        ======================== */}
        <AccordionItem value="endereco">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span>Endereço</span>
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {/* CEP com busca automática */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="address_zip_code">CEP</Label>
                  <Input
                    id="address_zip_code"
                    value={formData.address_zip_code}
                    onChange={(e) => onFieldChange('address_zip_code', applyCEPMask(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div className="pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCEPSearch}
                    disabled={loadingCEP || formData.address_zip_code.replace(/\D/g, '').length !== 8}
                  >
                    {loadingCEP ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Logradouro e Número */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="address_street">Logradouro</Label>
                  <Input
                    id="address_street"
                    value={formData.address_street}
                    onChange={(e) => onFieldChange('address_street', e.target.value)}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    value={formData.address_number}
                    onChange={(e) => onFieldChange('address_number', e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>

              {/* Complemento e Bairro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    value={formData.address_complement}
                    onChange={(e) => onFieldChange('address_complement', e.target.value)}
                    placeholder="Apto, Sala, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="address_neighborhood">Bairro</Label>
                  <Input
                    id="address_neighborhood"
                    value={formData.address_neighborhood}
                    onChange={(e) => onFieldChange('address_neighborhood', e.target.value)}
                    placeholder="Nome do bairro"
                  />
                </div>
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address_city">Cidade</Label>
                  <Input
                    id="address_city"
                    value={formData.address_city}
                    onChange={(e) => onFieldChange('address_city', e.target.value)}
                    placeholder="Nome da cidade"
                  />
                </div>
                <div>
                  <Label htmlFor="address_state">Estado (UF)</Label>
                  <Select 
                    value={formData.address_state}
                    onValueChange={(value) => onFieldChange('address_state', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map(state => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
};
