
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { AppUser, AuthContextType } from '@/types/auth';
import { loginUser, signupUser, logoutUser } from '@/services/authService';
import { queryClient } from '@/providers/QueryProvider';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEBUG_LOGS = (import.meta as any)?.env?.VITE_DEBUG_LOGS === 'false';
const debugLog = (...args: any[]) => { if (DEBUG_LOGS) console.log(...args); };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleAuthChange = (event: string, session: Session | null) => {
      debugLog('Auth state change:', event, session?.user?.email);
      
      if (!mounted) return;

      const currentUserId = session?.user?.id || null;
      const previousUserId = previousUserIdRef.current;

      // Detect user change or signout
      if (previousUserId !== currentUserId) {
        debugLog('[AuthContext] User changed from', previousUserId, 'to', currentUserId);
        debugLog('[AuthContext] Clearing React Query cache');
        queryClient.clear();
        
        // Clear any session storage items related to the app
        try {
          Object.keys(sessionStorage)
            .filter(k => k.startsWith('plannersystem-'))
            .forEach(k => sessionStorage.removeItem(k));
        } catch (e) {
          console.error('[AuthContext] Error clearing sessionStorage:', e);
        }
      }

      // Update the ref for next comparison
      previousUserIdRef.current = currentUserId;

      // Only sync state updates here to avoid deadlocks
      setSession(session);
      
      if (session?.user) {
        debugLog('User authenticated, deferring profile fetch');
        // Defer the async profile fetch to avoid deadlocks
        setTimeout(() => {
          if (mounted) {
            fetchUserProfile(session.user.id, session.user.email);
          }
        }, 0);
      } else {
        debugLog('No session user, setting user to null');
        setUser(null);
        setIsLoading(false);
      }
    };

    const fetchUserProfile = async (userId: string, userEmail: string | undefined) => {
      if (!mounted) return;
      
      try {
        debugLog('Fetching user profile for:', userEmail);
        
        // Use maybeSingle to avoid errors when no profile exists
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error('Error fetching user profile:', error);
          // Try to create profile using RPC function
          const { error: createError } = await supabase.rpc('ensure_user_profile', {
            p_user_id: userId,
            p_email: userEmail || '',
            p_name: userEmail || 'Usuário'
          });
          
          if (createError) {
            console.error('Error creating user profile:', createError);
            setUser(null);
          } else {
            // Retry fetching after creation
            setTimeout(() => {
              if (mounted) {
                fetchUserProfile(userId, userEmail);
              }
            }, 100);
          }
          return;
        }

        if (profile) {
          // Combinar dados de autenticação com perfil
          const enhancedUser: AppUser = {
            id: userId,
            email: userEmail || '',
            role: profile.role as AppUser['role'],
            name: profile.name || userEmail || 'Usuário',
            isApproved: profile.is_approved
          };
          
          debugLog('Enhanced user created:', enhancedUser);
          setUser(enhancedUser);
        } else {
          debugLog('No profile found for user, creating one');
          // Create profile using RPC function
          const { error: createError } = await supabase.rpc('ensure_user_profile', {
            p_user_id: userId,
            p_email: userEmail || '',
            p_name: userEmail || 'Usuário'
          });
          
          if (createError) {
            console.error('Error creating user profile:', createError);
            setUser(null);
          } else {
            // Retry fetching after creation
            setTimeout(() => {
              if (mounted) {
                fetchUserProfile(userId, userEmail);
              }
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error in fetchUserProfile:', error);
        setUser(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const initializeAuth = async () => {
      // Safety timeout to prevent infinite loading
      const safetyTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('Auth initialization timed out, forcing loading state to false');
          setIsLoading(false);
        }
      }, 5000);

      try {
        debugLog('Initializing auth...');
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();

        clearTimeout(safetyTimeout);

        if (error) {
          console.error('Error getting session:', error);
          const msg = (error.message || '').toLowerCase();
          const isRefreshMissing = msg.includes('refresh token not found') || msg.includes('refresh_token_not_found');
          const isInvalidRefresh = msg.includes('invalid refresh token');

          if (isRefreshMissing || isInvalidRefresh) {
            console.warn('Invalid or missing refresh token detected. Clearing session and redirecting to login.');
            try {
              // Force clear any persisted Supabase auth state
              await supabase.auth.signOut();
              // Also clear possible leftover keys to be safe
              Object.keys(localStorage)
                .filter(k => k.startsWith('sb-') || k.startsWith('supabase'))
                .forEach(k => {
                  try { localStorage.removeItem(k); } catch {}
                });
            } catch (signOutErr) {
              console.error('Error during forced signOut:', signOutErr);
            }
            // Ensure local state reflects signed out
            handleAuthChange('FORCED_SIGNOUT_DUE_TO_REFRESH_ERROR', null);
            return;
          }
        }

        debugLog('Initial session retrieved:', session?.user?.email);
        handleAuthChange('INITIAL_SESSION', session);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange(event, session);
    });

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    debugLog('Login attempt for:', email);
    try {
      const result = await loginUser(email, password);
      if (result.error) {
        console.error('Login error:', result.error);
      } else {
        debugLog('Login successful');
      }
      return result;
    } catch (error) {
      console.error('Login exception:', error);
      return { error };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    debugLog('Signup attempt for:', email);
    try {
      const result = await signupUser(email, password, name);
      if (result.error) {
        console.error('Signup error:', result.error);
      } else {
        debugLog('Signup successful');
      }
      return result;
    } catch (error) {
      console.error('Signup exception:', error);
      return { error };
    }
  };

  const logout = async () => {
    debugLog('Logout attempt');
    setIsLoading(true);
    try {
      await logoutUser();
      debugLog('Logout successful');
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  debugLog('Auth state:', { user: user?.email, role: user?.role, isLoading });

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
