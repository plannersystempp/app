import { matchPath } from 'react-router-dom';
import type { AppPermission } from '@/lib/accessControl';

export type RouteAccessRule = {
  pattern: string;
  pageLabel: string;
  required?: AppPermission | AppPermission[];
};

export const routeAccessRules: RouteAccessRule[] = [
  { pattern: '/app/fornecedores', pageLabel: 'Fornecedores', required: 'suppliers' },
  { pattern: '/app/fornecedores/exportar', pageLabel: 'Exportar Fornecedores', required: 'suppliers' },

  { pattern: '/app/custos', pageLabel: 'Custos', required: 'finance' },
  { pattern: '/app/folha', pageLabel: 'Folha de Pagamento', required: 'finance' },
  { pattern: '/app/folha/:eventId', pageLabel: 'Visualização da Folha', required: 'finance' },
  { pattern: '/app/folha/mensal', pageLabel: 'Folha Mensal', required: 'finance' },
  { pattern: '/app/folha/relatorio/:eventId', pageLabel: 'Relatório de Folha', required: 'finance' },
  { pattern: '/app/pagamentos-avulsos', pageLabel: 'Pagamentos Avulsos', required: 'finance' },
  { pattern: '/app/pagamentos-avulsos/relatorio', pageLabel: 'Relatório de Pagamentos Avulsos', required: 'finance' },
  { pattern: '/app/previsao-pagamentos', pageLabel: 'Previsão de Pagamentos', required: 'finance' },
  { pattern: '/app/previsao-pagamentos/relatorio', pageLabel: 'Relatório de Previsão de Pagamentos', required: 'finance' },
  { pattern: '/app/relatorios/pagamentos-fornecedores', pageLabel: 'Relatório de Pagamentos de Fornecedores', required: 'finance' },

  { pattern: '/app/upgrade', pageLabel: 'Upgrade', required: 'billing' },
  { pattern: '/app/plans', pageLabel: 'Planos', required: 'billing' },
  { pattern: '/app/subscription', pageLabel: 'Assinatura', required: 'billing' },
  { pattern: '/app/admin/configuracoes', pageLabel: 'Admin - Configurações', required: 'admin' },
  { pattern: '/app/admin/telemetria-erros', pageLabel: 'Admin - Telemetria de Erros', required: 'admin' },
  { pattern: '/app/superadmin', pageLabel: 'Super Admin', required: 'superadmin' },
  { pattern: '/app/debug/set-role-admin', pageLabel: 'Debug - Set Role Admin', required: 'admin' },
];

export const findRouteAccessRule = (pathname: string): RouteAccessRule | null => {
  for (const rule of routeAccessRules) {
    if (matchPath({ path: rule.pattern, end: true }, pathname)) return rule;
  }
  return null;
};
