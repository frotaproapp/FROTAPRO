
import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
import { api } from '../services/api'; 
import { 
  Building2, 
  RefreshCw,
  Plus,
  LogOut,
  Shield,
  FileText,
  Trash2,
  Lock,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  History,
  MapPin,
  X
} from 'lucide-react';
import { Tenant, AuditLogEntry } from '../types';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

export const AdminDashboard = () => {
  const { user, hasRole, logout, loading: authLoading, userReady } = useAuth();
  const [activeTab, setActiveTab] = useState<'TENANTS' | 'AUDIT'>('TENANTS');
  const [loadingData, setLoadingData] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const navigate = useNavigate();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTenant, setNewTenant] = useState({ 
    name: '', 
    cnpj: '', 
    estado: '', 
    email: '', 
    address: '' 
  });

  useEffect(() => {
    if (userReady && user && hasRole('SUPER_ADMIN')) {
      if (activeTab === 'TENANTS') loadTenants();
      if (activeTab === 'AUDIT') loadAuditLogs();
    }
  }, [activeTab, userReady, user]);

  const loadTenants = async () => {
    setLoadingData(true);
    try {
      const list = await api.admin.getAllTenants();
      console.log('🔍 DEBUG AdminDashboard - Tenants carregados:', list);
      console.log('🔍 DEBUG AdminDashboard - Primeiro tenant:', list[0]);
      setTenants(list);
    } catch (e) {
      console.error("❌ Erro ao carregar tenants:", e);
    } finally {
      setLoadingData(false);
    }
  };

  const loadAuditLogs = async () => {
      setLoadingData(true);
      try {
          const data = await api.admin.getAuditLogs();
          setLogs(data);
      } catch (e) {
          console.error("❌ Erro ao carregar auditoria:", e);
      } finally {
          setLoadingData(false);
      }
  };

  const calculateDaysRemaining = (expiresAt: string) => {
    if (!expiresAt) return 0;
    const expiry = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const diff = expiry - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleRenew = async (tenantId: string, days: number) => {
    const label = days === 365 ? "ANUAL" : "30 DIAS";
    if (!confirm(`Confirmar renovação de ${label} para este cliente?`)) return;
    
    console.log('🔄 DEBUG AdminDashboard - Iniciando renovação:', { tenantId, days });
    setLoadingData(true);
    try {
      console.log('📡 DEBUG AdminDashboard - Chamando api.admin.renewLicense...');
      await api.admin.renewLicense(tenantId, days);
      console.log('✅ DEBUG AdminDashboard - Licença renovada com sucesso');
      
      console.log('🔄 DEBUG AdminDashboard - Recarregando tenants...');
      await loadTenants();
      console.log('✅ DEBUG AdminDashboard - Tenants recarregados');
      
      alert(`Licença renovada por ${days} dias!`);
    } catch (error: any) { 
        console.error('❌ DEBUG AdminDashboard - Erro na renovação:', error);
        alert("Erro na renovação: " + error.message); 
    } finally {
        setLoadingData(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
      if (!confirm("EXCLUIR PERMANENTEMENTE ESTA PREFEITURA?")) return;
      try {
          await api.admin.deleteTenant(tenantId);
          loadTenants();
      } catch (e: any) { alert(e.message); }
  };

  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.email || !newTenant.cnpj) return alert("Nome, CNPJ e E-mail são obrigatórios.");
    
    setLoadingData(true);
    try {
      await api.admin.createTenant({ 
        name: newTenant.name, 
        email: newTenant.email, 
        cnpj: newTenant.cnpj, 
        state: newTenant.estado,
        address: newTenant.address 
      });
      setShowCreateModal(false);
      setNewTenant({ name: '', cnpj: '', estado: '', email: '', address: '' });
      await loadTenants();
    } catch (e: any) { 
      console.error("❌ Erro detalhado na criação:", e);
      alert("Erro ao criar: " + (e.message || "Verifique o console para detalhes")); 
    } finally {
      setLoadingData(false);
    }
  };

  if (authLoading || !userReady) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
            <RefreshCw className="animate-spin mb-4 text-brand-500" size={48} />
            <h2 className="text-xl font-bold tracking-widest uppercase">Segurança Frotapro</h2>
            <p className="text-gray-400 text-sm mt-2 font-mono">Sincronizando privilégios de Super Admin...</p>
        </div>
      );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <aside className="w-80 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
        <div className="h-28 flex items-center px-8 border-b border-white/5 bg-slate-950/50">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-600/20">
                    <Logo className="w-full h-full text-white" showText={false} />
                </div>
                <div>
                    <h1 className="font-black text-2xl tracking-tighter text-white leading-none">ADMIN</h1>
                    <p className="text-[10px] font-black text-brand-400 uppercase mt-1 tracking-widest">Global Controller</p>
                </div>
            </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          <button onClick={() => setActiveTab('TENANTS')} className={`w-full flex items-center px-6 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'TENANTS' ? 'bg-white/10 text-brand-400 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Building2 size={20} className="mr-4" /> Gestão de Clientes
          </button>
          <button onClick={() => setActiveTab('AUDIT')} className={`w-full flex items-center px-6 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'AUDIT' ? 'bg-white/10 text-brand-400 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <History size={20} className="mr-4" /> Log de Auditoria
          </button>
        </nav>

        <div className="p-6 border-t border-white/5">
            <button onClick={logout} className="w-full flex items-center justify-center px-4 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-xs font-black transition-all">
                <LogOut size={16} className="mr-2" /> DESCONECTAR
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10 bg-[#F8FAFC] relative">
        {loadingData && (
            <div className="absolute top-6 right-10 bg-white px-6 py-3 rounded-2xl shadow-xl border border-brand-100 text-xs font-black text-brand-600 flex items-center animate-bounce z-50">
                <RefreshCw className="animate-spin mr-3" size={16}/> SINCRONIZANDO...
            </div>
        )}
        
        <div className="max-w-7xl mx-auto space-y-10">
            <header className="flex justify-between items-end">
              <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Gestão de Contratos</h2>
                  <p className="text-slate-500 font-medium mt-2">Controle mestre de licenças SaaS e provisionamento de novos municípios.</p>
              </div>
              <button onClick={() => setShowCreateModal(true)} className="bg-brand-600 text-white px-8 py-4 rounded-2xl shadow-xl shadow-brand-600/20 hover:bg-brand-700 font-black flex items-center transition-all transform hover:-translate-y-1 text-sm uppercase tracking-tighter">
                <Plus className="mr-2 h-5 w-5"/> Nova Prefeitura
              </button>
            </header>

            <div className="bg-white shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden border border-slate-100">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação e Endereço</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano Atual</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Vigência de Contrato</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações de Renovação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map((t) => {
                    const days = calculateDaysRemaining(t.license_expires_at || '');
                    const isExpired = days <= 0;
                    
                    console.log('📊 DEBUG AdminDashboard - Tenant:', t.name, {
                      licenseExpiresAt: t.license_expires_at,
                      calculatedDays: days,
                      isExpired: isExpired,
                      licenseStatus: t.license_status
                    });
                    
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-7">
                            <div className="font-black text-slate-900 text-base uppercase tracking-tight">{t.name}</div>
                            <div className="flex flex-col gap-1 mt-1.5">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">ID: {t.id.substring(0,8)}</span>
                                    <span className="text-[10px] text-brand-600 font-bold uppercase">{t.cnpj || 'CNPJ Pendente'}</span>
                                </div>
                                {t.address && (
                                    <div className="flex items-center text-[10px] text-slate-400 font-medium max-w-xs truncate">
                                        <MapPin size={10} className="mr-1 flex-shrink-0" /> {t.address}
                                    </div>
                                )}
                            </div>
                        </td>
                        <td className="px-8 py-7">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-tighter border ${t.license_type === 'TRIAL' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-brand-50 text-brand-600 border-brand-100'}`}>
                                {t.license_type === 'TRIAL' ? 'PERÍODO TRIAL' : 'PLANO PROFISSIONAL'}
                            </div>
                        </td>
                        <td className="px-8 py-7">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${isExpired ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {isExpired ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>}
                                </div>
                                <div>
                                    <div className={`text-sm font-black ${isExpired ? 'text-red-600' : 'text-slate-900'}`}>
                                        {isExpired ? 'CONTRATO VENCIDO' : `${days} DIAS RESTANTES`}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Expira em: {t.license_expires_at ? new Date(t.license_expires_at).toLocaleDateString() : 'N/A'}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-8 py-7 text-right">
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => handleRenew(t.id, 30)} 
                                    title="Renovar por 30 dias"
                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-brand-600 transition-all uppercase tracking-tighter"
                                >
                                    +30 DIAS
                                </button>
                                <button 
                                    onClick={() => handleRenew(t.id, 365)} 
                                    title="Renovar por 1 Ano"
                                    className="px-4 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black hover:bg-brand-700 transition-all uppercase tracking-tighter shadow-lg shadow-brand-600/20"
                                >
                                    ANUAL (365d)
                                </button>
                                <button 
                                    onClick={() => handleDeleteTenant(t.id)} 
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    title="Remover Cliente"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </td>
                      </tr>
                    );
                  })}
                  {tenants.length === 0 && !loadingData && (
                      <tr><td colSpan={4} className="p-20 text-center text-slate-400 italic font-medium">Nenhuma prefeitura ativa encontrada nos índices.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[100] backdrop-blur-xl animate-fadeIn">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-[32rem] animate-slideUp max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-8">
              <h3 className="font-black text-3xl text-slate-900 tracking-tighter uppercase">Novo Cliente SaaS</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Município / Órgão</label>
                    <input className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all" placeholder="EX: PREFEITURA DE GOIÂNIA" value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value.toUpperCase() })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">CNPJ da Prefeitura</label>
                      <input className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all" placeholder="00.000.000/0000-00" value={newTenant.cnpj} onChange={(e) => setNewTenant({ ...newTenant, cnpj: e.target.value })} />
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">UF</label>
                      <input className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all uppercase font-bold" placeholder="GO" maxLength={2} value={newTenant.estado} onChange={(e) => setNewTenant({ ...newTenant, estado: e.target.value.toUpperCase() })} />
                  </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Endereço Completo</label>
                    <textarea 
                      className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-medium text-sm resize-none" 
                      rows={3}
                      placeholder="Logradouro, Nº, Bairro, CEP e Referência" 
                      value={newTenant.address} 
                      onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value.toUpperCase() })} 
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">E-mail do Administrador</label>
                    <input className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all" placeholder="admin@municipio.gov.br" value={newTenant.email} onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value.toLowerCase() })} />
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-10">
              <button onClick={() => setShowCreateModal(false)} className="px-6 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
              <button onClick={handleCreateTenant} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-2xl text-xs uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center">
                {loadingData ? <RefreshCw className="animate-spin mr-2" size={16}/> : <Shield className="mr-2" size={16}/>}
                Provisionar Sistema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
