export type AppPermission =
  | 'finance'
  | 'suppliers'
  | 'billing'
  | 'admin'
  | 'superadmin';

export type TeamUserRole = 'admin' | 'coordinator' | 'financeiro' | 'user' | 'superadmin' | string;

export type MemberCapabilities = {
  canAccessSuppliers?: boolean;
};

export const getUserPermissions = (input: {
  userRole: TeamUserRole | null;
  memberCaps?: MemberCapabilities;
}): Set<AppPermission> => {
  const { userRole, memberCaps } = input;

  if (!userRole) return new Set();

  if (userRole === 'superadmin') {
    return new Set<AppPermission>(['superadmin', 'admin', 'billing', 'finance', 'suppliers']);
  }

  if (userRole === 'admin') {
    return new Set<AppPermission>(['admin', 'billing', 'finance', 'suppliers']);
  }

  if (userRole === 'financeiro') {
    return new Set<AppPermission>(['finance']);
  }

  if (userRole === 'coordinator') {
    const perms = new Set<AppPermission>();
    if (memberCaps?.canAccessSuppliers) perms.add('suppliers');
    return perms;
  }

  return new Set();
};

export const hasAllPermissions = (input: {
  userPermissions: Set<AppPermission>;
  required?: AppPermission | AppPermission[];
}): boolean => {
  const { userPermissions, required } = input;
  if (!required) return true;

  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.every((perm) => userPermissions.has(perm));
};

