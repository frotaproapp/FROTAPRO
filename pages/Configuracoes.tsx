
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { secretariasService } from '../services/secretariasService';
import { useAuth } from '../services/authContext';
import { SystemSettings, Solicitor, LicenseStatus, UserRole } from '../types';
import { Save, Building, Trash2, Plus, Upload, RefreshCw, Key, ShieldCheck, Lock } from 'lucide-react';

export const Configuracoes = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    id: 'general',
    municipalityName: '',
    logoBase64: '',
    customHeaderBase64: '',
    licenseKey: '',
    backupEnabled: false,
    backupTime: '23:00',
    backupTime2: '',
    cloudBackupEnabled: false
  });
  const [solicitors, setSolicitors] = useState<Solicitor[]>([]);
  const [secretarias, setSecretarias] = useState<any[]>([]);
  const [newSolicitor, setNewSolicitor] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [selectedSecretariaId, setSelectedSecretariaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LicenseStatus>(LicenseStatus.ACTIVE);

  const getSafeError = (e: any) => e?.message || (typeof e === 'string' ? e : JSON.stringify(e));

  useEffect(() => {
    console.log('🚀 DEBUG Configuracoes - useEffect triggered');
    console.log('👤 DEBUG Configuracoes - Current user:', user);
    console.log('🔑 DEBUG Configuracoes - User role:', user?.role);
    console.log('🏢 DEBUG Configuracoes - User organization_id:', user?.organization_id);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const [s, sols, perms] = await Promise.all([
          api.settings.get(),
          api.solicitors.list(),
          api.admin.license.getPermissions()
        ]);
        
        if (s) setSettings(s);
        setSolicitors(sols);
        setStatus(perms.status);

        if (user && user.organization_id) {
            console.log('🔍 DEBUG Configuracoes - Carregando secretarias:', {
                userRole: user.role,
                organizationId: user.organization_id,
                hasOrganization: !!user.organization_id
            });
            const secs = await secretariasService.listar(user.organization_id);
            console.log('📋 DEBUG Configuracoes - Secretarias carregadas:', secs);
            console.log('✅ DEBUG Configuracoes - Secretarias ativas filtradas:', secs.filter(sc => sc.active));
            setSecretarias(secs.filter(sc => sc.active));
        } else {
            console.log('❌ DEBUG Configuracoes - Não carregando secretarias:', {
                userRole: user?.role,
                organizationId: user?.organization_id,
                condition: user && user.organization_id
            });
        }

    } catch(e) {
        console.error("Failed to load settings", e);
    } finally {
        setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logoBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await api.settings.save(settings);
        alert('Configurações salvas com sucesso!');
        window.dispatchEvent(new Event('settings-updated'));
    } catch (e: any) {
        alert("Erro ao salvar configurações: " + getSafeError(e));
    }
  };

  const handleAddSolicitor = async () => {
    if (!newSolicitor.trim()) return;
    
    if (user?.organization_id && !selectedSecretariaId) {
        alert("Selecione a Secretaria vinculada a esta unidade solicitante.");
        return;
    }

    try {
        // Correção do erro de tipo: garantir que o ID nunca seja null
        const finalSecretariaId = user?.role === UserRole.ADMIN_TENANT ? selectedSecretariaId : (user?.secretariaId ?? undefined);

        await api.solicitors.add(newSolicitor, newResponsible, finalSecretariaId); 
        
        setNewSolicitor('');
        setNewResponsible('');
        setSelectedSecretariaId('');
        const updated = await api.solicitors.list();
        setSolicitors(updated);
    } catch (e: any) {
        alert("Erro ao adicionar solicitante: " + getSafeError(e));
    }
  };

  const handleDeleteSolicitor = async (id: string) => {
    if (window.confirm('Remover este solicitante?')) {
      try {
          await api.solicitors.delete(id);
          const updated = await api.solicitors.list();
          setSolicitors(updated);
      } catch (e: any) {
          alert("Erro ao remover solicitante: " + getSafeError(e));
      }
    }
  };

  const inputClass = "mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white text-black shadow-sm focus:ring-brand-500 focus:border-brand-500";

  if (loading) return <div className="p-8 text-center text-gray-500 flex flex-col items-center"><RefreshCw className="animate-spin mb-2"/> Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
          <p className="text-sm text-gray-500">Personalize a identidade visual e cadastros auxiliares.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Building className="mr-2" size={20} /> Identidade do Órgão
          </h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label htmlFor="municipalityName" className="block text-sm font-medium text-gray-700">Nome do Município</label>
              <input 
                id="municipalityName"
                className={inputClass}
                value={settings.municipalityName}
                onChange={e => setSettings({...settings, municipalityName: e.target.value})}
              />
            </div>
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logotipo</label>
              <div className="flex items-center space-x-4">
                {settings.logoBase64 ? (
                  <img src={settings.logoBase64} alt="Logo" className="h-16 w-auto border rounded" />
                ) : (
                  <div className="h-16 w-16 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">Sem Logo</div>
                )}
                <label className="cursor-pointer bg-white py-2 px-3 border rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center"><Upload size={16} className="mr-2"/> Alterar Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
                <Save size={18} className="mr-2"/> Salvar Identidade
            </button>
          </form>
        </div>

        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Key className="mr-2 text-brand-600" size={20} /> Licença
                </h2>
                <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 uppercase font-bold">Status</span>
                        <span className="flex items-center text-green-600 font-bold text-sm bg-green-100 px-2 py-1 rounded">
                            <ShieldCheck size={14} className="mr-1"/> ATIVA
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Unidades Solicitantes</h2>
                <div className="space-y-3 mb-4">
                    <input className={inputClass} placeholder="Nome da Unidade" value={newSolicitor} onChange={e => setNewSolicitor(e.target.value)} />
                    <input className={inputClass} placeholder="Responsável" value={newResponsible} onChange={e => setNewResponsible(e.target.value)} />
                    {user?.organization_id && (
                        <select className={inputClass} value={selectedSecretariaId} onChange={e => setSelectedSecretariaId(e.target.value)}>
                            <option value="">-- Vincular a Secretaria --</option>
                            {secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        </select>
                    )}
                    <button onClick={handleAddSolicitor} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 w-full font-bold">
                        Adicionar Unidade
                    </button>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md divide-y divide-gray-200">
                    {solicitors.map(sol => (
                        <div key={sol.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                            <div>
                                <p className="text-sm font-bold text-gray-800">{sol.name}</p>
                                {sol.responsible && <p className="text-[10px] text-gray-500">Resp: {sol.responsible}</p>}
                            </div>
                            <button onClick={() => handleDeleteSolicitor(sol.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
