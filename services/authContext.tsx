
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { UserRole, LicenseStatus } from '../types';
import { supabase } from './supabaseClient';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  organization_id: string;
  tenantId?: string; // Para compatibilidade com componentes legados
  secretariaId?: string | null;
  license_status: LicenseStatus;
}

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  loading: boolean;
  refreshSession: () => Promise<void>;
  userReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userReady, setUserReady] = useState(false);

  const initializing = useRef(true);

  const fetchProfile = async (userId: string): Promise<AppUser | null> => {
    try {
      console.log('Buscando perfil para userId:', userId);
      
      // Busca o membro primeiro - query otimizada
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, email, name, role, organization_id, secretaria_id')
        .eq('id', userId)
        .single();

      if (memberError) {
        console.error("Erro ao buscar membro:", memberError.message);
        return null;
      }

      if (!memberData) {
        console.warn("Usuário não encontrado na tabela 'members'");
        return null;
      }

      console.log('Membro encontrado:', memberData.name);

      // Busca rápida do status da organização (se existir)
      let license_status: LicenseStatus = LicenseStatus.ACTIVE;
      if (memberData.organization_id) {
        try {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('active')
            .eq('id', memberData.organization_id)
            .single();
          
          license_status = orgData?.active ? LicenseStatus.ACTIVE : LicenseStatus.SUSPENDED;
        } catch (orgError) {
          console.warn("Erro ao buscar org, assumindo ACTIVE:", orgError);
        }
      }

      const userProfile = {
        id: memberData.id,
        email: memberData.email,
        role: memberData.role as UserRole,
        name: memberData.name,
        organization_id: memberData.organization_id || '',
        tenantId: memberData.organization_id || '',
        secretariaId: memberData.secretaria_id,
        license_status
      };

      console.log('Perfil carregado com sucesso para:', memberData.name);
      return userProfile;
      
    } catch (err) {
      console.error("Exceção ao buscar perfil:", err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (initializing.current) return;

      if (event === 'SIGNED_IN' && session) {
        const memberData = await fetchProfile(session.user.id);
        if (mounted) {
          setUser(memberData);
          setUserReady(true);
          setLoading(false);
          console.log('Auth estabilizado via onAuthStateChange.');
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setUserReady(true);
          setLoading(false);
        }
      }
    });

    const initAuth = async () => {
      console.log('Iniciando autenticação...');

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          console.log('Sessão encontrada, buscando perfil...');
          const profile = await fetchProfile(session.user.id);

          if (mounted) {
            setUser(profile);
          }
        } else {
          if (mounted) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setUserReady(true);
        }
        console.log('Auth estabilizado.');
        initializing.current = false;
      }
    };

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const logout = async () => {
    try {
      console.log('Iniciando logout...');
      
      // Limpa estado local primeiro
      setUser(null);
      setLoading(true);
      setUserReady(false);
      
      // Limpa cache localStorage/sessionStorage relacionado ao Supabase
      if (typeof window !== 'undefined') {
        try {
          // Remove chaves relacionadas ao Supabase
          const keysToRemove = Object.keys(localStorage).filter(key => 
            key.startsWith('sb-') || key.includes('supabase')
          );
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          // Limpa sessionStorage também
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase')) {
              sessionStorage.removeItem(key);
            }
          });
        } catch (storageError) {
          console.warn('Erro ao limpar storage:', storageError);
        }
      }
      
      // Faz logout no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro no logout do Supabase:', error);
      } else {
        console.log('Logout do Supabase realizado com sucesso');
      }
      
      // Força redirecionamento e reload para garantir limpeza completa
      window.location.href = '/#/login';
      window.location.reload();
      
    } catch (error) {
      console.error('Erro durante logout:', error);
      // Mesmo com erro, força redirecionamento
      window.location.href = '/#/login';
    }
  };

  const hasRole = (role: string) => {
    if (!user) return false;
    if (user.role === UserRole.SUPER_ADMIN) return true;
    return user.role === role.toUpperCase();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole, loading, userReady, refreshSession: async () => {} }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
