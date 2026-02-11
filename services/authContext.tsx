
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
      // Busca o membro primeiro
      const { data: memberData, error: memberError, status } = await supabase
        .from('members')
        .select('*')
        .eq('id', userId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (memberError) {
        console.error("Erro ao buscar membro:", memberError.message);
        return null;
      }

      // Lógica de Promoção Automática para o Proprietário/Admin Principal
      const ADMIN_EMAIL = 'frotaproapp@gmail.com'; // Altere para o e-mail real do proprietário
      
      if (!memberData) {
        console.warn("Usuário não encontrado na tabela 'members'. Tentando auto-criação...");
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const isSystemOwner = session.user.email === ADMIN_EMAIL;

        // Tenta criar o registro do membro automaticamente
        const newMember = {
          id: userId,
          email: session.user.email,
          name: session.user.user_metadata?.name || (isSystemOwner ? 'Administrador Sistema' : 'Novo Usuário'),
          role: isSystemOwner ? UserRole.SUPER_ADMIN : UserRole.PADRAO,
          active: true,
          organization_id: session.user.user_metadata?.organization_id || null
        };

        const { data: createdData, error: createError } = await supabase
          .from('members')
          .insert([newMember])
          .select()
          .maybeSingle();

        if (createError) {
          console.error("Erro ao auto-criar membro:", createError.message);
          return {
            id: userId,
            email: session.user.email || '',
            role: isSystemOwner ? UserRole.SUPER_ADMIN : UserRole.PADRAO,
            name: session.user.user_metadata?.name || (isSystemOwner ? 'Administrador Sistema' : 'Novo Usuário'),
            organization_id: '',
            tenantId: '',
            secretariaId: null,
            license_status: 'ACTIVE' as LicenseStatus
          };
        }

        return {
          id: createdData.id,
          email: createdData.email,
          role: createdData.role as UserRole,
          name: createdData.name,
          organization_id: createdData.organization_id,
          tenantId: createdData.organization_id,
          secretariaId: createdData.secretaria_id,
          license_status: 'ACTIVE' as LicenseStatus
        };
      }

      // Se o membro existe mas o e-mail é do admin e o papel não é SUPER_ADMIN, forçamos a atualização
      if (memberData.email === ADMIN_EMAIL && memberData.role !== UserRole.SUPER_ADMIN) {
        console.info("Promovendo usuário proprietário para SUPER_ADMIN...");
        await supabase
          .from('members')
          .update({ role: UserRole.SUPER_ADMIN })
          .eq('id', userId);
        memberData.role = UserRole.SUPER_ADMIN;
      }

      // Busca a organização separadamente se houver um organization_id válido
      let orgData = null;
      if (memberData.organization_id) {
        const { data, error: orgError } = await supabase
          .from('organizations')
          .select('license_type, active')
          .eq('id', memberData.organization_id)
          .maybeSingle();
        
        if (orgError) {
          console.error("Erro ao buscar organização:", orgError.message);
        } else {
          orgData = data;
        }
      }

      return {
        id: memberData.id,
        email: memberData.email,
        role: memberData.role as UserRole,
        name: memberData.name,
        organization_id: memberData.organization_id,
        tenantId: memberData.organization_id,
        secretariaId: memberData.secretaria_id,
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
