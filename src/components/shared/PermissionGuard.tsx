import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { getUserPermissions, hasAllPermissions, type AppPermission } from '@/lib/accessControl';
import { useAccessControl } from '@/contexts/AccessControlContext';
import { logUnauthorizedRouteAttempt } from '@/services/accessAuditService';

export const PermissionGuard: React.FC<{
  pageLabel: string;
  required?: AppPermission | AppPermission[];
  children: React.ReactNode;
}> = ({ pageLabel, required, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { userRole, memberCaps, activeTeam, loading: teamLoading } = useTeam();
  const { denyAccess } = useAccessControl();
  const handledRef = useRef(false);

  const userPermissions = useMemo(() => {
    return getUserPermissions({ userRole, memberCaps });
  }, [userRole, memberCaps]);

  const allowed = useMemo(() => {
    return hasAllPermissions({ userPermissions, required });
  }, [userPermissions, required]);

  useEffect(() => {
    if (authLoading || teamLoading) return;
    if (!user) return;
    if (allowed) return;
    if (handledRef.current) return;
    handledRef.current = true;

    const attemptedPath = location.pathname;
    const fallback = sessionStorage.getItem('lastRoute') || '/app';

    denyAccess({
      pageLabel,
      path: attemptedPath,
    });

    logUnauthorizedRouteAttempt({
      userId: user.id,
      teamId: activeTeam?.id ?? null,
      path: attemptedPath,
      pageLabel,
      userRole,
    });

    navigate(fallback, { replace: true, state: { skipRouteSave: true } });
  }, [activeTeam?.id, allowed, authLoading, denyAccess, location.pathname, navigate, pageLabel, teamLoading, user, userRole]);

  if (authLoading || teamLoading) return null;
  if (!user) return null;
  if (!allowed) return null;

  return <>{children}</>;
};

