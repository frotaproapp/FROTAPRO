
import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error, status } = await supabase
        .from('members')
        .select('*, organizations(license_type, active)')
        .eq('id', userId)
        .single();

      if (error) {
        if (status === 404) {
          console.error("Erro 404: Tabela 'members' não encontrada ou acesso negado. Verifique o banco de dados.");
        } else {
          console.error("Erro ao buscar perfil:", error.message);
        }
        return null;
      }

      if (!data) return null;

      const orgData = data.organizations as any;

      return {
        id: data.id,
        email: data.email,
        role: data.role as UserRole,
        name: data.name,
        organization_id: data.organization_id,
        tenantId: data.organization_id,
        secretariaId: data.secretaria_id,
        license_status: (orgData?.active ? 'ACTIVE' : 'SUSPENDED') as LicenseStatus
      };
    } catch (err) {
      console.error("Exceção ao buscar perfil:", err);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      }
      setLoading(false);
      setUserReady(true);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
      setUserReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
