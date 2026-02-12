import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/authContext';
import { 
  Map, 
  AlertTriangle, 
  FileText, 
  LogOut, 
  Menu, 
  Wifi, 
  WifiOff, 
  Ambulance, 
  Settings, 
  Users, 
  ShieldCheck, 
  ChevronRight, 
  UserCog, 
  Heart, 
  Lock, 
  Database,
  ShieldAlert, // Icone para DR
  Activity // Icone para Continuity
} from 'lucide-react';
import { dbOps } from '../services/db';
import { UserRole, LicenseStatus } from '../types';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { ChangePasswordModal } from './ChangePasswordModal';
import { Logo } from './Logo';

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [municipalityName, setMunicipalityName] = useState('FROTAPRO');
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>(LicenseStatus.ACTIVE);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    
    const loadSettings = async () => {
      try {
        const settings = await api.settings.get();
        if (settings.municipalityName) setMunicipalityName(settings.municipalityName);
        if (settings.logoBase64) setLogoBase64(settings.logoBase64);
        const perms = await api.admin.license.getPermissions();
        setLicenseStatus(perms.status);
      } catch (e) {}
    }

    loadSettings();
    window.addEventListener('settings-updated', loadSettings);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      window.removeEventListener('settings-updated', loadSettings);
    };
  }, [user]); 

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { to: '/viagens', icon: Map, label: 'Viagens & Pacientes', roles: [UserRole.PADRAO, UserRole.COORDENADOR, UserRole.DIRETOR] },
    { to: '/frota', icon: Ambulance, label: 'Gestão de Frota', roles: [UserRole.PADRAO, UserRole.COORDENADOR, UserRole.DIRETOR] },
    { to: '/equipe', icon: Users, label: 'Equipe & Condutores', roles: [UserRole.COORDENADOR, UserRole.DIRETOR] },
    { to: '/planos-saude', icon: Heart, label: 'Planos de Saúde', roles: [UserRole.PADRAO, UserRole.COORDENADOR, UserRole.DIRETOR] },
    { to: '/alertas', icon: AlertTriangle, label: 'Alertas', roles: [UserRole.PADRAO, UserRole.COORDENADOR, UserRole.DIRETOR] },
    { to: '/relatorios', icon: FileText, label: 'Relatórios', roles: [UserRole.COORDENADOR, UserRole.DIRETOR] },
    { to: '/backup', icon: Database, label: 'Backup', roles: [UserRole.DIRETOR] },
    { to: '/usuarios', icon: UserCog, label: 'Usuários', roles: [UserRole.DIRETOR] },
    { to: '/configuracoes', icon: Settings, label: 'Configurações', roles: [UserRole.COORDENADOR, UserRole.DIRETOR] },
    // Super Admin Links
    { to: '/admin', icon: ShieldCheck, label: 'Admin Dashboard', roles: [UserRole.SUPER_ADMIN] },
    { to: '/dr-console', icon: ShieldAlert, label: 'Disaster Recovery', roles: [UserRole.SUPER_ADMIN] },
    { to: '/continuity', icon: Activity, label: 'ISO 22301 Dashboard', roles: [UserRole.SUPER_ADMIN] },
  ];

  const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-gray-900/60 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:translate-x-0 lg:static bg-[#2B3EF1] text-white flex flex-col shadow-xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col items-center justify-center pt-8 pb-6 px-4 border-b border-white/10">
          <div className="mb-4 bg-white/20 p-4 rounded-xl backdrop-blur-sm border border-white/30">
            {logoBase64 ? <img src={logoBase64} alt="Logo" className="h-16 w-auto object-contain" /> : <Logo className="w-16 h-16 text-white" showText={false} />}
          </div>
          <h1 className="text-lg font-bold text-center leading-tight tracking-wide uppercase">{municipalityName}</h1>
          <p className="text-xs text-blue-100 mt-1 font-bold uppercase tracking-wider">Gestão de Frota</p>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "group flex items-center px-4 py-3 text-sm font-medium rounded-lg bg-white text-black mb-2 transition-all shadow-sm",
                isActive ? "ring-2 ring-white ring-offset-2 ring-offset-[#2B3EF1] font-bold" : "opacity-90 hover:opacity-100" 
              )}
              onClick={() => setIsSidebarOpen(false)}
            >
              <item.icon className="mr-3 h-5 w-5 text-[#2B3EF1]" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">{user?.name?.charAt(0)}</div>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-sm truncate">{user?.name}</p>
              <span className="text-[10px] uppercase font-bold bg-white/10 px-1.5 py-0.5 rounded border border-white/20">{user?.role}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowPasswordModal(true)} 
              className="flex-1 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow transition-colors"
              title="Alterar Senha"
            >
              <Lock size={14} className="mr-1" /> Senha
            </button>
            <button onClick={handleLogout} className="flex-1 px-3 py-2 bg-white text-red-600 hover:bg-gray-100 rounded-lg flex items-center justify-center font-bold text-xs shadow transition-colors">
              <LogOut size={14} className="mr-1" /> Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-6 z-20 print:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
          <div className="flex items-center space-x-3 ml-auto">
            <div className={cn("px-3 py-1 rounded-full text-xs font-bold border flex items-center", isOnline ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
              {isOnline ? <Wifi size={14} className="mr-2" /> : <WifiOff size={14} className="mr-2" />}
              {isOnline ? 'CONECTADO' : 'OFFLINE'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
           <Outlet />
        </main>

        {(licenseStatus === LicenseStatus.EXPIRED || licenseStatus === LicenseStatus.INVALID) && (
            <div className="fixed bottom-0 inset-x-0 z-[60] p-3 bg-red-700 text-white flex justify-between items-center shadow-2xl">
                <div className="flex items-center px-4">
                    <Lock className="mr-3 animate-pulse" />
                    <p className="text-xs font-bold uppercase">Licença Inválida ou Expirada - Acesso de Escrita Bloqueado</p>
                </div>
                <button onClick={() => navigate('/configuracoes')} className="bg-white text-red-700 px-4 py-1.5 rounded text-xs font-bold mr-4">Ativar Agora</button>
            </div>
        )}
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
};
