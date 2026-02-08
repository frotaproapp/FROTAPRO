
import React, { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from "../services/authContext";
import { api } from "../services/api";
import { secretariasService } from "../services/secretariasService";
import { supabase } from "../services/supabaseClient";
import { OrgUsers } from "./OrgUsers";
import { Viagens } from "./Viagens";
import { Frota } from "./Frota";
import { Equipe } from "./Equipe";
import { PlanosSaude } from "./PlanosSaude";
import { Alertas } from "./Alertas";
import { Relatorios } from "./Relatorios";
import { Configuracoes } from "./Configuracoes";
import { BackupSystem } from "./BackupSystem";
import { Secretarias } from "./Secretarias";
import { Auditoria } from "./Auditoria";

import {
  Users,
  Loader2,
  LayoutDashboard,
  LogOut,
  Map,
  Ambulance,
  Heart,
  FileText,
  Settings,
  Database,
  UserCog,
  AlertTriangle,
  Clock,
  Car,
  ChevronRight,
  User,
  Briefcase,
  ShieldCheck,
  MapPin,
  ArrowUpRight,
  Info,
  X,
  Activity,
  Navigation
} from "lucide-react";
import { TripStatus, UserRole } from "../types";

const MENU_ITEMS_CONFIG: Record<string, { to: string, icon: any, category: string, exact?: boolean, label?: string }> = {
    'Visão Geral': { to: '', icon: LayoutDashboard, category: 'Gestão Principal', exact: true },
    'Viagens': { to: 'viagens', icon: Map, category: 'Gestão Principal' },
    'Solicitações': { to: 'viagens', icon: Map, category: 'Gestão Principal', label: 'Solicitações' },
    'Veículos': { to: 'frota', icon: Ambulance, category: 'Gestão Principal' },
    'Equipe': { to: 'equipe', icon: Users, category: 'Recursos Humanos' },
    'Usuários': { to: 'usuarios', icon: UserCog, category: 'Recursos Humanos' },
    'Secretarias': { to: 'secretarias', icon: Briefcase, category: 'Sistema' },
    'Planos de Saúde': { to: 'planos-saude', icon: Heart, category: 'Operacional' },
    'Alertas': { to: 'alertas', icon: AlertTriangle, category: 'Operacional' },
    'Relatórios': { to: 'relatorios', icon: FileText, category: 'Operacional' },
    'Auditoria': { to: 'auditoria', icon: ShieldCheck, category: 'Governança' },
    'Configurações': { to: 'configuracoes', icon: Settings, category: 'Sistema' },
    'Backup': { to: 'backup', icon: Database, category: 'Sistema' }
};

const MENUS_BY_ROLE: Record<string, string[]> = {
    [UserRole.ADMIN_TENANT]: ['Visão Geral', 'Viagens', 'Veículos', 'Equipe', 'Usuários', 'Secretarias', 'Planos de Saúde', 'Alertas', 'Relatórios', 'Auditoria', 'Configurações', 'Backup'],
    [UserRole.ORG_ADMIN]: ['Visão Geral', 'Viagens', 'Veículos', 'Equipe', 'Usuários', 'Secretarias', 'Planos de Saúde', 'Alertas', 'Relatórios', 'Auditoria', 'Configurações', 'Backup'],
    [UserRole.ADMIN_SECRETARIA]: ['Visão Geral', 'Solicitações', 'Veículos', 'Equipe', 'Usuários', 'Relatórios', 'Alertas'],
    [UserRole.GESTOR]: ['Visão Geral', 'Solicitações', 'Alertas', 'Relatórios', 'Auditoria'],
    [UserRole.COORDENADOR]: ['Visão Geral', 'Viagens', 'Veículos', 'Equipe', 'Alertas', 'Relatórios', 'Planos de Saúde']
};

const OrgOverview = ({ tenant, trips, vehicles, professionals, secretarias }: any) => {
    const navigate = useNavigate();
    const [filterSecretaria, setFilterSecretaria] = useState('');
    const [detailView, setDetailView] = useState<{ title: string, type: 'TRIPS' | 'VEHICLES' | 'DRIVERS', data: any[] } | null>(null);

    const filteredTrips = filterSecretaria ? trips.filter((t: any) => t.secretaria_id === filterSecretaria) : trips;
    const filteredVehicles = filterSecretaria ? vehicles.filter((v: any) => v.secretaria_id === filterSecretaria) : vehicles;
    const filteredProfessionals = filterSecretaria ? professionals.filter((p: any) => p.secretaria_id === filterSecretaria) : professionals;

    const tripsAgendadas = filteredTrips.filter((t: any) => t.status === TripStatus.AGENDADA || t.status === TripStatus.AGUARDANDO);
    const tripsEmAndamento = filteredTrips.filter((t: any) => t.status === TripStatus.EM_ANDAMENTO);
    
    const activeVehicleIds = new Set(tripsEmAndamento.map((t: any) => t.vehicle_id));
    const vehiclesDisponiveis = filteredVehicles.filter((v: any) => v.status === 'ATIVO' && !activeVehicleIds.has(v.id));
    const vehiclesManutencao = filteredVehicles.filter((v: any) => v.status === 'MANUTENCAO' || v.status === 'INATIVO');
    
    const allDrivers = filteredProfessionals.filter((p: any) => p.type === 'MOTORISTA' && p.status === 'ATIVO');
    const driversOnTripsIds = new Set(tripsEmAndamento.map((t: any) => t.driver_id));
    const driversAvailable = allDrivers.filter((d: any) => !driversOnTripsIds.has(d.id));

    const StatCard = ({ title, value, icon: Icon, color, onClick, subtitle }: any) => (
        <div 
            onClick={onClick}
            className="group relative bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-brand-500/10 transition-all cursor-pointer overflow-hidden transform hover:-translate-y-1"
        >
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] group-hover:opacity-10 transition-opacity ${color}`}></div>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${color.replace('bg-', 'bg-').replace('-500', '-50')} ${color.replace('bg-', 'text-')}`}>
                    <Icon size={26} strokeWidth={2.5} />
                </div>
                <div className="bg-gray-50 p-2 rounded-xl group-hover:bg-brand-50 transition-colors">
                    <ArrowUpRight size={18} className="text-gray-300 group-hover:text-brand-500" />
                </div>
            </div>
            <div>
                <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">{title}</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-900 tracking-tighter">{value}</span>
                    {subtitle && <span className="text-[10px] font-bold text-gray-400 uppercase">{subtitle}</span>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-8 space-y-10 animate-fadeIn max-w-[1600px] mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
                        <span className="w-2 h-10 bg-brand-600 rounded-full mr-4"></span>
                        Painel de Controle Operacional
                    </h2>
                    <p className="text-gray-500 font-medium ml-6">Monitoramento em tempo real da unidade {tenant?.name}.</p>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <Info size={16} className="text-brand-500 ml-2" />
                    <span className="text-xs font-bold text-gray-400 uppercase mr-2">Filtrar Unidade:</span>
                    <select 
                        value={filterSecretaria} 
                        onChange={e => setFilterSecretaria(e.target.value)} 
                        className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-black text-gray-700 focus:ring-2 focus:ring-brand-500 transition-all outline-none min-w-[200px]"
                    >
                        <option value="">TODAS AS SECRETARIAS</option>
                        {secretarias.map((s: any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Viagens Agendadas" value={tripsAgendadas.length} icon={Clock} color="bg-indigo-500" subtitle="Pendentes" onClick={() => setDetailView({ title: 'Agendadas', type: 'TRIPS', data: tripsAgendadas })} />
                <StatCard title="Em Trânsito" value={tripsEmAndamento.length} icon={MapPin} color="bg-emerald-500" subtitle="Ativas" onClick={() => setDetailView({ title: 'Em Rota', type: 'TRIPS', data: tripsEmAndamento })} />
                <StatCard title="Frota Disponível" value={vehiclesDisponiveis.length} icon={Car} color="bg-blue-500" subtitle="Prontos" onClick={() => setDetailView({ title: 'Veículos Livres', type: 'VEHICLES', data: vehiclesDisponiveis })} />
                <StatCard title="Motoristas na Base" value={driversAvailable.length} icon={Users} color="bg-orange-500" subtitle="Livres" onClick={() => setDetailView({ title: 'Disponíveis', type: 'DRIVERS', data: driversAvailable })} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center">
                            <Activity className="mr-2 text-brand-600" /> Fluxo de Atendimento Ativo
                        </h3>
                        <button onClick={() => navigate('viagens')} className="text-xs font-bold text-brand-600 hover:underline">VER TODAS</button>
                    </div>
                    
                    <div className="space-y-4">
                        {tripsEmAndamento.length > 0 ? tripsEmAndamento.slice(0, 5).map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-600 shadow-sm"><Navigation size={20} className="animate-pulse" /></div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900 uppercase">{t.destination}</p>
                                        <p className="text-[10px] font-bold text-gray-400">VEÍCULO ID: {t.vehicle_id}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full border border-emerald-200 uppercase">EM ROTA</span>
                                    <p className="text-[9px] text-gray-400 font-mono mt-1">SAÍDA: {t.time_out}</p>
                                </div>
                            </div>
                        )) : <div className="py-12 text-center text-gray-400 italic">Nenhuma viagem em curso.</div>}
                    </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center"><ShieldCheck className="mr-2 text-brand-400" /> Governança</h3>
                    <div className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-bold text-brand-300 uppercase mb-1">Manutenção/Inativos</p>
                            <div className="flex justify-between items-center">
                                <span className="text-2xl font-black">{vehiclesManutencao.length}</span>
                                <button onClick={() => setDetailView({ title: 'Inoperantes', type: 'VEHICLES', data: vehiclesManutencao })} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"><ChevronRight size={16}/></button>
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-bold text-indigo-300 uppercase mb-1">Unidades Ativas</p>
                            <div className="flex justify-between items-center"><span className="text-2xl font-black">{secretarias.length}</span></div>
                        </div>
                    </div>
                    <Database className="absolute -bottom-10 -right-10 w-48 h-48 opacity-5" />
                </div>
            </div>

            {detailView && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col animate-slideInRight">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div><h2 className="text-2xl font-black text-gray-900 uppercase">{detailView.title}</h2><p className="text-sm text-gray-500 font-medium">Listagem detalhada de registros.</p></div>
                            <button onClick={() => setDetailView(null)} className="p-3 hover:bg-red-50 text-gray-400 rounded-2xl"><X size={28} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4">
                            {detailView.data.map((item: any) => (
                                <div key={item.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                                    <div className="font-black text-lg text-gray-900 uppercase">{item.destination || item.plate || item.name}</div>
                                    <div className="text-xs text-gray-500 font-bold mt-1 uppercase">{item.status || item.model || item.type}</div>
                                </div>
                            ))}
                        </div>
                        <div className="p-8 border-t border-gray-100 bg-gray-50"><button onClick={() => setDetailView(null)} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm shadow-xl">Fechar</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const OrgDashboard = () => {
  const { user, logout } = useAuth();
  const [tenant, setTenant] = useState<any | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]); 
  const [secretarias, setSecretarias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
        const orgId = user?.organization_id;
        if (!orgId) return;

        setLoading(true);
        try {
            const [
                { data: orgData },
                { data: tripsData },
                { data: vehiclesData },
                { data: prosData },
                { data: secsData }
            ] = await Promise.all([
                supabase.from('organizations').select('*').eq('id', orgId).single(),
                supabase.from('trips').select('*').eq('organization_id', orgId),
                supabase.from('vehicles').select('*').eq('organization_id', orgId),
                supabase.from('professionals').select('*').eq('organization_id', orgId),
                supabase.from('secretarias').select('*').eq('organization_id', orgId)
            ]);

            setTenant(orgData);
            setTrips(tripsData || []);
            setVehicles(vehiclesData || []);
            setProfessionals(prosData || []);
            setSecretarias(secsData || []);
        } catch (e) {
            console.error("Erro ao carregar dados do dashboard:", e);
        } finally {
            setLoading(false);
        }
    };

    loadData();
  }, [user?.organization_id]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-brand-500 h-12 w-12"/></div>;

  const userRole = user?.role || UserRole.PADRAO;
  const allowedItems = MENUS_BY_ROLE[userRole] || MENUS_BY_ROLE[UserRole.PADRAO];
  
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
        <aside className="hidden lg:flex w-72 bg-slate-900 text-white flex-col shadow-2xl relative z-10">
            <div className="p-8 border-b border-white/5 bg-slate-950/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg border border-white/10"><Map size={20} /></div>
                    <div><h1 className="font-black text-lg tracking-tighter leading-none">{tenant?.name || 'FROTAPRO'}</h1><p className="text-[10px] font-black text-brand-500 uppercase mt-1 tracking-widest">Painel Institucional</p></div>
                </div>
            </div>
            
            <nav className="flex-1 py-6 overflow-y-auto px-4 custom-scrollbar">
                {allowedItems.map(name => {
                    const cfg = MENU_ITEMS_CONFIG[name];
                    return cfg && (
                        <NavLink key={name} to={cfg.to} end={cfg.exact} className={({isActive})=>`flex items-center px-6 py-4 text-sm font-black rounded-2xl mb-1 transition-all ${isActive ? 'bg-brand-600 text-white shadow-xl shadow-brand-600/20 translate-x-2' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            <cfg.icon size={18} className="mr-4" /> {cfg.label || name}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-6 border-t border-white/5 bg-slate-950/50">
                <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center justify-center px-6 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl text-sm font-black transition-all group">
                    <LogOut size={18} className="mr-3 group-hover:-translate-x-1 transition-transform"/> SAIR
                </button>
            </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
            <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 font-black text-xl">{user?.name?.charAt(0)}</div>
                    <div><div className="font-black text-gray-900 leading-none">{user?.name}</div><div className="text-[10px] text-gray-400 font-black uppercase mt-1 tracking-widest">{userRole}</div></div>
                </div>
                <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold text-gray-500 flex items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div> SUPABASE CLOUD ACTIVE
                </div>
            </header>

            <main className="flex-1 overflow-auto custom-scrollbar">
                <Routes>
                    <Route index element={<OrgOverview tenant={tenant} trips={trips} vehicles={vehicles} professionals={professionals} secretarias={secretarias} />} />
                    <Route path="viagens" element={<Viagens />} />
                    <Route path="frota" element={<Frota />} />
                    <Route path="equipe" element={<Equipe />} />
                    <Route path="usuarios" element={<OrgUsers />} />
                    <Route path="planos-saude" element={<PlanosSaude />} />
                    <Route path="alertas" element={<Alertas />} />
                    <Route path="relatorios" element={<Relatorios />} />
                    <Route path="configuracoes" element={<Configuracoes />} />
                    <Route path="backup" element={<BackupSystem />} />
                    <Route path="secretarias" element={<Secretarias />} />
                    <Route path="auditoria" element={<Auditoria />} />
                </Routes>
            </main>
        </div>

        <style>{`
            .animate-slideInRight { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        `}</style>
    </div>
  );
};
