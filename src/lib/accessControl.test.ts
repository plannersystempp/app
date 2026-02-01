import { describe, expect, it } from 'vitest';
import { getUserPermissions, hasAllPermissions } from '@/lib/accessControl';

describe('accessControl', () => {
  it('nega permissões financeiras para coordinator por padrão', () => {
    const perms = getUserPermissions({ userRole: 'coordinator' });
    expect(hasAllPermissions({ userPermissions: perms, required: 'finance' })).toBe(false);
  });

  it('permite suppliers para coordinator quando canAccessSuppliers=true', () => {
    const perms = getUserPermissions({ userRole: 'coordinator', memberCaps: { canAccessSuppliers: true } });
    expect(hasAllPermissions({ userPermissions: perms, required: 'suppliers' })).toBe(true);
  });

  it('permite finance para financeiro', () => {
    const perms = getUserPermissions({ userRole: 'financeiro' });
    expect(hasAllPermissions({ userPermissions: perms, required: 'finance' })).toBe(true);
  });

  it('admin não recebe superadmin', () => {
    const perms = getUserPermissions({ userRole: 'admin' });
    expect(hasAllPermissions({ userPermissions: perms, required: 'superadmin' })).toBe(false);
  });
});

