
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../services/authContext";
import { RefreshCw, UserCheck, ShieldCheck } from "lucide-react";

export const BackupSystem = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    setLoading(true);
    try {
        // 🛡️ USA A API SEGURA QUE NÃO TOCA NA RAIZ /users
        const data = await api.users.list();
        setUsuarios(data);
    } catch (error) {
        console.error("Erro ao carregar dados via API segura:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [user?.id]);

  if (loading) return (
    <div className="p-20 text-center text-gray-500 flex flex-col items-center">
        <RefreshCw className="animate-spin mb-4 text-brand-600" size={32}/>
        <p className="font-bold">Validando Sincronização de Dados...</p>
    </div>
  );

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm m-4 border border-gray-200">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center">
                <ShieldCheck className="mr-2 text-green-600"/> Sincronização de Tenant
            </h1>
            <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider">Mapeamento de Acessos Ativos</p>
        </div>
        <button
          onClick={carregarDados}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-all shadow font-bold flex items-center"
        >
          <RefreshCw size={16} className="mr-2"/> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <h3 className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest flex items-center">
                <UserCheck size={14} className="mr-1"/> Usuários Visíveis no Contexto
              </h3>
              <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {usuarios.length === 0 && <li className="p-4 text-center text-gray-400 italic bg-white rounded border">Nenhum registro acessível para seu perfil.</li>}
                {usuarios.map(u => (
                  <li key={u.id} className="p-3 bg-white hover:bg-blue-50 border rounded-lg flex justify-between items-center transition-colors">
                    <div>
                        <span className="font-bold text-gray-800 block text-sm">{u.nome || u.name}</span>
                        <span className="text-[10px] text-brand-600 font-black uppercase">{u.role || 'USER'}</span>
                    </div>
                    <span className="text-[9px] text-gray-300 font-mono bg-gray-50 px-1.5 py-0.5 rounded">ID: {u.id.substring(0,8)}</span>
                  </li>
                ))}
              </ul>
          </div>
          
          <div className="space-y-4">
              <div className="p-4 bg-blue-50 text-blue-800 text-xs rounded-xl border border-blue-100 leading-relaxed shadow-sm">
                <strong className="block mb-1 text-sm">🔒 Camada de Segurança Operacional</strong>
                O sistema agora opera em modo de <strong>Indexação Estrita</strong>. O frontend está proibido de realizar varreduras globais (scans) no banco de dados. 
                <br/><br/>
                Isso garante que mesmo que um usuário mal-intencionado altere o código do cliente, as regras do Supabase (RLS) impedirão o acesso a dados de outras prefeituras.
              </div>
              
              <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-100 flex items-start shadow-sm">
                  <RefreshCw size={16} className="mr-2 mt-0.5 flex-shrink-0"/>
                  <div>
                      <strong>Integridade de Cache:</strong> Caso não veja usuários recém-criados, clique em "Atualizar". Os índices de busca são mantidos de forma atômica no backend.
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default BackupSystem;
