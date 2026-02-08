
import React, { useEffect, useState } from 'react';
import { secretariasService } from '../services/secretariasService';
import { useAuth } from '../services/authContext';
import { Secretaria } from '../types';
import { Plus, Trash2, CheckCircle, XCircle, Building, Search, RefreshCw } from 'lucide-react';

export const Secretarias = () => {
  const { user } = useAuth();
  const tenantId = user?.organization_id;
  
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
        const data = await secretariasService.listar(tenantId);
        setSecretarias(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [tenantId]);

  const criar = async () => {
    if (!tenantId) return;
    if (!nome.trim()) return alert('Informe o nome da secretaria');
    
    setSaving(true);
    try {
        await secretariasService.criar(tenantId, nome);
        setNome('');
        carregar();
    } catch (e) {
        alert('Erro ao criar secretaria');
    } finally {
        setSaving(false);
    }
  };

  const toggle = async (id: string, active: boolean) => {
    if (!tenantId) return;
    try {
        await secretariasService.ativar(tenantId, id, !active);
        carregar();
    } catch (e) {
        alert('Erro ao alterar status');
    }
  };

  const remover = async (id: string) => {
      if (!tenantId) return;
      if (!confirm('ATENÇÃO: Tem certeza que deseja remover esta secretaria?')) return;
      try {
          await secretariasService.remover(tenantId, id);
          carregar();
      } catch (e) {
          alert('Erro ao remover');
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Building className="mr-3 text-brand-600" />
                Secretarias e Departamentos
            </h1>
            <p className="text-sm text-gray-500 mt-1">Gerenciamento de sub-unidades organizacionais (Sub-tenants).</p>
          </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Secretaria</label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none uppercase"
                  placeholder="EX: SECRETARIA DE EDUCAÇÃO"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && criar()}
                />
            </div>
            <button 
                onClick={criar} 
                disabled={saving}
                className="bg-brand-600 text-white px-6 py-3 rounded-lg font-bold flex items-center shadow hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
                {saving ? <RefreshCw className="animate-spin h-5 w-5"/> : <><Plus className="mr-2 h-5 w-5"/> Adicionar</>}
            </button>
          </div>
      </div>

      {loading ? (
          <div className="text-center py-10 text-gray-500 flex flex-col items-center">
              <RefreshCw className="animate-spin mb-2"/> Carregando lista...
          </div>
      ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Nome da Unidade</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Ações</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {secretarias.length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-gray-400">Nenhuma secretaria cadastrada.</td></tr>
                )}
                {secretarias.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{s.nome}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {s.id}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <button
                            onClick={() => toggle(s.id, s.active)}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-all ${s.active ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'}`}
                        >
                            {s.active ? <><CheckCircle size={12} className="mr-1"/> ATIVA</> : <><XCircle size={12} className="mr-1"/> INATIVA</>}
                        </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button
                        onClick={() => remover(s.id)}
                        className="text-gray-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"
                        title="Remover Secretaria"
                        >
                            <Trash2 size={18} />
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
      )}
    </div>
  );
};
