
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Viagens } from './pages/Viagens';
import { Frota } from './pages/Frota';
import { Alertas } from './pages/Alertas';
import { Relatorios } from './pages/Relatorios';
import { Configuracoes } from './pages/Configuracoes';
import { Equipe } from './pages/Equipe';
import { Usuarios } from './pages/Usuarios'; 
import { PlanosSaude } from './pages/PlanosSaude';
import { BackupSystem } from './pages/BackupSystem'; 
import { AdminDashboard } from './pages/AdminDashboard';
import { OrgDashboard } from './pages/OrgDashboard';
import { DriverLogin } from './pages/driver/DriverLogin';
import { DriverHome } from './pages/driver/DriverHome';

import { AuthProvider, useAuth } from './services/authContext';
import { ShieldCheck } from 'lucide-react';
import { UserRole } from './types';

const normalizeRole = (role: string): UserRole => {
  if (role === "admin") return UserRole.SUPER_ADMIN;
  return role as UserRole;
};

const ProtectedRoute = ({ children, roles }: { children?: React.ReactNode, roles?: string[] }) => {
  const { user, loading, hasRole, userReady } = useAuth();
  const location = useLocation();

  if (loading || !userReady) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
                <div className="animate-pulse flex flex-col items-center text-center">
                    <div className="h-20 w-20 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg mb-6">
                        <ShieldCheck className="h-12 w-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-widest mb-2">FROTAPRO GOV</h2>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div className="bg-brand-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Verificando autenticação...</p>
                    <p className="text-xs text-gray-400">Carregando estrutura Supabase</p>
                    
                    {/* Timeout warning após 10 segundos */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-amber-600">
                            Se demorar mais de 15 segundos, 
                            <button 
                                onClick={() => window.location.reload()} 
                                className="text-brand-600 hover:text-brand-700 font-semibold ml-1 underline"
                            >
                                recarregue a página
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  if (!user) {
    if (location.pathname === '/login' || location.pathname === '/driver') {
      return <>{children}</>;
    }
    if (location.pathname.startsWith('/driver')) return <Navigate to="/driver" replace />;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && roles) {
      const userRole = normalizeRole(user.role);
      
      if (userRole === UserRole.MOTORISTA && !roles.includes(UserRole.MOTORISTA)) {
          if (location.pathname === '/driver/home') return <>{children}</>;
          return <Navigate to="/driver/home" replace />;
      }

      const hasPermission = roles.some(role => hasRole(role) || userRole === role);
      
      if (!hasPermission) {
           // Em vez de redirecionar para login (que causaria loop se já logado), redireciona para a home correta
           return <Navigate to="/" replace />; 
      }
  }

  return <>{children}</>;
};

const DashboardRedirect = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;

    const role = normalizeRole(user.role);

    if (role === UserRole.SUPER_ADMIN) return <Navigate to="/admin" replace />;
    
    const isOrgLevel = [
        UserRole.ORG_ADMIN, 
        UserRole.ADMIN_TENANT, 
        UserRole.ADMIN_SECRETARIA, 
        UserRole.GESTOR, 
        UserRole.COORDENADOR
    ].includes(role);

    if (isOrgLevel) return <Navigate to="/org-dashboard" replace />;
    if (role === UserRole.MOTORISTA) return <Navigate to="/driver/home" replace />;

    return <Navigate to="/viagens" replace />;
};

const ADMIN_ROLES = [
    UserRole.PADRAO, 
    UserRole.COORDENADOR, 
    UserRole.DIRETOR, 
    UserRole.GESTOR, 
    UserRole.ORG_ADMIN, 
    UserRole.ADMIN_TENANT,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_SECRETARIA
];

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/driver" element={<DriverLogin />} />
          
          <Route path="/driver/home" element={
              <ProtectedRoute roles={[UserRole.MOTORISTA]}>
                  <DriverHome />
              </ProtectedRoute>
          } />

          <Route path="/admin" element={
              <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
                  <AdminDashboard />
              </ProtectedRoute>
          } />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardRedirect />} />
            <Route path="viagens" element={<ProtectedRoute roles={ADMIN_ROLES}><Viagens /></ProtectedRoute>} />
            <Route path="frota" element={<ProtectedRoute roles={ADMIN_ROLES}><Frota /></ProtectedRoute>} />
            <Route path="equipe" element={<ProtectedRoute roles={ADMIN_ROLES}><Equipe /></ProtectedRoute>} />
            <Route path="planos-saude" element={<ProtectedRoute roles={ADMIN_ROLES}><PlanosSaude /></ProtectedRoute>} />
            <Route path="alertas" element={<ProtectedRoute roles={ADMIN_ROLES}><Alertas /></ProtectedRoute>} />
            <Route path="relatorios" element={<ProtectedRoute roles={ADMIN_ROLES}><Relatorios /></ProtectedRoute>} />
            <Route path="usuarios" element={<ProtectedRoute roles={[UserRole.DIRETOR, UserRole.ORG_ADMIN, UserRole.ADMIN_TENANT]}><Usuarios /></ProtectedRoute>} />
            <Route path="backup" element={<ProtectedRoute roles={[UserRole.DIRETOR, UserRole.ORG_ADMIN, UserRole.ADMIN_TENANT]}><BackupSystem /></ProtectedRoute>} />
            <Route path="configuracoes" element={<ProtectedRoute roles={ADMIN_ROLES}><Configuracoes /></ProtectedRoute>} />
          </Route>

          <Route path="/org-dashboard/*" element={
              <ProtectedRoute roles={[UserRole.ORG_ADMIN, UserRole.ADMIN_TENANT, UserRole.COORDENADOR, UserRole.GESTOR, UserRole.ADMIN_SECRETARIA]}>
                  <OrgDashboard />
              </ProtectedRoute>
          } />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
