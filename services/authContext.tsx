
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

  const fetchProfile = async (userId: string): Promise<AppUser | null> => {
    try {
      // Timeout para evitar requests infinitos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

      // Busca o membro primeiro
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', userId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      clearTimeout(timeoutId);

      if (memberError) {
        console.error("Erro ao buscar membro:", memberError.message);
        return null;
      }

      // Se não encontrou membro, retorna null em vez de tentar criar
      if (!memberData) {
        console.warn("Usuário não encontrado na tabela 'members'");
        return null;
      }

      // Lógica de Promoção Automática para o Proprietário/Admin Principal
      const ADMIN_EMAIL = 'frotaproapp@gmail.com'; 
      
      // Se o membro existe mas o e-mail é do admin e o papel não é SUPER_ADMIN, forçamos a atualização
      if (memberData.email.toLowerCase() === ADMIN_EMAIL && memberData.role !== UserRole.SUPER_ADMIN) {
        console.info("Promovendo usuário proprietário para SUPER_ADMIN...");
        await supabase
          .from('members')
          .update({ role: UserRole.SUPER_ADMIN })
          .eq('id', userId);
        memberData.role = UserRole.SUPER_ADMIN;
      }

      // VERIFICAÇÃO DE ADMIN_TENANT PARA MEMBRO EXISTENTE: 
      // Se ele for o e-mail da org mas não tiver o papel correto, promove
      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('email', memberData.email.toLowerCase())
        .maybeSingle();

      if (currentOrg && memberData.role !== UserRole.ADMIN_TENANT && memberData.role !== UserRole.SUPER_ADMIN) {
        console.info("Promovendo e-mail da organização para ADMIN_TENANT...");
        await supabase
          .from('members')
          .update({ 
            role: UserRole.ADMIN_TENANT,
            organization_id: currentOrg.id 
          })
          .eq('id', userId);
        memberData.role = UserRole.ADMIN_TENANT;
        memberData.organization_id = currentOrg.id;
      }

      // Busca a organização separadamente se houver um organization_id válido
      let orgData = null;
      if (memberData.organization_id && memberData.organization_id !== 'null' && memberData.organization_id !== '') {
        try {
          const { data, error: orgError } = await supabase
            .from('organizations')
            .select('license_type, active')
            .eq('id', memberData.organization_id)
            .maybeSingle();
          
          if (!orgError) {
            orgData = data;
          }
        } catch (orgError) {
          console.warn("Erro ao buscar organização, continuando sem dados da org:", orgError);
        }
      }

      return {
        id: memberData.id,
        email: memberData.email,
        role: memberData.role as UserRole,
        name: memberData.name,
        organization_id: memberData.organization_id || '',
        tenantId: memberData.organization_id || '',
        secretariaId: memberData.secretaria_id,
        license_status: (orgData?.active ? 'ACTIVE' : 'SUSPENDED') as LicenseStatus
      };
    } catch (err) {
      console.error("Exceção ao buscar perfil:", err);
      // Retorna null em vez de tentar criar automaticamente para evitar loops
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        // Timeout de segurança para evitar loading infinito
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Timeout de inicialização de auth excedido - forçando resolução');
            setLoading(false);
            setUserReady(true);
            setUser(null);
          }
        }, 15000); // 15 segundos timeout

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          if (mounted) {
            setLoading(false);
            setUserReady(true);
            setUser(null);
          }
          return;
        }

        if (session?.user) {
          console.log('Sessão encontrada, buscando perfil...');
          const profile = await fetchProfile(session.user.id);
          
          if (mounted) {
            setUser(profile);
            setLoading(false);
            setUserReady(true);
          }
        } else {
          console.log('Nenhuma sessão ativa encontrada');
          if (mounted) {
            setUser(null);
            setLoading(false);
            setUserReady(true);
          }
        }
      } catch (error) {
        console.error('Erro durante inicialização de auth:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
          setUserReady(true);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'session exists' : 'no session');
      
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) {
          setUser(profile);
          setLoading(false);
          setUserReady(true);
        }
      } else {
        if (mounted) {
          setUser(null);
          setLoading(false);
          setUserReady(true);
        }
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
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
