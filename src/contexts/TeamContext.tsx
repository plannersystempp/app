
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { TeamContextType, Team } from './team/types';
import { useTeamOperations } from './team/useTeamOperations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberCaps, setMemberCaps] = useState<{ canAccessSuppliers: boolean } | undefined>(undefined);

  const {
    inviteUserToTeam,
    removeUserFromTeam: removeUserFromTeamOp,
    updateMemberRole: updateMemberRoleOp,
    updateMemberStatus: updateMemberStatusOp,
    getTeamMembers: getTeamMembersOp
  } = useTeamOperations();

  const refreshTeams = async () => {
    if (!user) return;

    // Super admins não precisam de equipe ativa
    if (user.role === 'superadmin') {
      console.log('[TeamContext] User is superadmin, no active team needed');
      setActiveTeam(null);
      setUserRole('superadmin');
      setLoading(false);
      return;
    }

    // Apenas define loading=true se não houver time ativo, para evitar 
    // unmount/remount de componentes quando o objeto user é atualizado (ex: refresh de token)
    if (!activeTeam) {
      setLoading(true);
    }
    
    try {
      console.log('[TeamContext] Refreshing teams for user:', user.id, user.email);
      
      // First, try to get approved memberships with team data
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select('joined_at, role, status, teams!inner(*)')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('joined_at', { ascending: false });

      if (membershipError) {
        console.error('[TeamContext] Error fetching memberships:', membershipError);
      }

      // If we have approved memberships, use the most recent one
      if (memberships && memberships.length > 0) {
        const team = memberships[0].teams as unknown as Team;
        const role = user.role === 'admin' ? 'admin' : memberships[0].role;
        const caps = { canAccessSuppliers: !!(memberships[0] as any).can_access_suppliers };
        
        console.log('[TeamContext] Found approved membership - Team:', team.name, 'Role:', role);
        setActiveTeam(team);
        setUserRole(role);
        setMemberCaps(caps);
        setLoading(false);
        return;
      }

      console.log('[TeamContext] No approved memberships found, checking if user is team owner');

      // Fallback: Check if user owns any teams
      const { data: ownedTeams, error: ownedError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.error('[TeamContext] Error fetching owned teams:', ownedError);
        setActiveTeam(null);
        setUserRole(null);
      } else if (ownedTeams && ownedTeams.length > 0) {
        const team = ownedTeams[0];
        console.log('[TeamContext] User is owner of team:', team.name);
        setActiveTeam(team);
        setUserRole('admin');
        setMemberCaps({ canAccessSuppliers: true });
      } else {
        console.log('[TeamContext] No owned teams. Checking any membership regardless of status');
        const { data: anyMemberships, error: anyMembershipsError } = await supabase
          .from('team_members')
          .select('joined_at, role, status, teams!inner(*)')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false });

        if (anyMembershipsError) {
          console.error('[TeamContext] Error fetching any memberships:', anyMembershipsError);
          setActiveTeam(null);
          setUserRole(null);
        } else if (anyMemberships && anyMemberships.length > 0) {
          const team = anyMemberships[0].teams as unknown as Team;
          const role = user.role === 'admin' ? 'admin' : anyMemberships[0].role;
          console.log('[TeamContext] Using latest membership regardless of status - Team:', team.name, 'Role:', role);
          setActiveTeam(team);
          setUserRole(role);
          setMemberCaps({ canAccessSuppliers: !!(anyMemberships[0] as any).can_access_suppliers });
        } else {
          console.log('[TeamContext] No teams found for user - no membership or ownership');
          setActiveTeam(null);
          setUserRole(null);
        }
      }
    } catch (error) {
      console.error('[TeamContext] Error in refreshTeams:', error);
      setActiveTeam(null);
      setUserRole(null);
      setMemberCaps(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // Para super admins, não precisam de equipe ativa
      if (user.role === 'superadmin') {
        setActiveTeam(null);
        setUserRole('superadmin');
        setLoading(false);
      } else {
        refreshTeams();
      }
    } else {
      setActiveTeam(null);
      setUserRole(null);
      setMemberCaps(undefined);
      setLoading(false);
    }
  }, [user]);

  const getTeamMembers = async () => {
    if (!activeTeam) return [];
    return await getTeamMembersOp(activeTeam.id);
  };

  const removeUserFromTeam = async (userId: string) => {
    if (!activeTeam) {
      throw new Error('No active team');
    }
    return await removeUserFromTeamOp(userId, activeTeam.id);
  };

  const updateMemberRole = async (userId: string, newRole: 'admin' | 'coordinator' | 'financeiro') => {
    if (!activeTeam) {
      throw new Error('No active team');
    }
    return await updateMemberRoleOp(userId, activeTeam.id, newRole);
  };

  const updateMemberStatus = async (userId: string, newStatus: 'approved' | 'pending' | 'rejected') => {
    if (!activeTeam) {
      throw new Error('No active team');
    }
    return await updateMemberStatusOp(userId, activeTeam.id, newStatus);
  };

  const value: TeamContextType = {
    teams: activeTeam ? [activeTeam] : [],
    activeTeam,
    userRole,
    loading,
    memberCaps,
    setActiveTeam: () => {}, // No longer needed since there's only one team
    refreshTeams,
    createTeam: async () => { throw new Error('Team creation not supported in single-team mode'); },
    inviteUserToTeam,
    removeUserFromTeam,
    updateMemberRole,
    updateMemberStatus,
    getTeamMembers,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
