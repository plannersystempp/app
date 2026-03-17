export type ErrorFeedback = {
  title: string;
  description: string;
};

type SupabaseLikeError = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isSupabaseLikeError = (value: unknown): value is SupabaseLikeError => {
  if (!isRecord(value)) return false;
  return 'message' in value || 'details' in value || 'hint' in value || 'code' in value;
};

const normalizeString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const friendlyFieldLabel = (field: string): string => {
  const normalized = field.trim().toLowerCase();
  const map: Record<string, string> = {
    cpf: 'CPF',
    cnpj: 'CNPJ',
    name: 'Nome',
    email: 'E-mail',
    phone: 'Telefone',
    phone_secondary: 'Telefone secundário',
    team_id: 'Equipe',
  };
  return map[normalized] ?? field;
};

const parseDuplicateKeyDetails = (details: string): { field?: string; value?: string } => {
  const match = details.match(/Key \(([^)]+)\)=\(([^)]+)\)/i);
  if (!match) return {};
  return { field: match[1], value: match[2] };
};

const inferDuplicateFriendlyMessage = (message: string, details?: string | null): string | undefined => {
  if (message.includes('idx_personnel_cpf_unique')) return 'CPF já cadastrado nesta equipe.';
  if (message.includes('idx_personnel_cnpj_unique')) return 'CNPJ já cadastrado nesta equipe.';

  if (details) {
    const parsed = parseDuplicateKeyDetails(details);
    if (parsed.field) {
      const label = friendlyFieldLabel(parsed.field);
      return parsed.value
        ? `${label} já cadastrado: ${parsed.value}.`
        : `${label} já cadastrado.`;
    }
  }

  if (message.toLowerCase().includes('duplicate key')) return 'Dados duplicados. Verifique CPF/CNPJ/Telefone.';
  return undefined;
};

const inferNotNullFriendlyMessage = (message: string): string | undefined => {
  const match = message.match(/null value in column "([^"]+)"/i);
  if (!match) return undefined;
  const label = friendlyFieldLabel(match[1]);
  return `O campo ${label} é obrigatório.`;
};

export const getErrorFeedback = (error: unknown): ErrorFeedback => {
  if (error instanceof Error) {
    const message = error.message || 'Ocorreu um erro inesperado.';
    const notNullMsg = inferNotNullFriendlyMessage(message);
    const duplicateMsg = inferDuplicateFriendlyMessage(message);
    return {
      title: 'Erro ao salvar',
      description: duplicateMsg ?? notNullMsg ?? message,
    };
  }

  if (isSupabaseLikeError(error)) {
    const message = normalizeString(error.message) ?? 'Ocorreu um erro ao salvar os dados.';
    const details = error.details ?? undefined;
    const code = error.code ?? undefined;

    if (code === '23505') {
      const duplicateMsg = inferDuplicateFriendlyMessage(message, details ?? null);
      return {
        title: 'Erro ao salvar',
        description: duplicateMsg ?? 'Já existe um registro com os mesmos dados (duplicado).',
      };
    }

    if (code === '23502') {
      const notNullMsg = inferNotNullFriendlyMessage(message);
      return {
        title: 'Campos obrigatórios',
        description: notNullMsg ?? 'Um campo obrigatório não foi informado.',
      };
    }

    if (code === '42501') {
      return {
        title: 'Permissão insuficiente',
        description: 'Você não tem permissão para executar esta ação.',
      };
    }

    const hint = normalizeString(error.hint);
    const composed = [message, details, hint].filter(Boolean).join(' — ');
    return {
      title: 'Erro ao salvar',
      description: composed || 'Ocorreu um erro ao salvar os dados.',
    };
  }

  return {
    title: 'Erro ao salvar',
    description: 'Ocorreu um erro ao salvar os dados. Tente novamente.',
  };
};

