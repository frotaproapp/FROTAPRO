
import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
// Corrected AuditLogEntry import from types.ts instead of auditService.ts
import { auditService } from '../services/auditService';
import { UserRole, AuditLogEntry } from '../types';
import { ShieldCheck, Search, Filter, Activity, Users, FileText, Calendar, Building, List } from 'lucide-react';
import { secretariasService } from '../services/secretariasService';

export const Auditoria = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [secretarias, setSecretarias] = useState<any[]>([]);

  // Filtros
  const [filterSecretaria, setFilterSecretaria] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalActions: 0,
    uniqueUsers: 0,
    topAction: '',
    actionsBySec: {} as Record<string, number>
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.organization_id) return;
    setLoading(true);

    try {
      // 1. Carrega Logs
      const rawLogs = await auditService.getLogs(user.organization_id);
      
      // 2. Carrega Secretarias para filtro
      const secs = await secretariasService.listar(user.organization_id);
      setSecretarias(secs);

      // 3. Aplica regra de visibilidade (Etapa 7)
      let visibleLogs = rawLogs;
      if (user.role !== UserRole.ADMIN_TENANT && user.role !== UserRole.ORG_ADMIN) {
        // Se não é Admin, vê apenas ações da sua secretaria ou suas próprias
        if (user.role === 'COORDENADOR' || user.role === 'GESTOR') {
             // Gestor vê logs da secretaria vinculada (se tiver essa info no user)
             // Assumindo que user.secretariaId existe no context, senão fallback para logs do próprio user
             // Para simplificar e garantir segurança, se não for Admin, vê apenas o próprio log por enquanto
             // A menos que a regra de negócio "ADMIN_SECRETARIA" esteja implementada com ID no user.
             // Vamos assumir filtro por secretariaId se disponível no user context.
             // Como o authContext user type não tem secretariaId explicitamente tipado no AppUser interface (geralmente),
             // usaremos uma lógica segura: Apenas admins veem tudo.
             visibleLogs = rawLogs.filter(l => l.userId === user.id); 
        } else {
             visibleLogs = rawLogs.filter(l => l.userId === user.id);
        }
      }

      setLogs(visibleLogs);
      calculateStats(visibleLogs);

    } catch (e) {
      console.error("Erro ao carregar auditoria:", e);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: AuditLogEntry[]) => {
    const userSet = new Set();
    const actionCounts: Record<string, number> = {};
    const secCounts: Record<string, number> = {};

    data.forEach(log => {
      userSet.add(log.userId);
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      const secName = secretarias.find(s => s.id === log.secretariaId)?.nome || 'N/A';
      secCounts[secName] = (secCounts[secName] || 0) + 1;
    });

    const topAction = Object.entries(actionCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || '-';

    setStats({
      totalActions: data.length,
      uniqueUsers: userSet.size,
      topAction,
      actionsBySec: secCounts
    });
  };

  // Filtragem no Frontend (Etapa 5)
  const filteredLogs = logs.filter(log => {
    if (filterSecretaria && log.secretariaId !== filterSecretaria) return false;
    if (filterAction && !log.action.toLowerCase().includes(filterAction.toLowerCase())) return false;
    if (filterUser && !log.userName.toLowerCase().includes(filterUser.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShieldCheck className="mr-3 text-brand-600" />
            Auditoria e Governança
          </h1>
          <p className="text-sm text-gray-500 mt-1">Rastreabilidade completa de ações no sistema (Compliance).</p>
        </div>
        <div className="text-right">
            <span className="text-xs font-bold text-gray-400 uppercase bg-gray-100 px-2 py-1 rounded">
                Logs Imutáveis
            </span>
        </div>
      </div>

      {/* ETAPA 6 - VISÃO GERAL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Total de Eventos</p>
                    <p className="text-2xl font-black text-brand-700">{stats.totalActions}</p>
                </div>
                <Activity className="text-brand-200" size={24}/>
            </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Usuários Ativos</p>
                    <p className="text-2xl font-black text-indigo-700">{stats.uniqueUsers}</p>
                </div>
                <Users className="text-indigo-200" size={24}/>
            </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Ação Mais Comum</p>
                    <p className="text-sm font-bold text-green-700 mt-1 truncate max-w-[150px]" title={stats.topAction}>
                        {stats.topAction}
                    </p>
                </div>
                <List className="text-green-200" size={24}/>
            </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Retenção</p>
                    <p className="text-xl font-bold text-gray-700">90 Dias</p>
                </div>
                <Calendar className="text-gray-200" size={24}/>
            </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Buscar por Ação</label>
              <div className="relative">
                  <Search className="absolute left-2 top-2.5 text-gray-400 h-4 w-4"/>
                  <input 
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-brand-500"
                    placeholder="Ex: CREATE, DELETE..."
                    value={filterAction}
                    onChange={e => setFilterAction(e.target.value)}
                  />
              </div>
          </div>
          <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Buscar por Usuário</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-brand-500"
                placeholder="Nome do usuário..."
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
              />
          </div>
          <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Filtrar por Secretaria</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-brand-500"
                value={filterSecretaria}
                onChange={e => setFilterSecretaria(e.target.value)}
              >
                  <option value="">Todas</option>
                  {secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
          </div>
          <button onClick={() => {setFilterAction(''); setFilterUser(''); setFilterSecretaria('')}} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-sm font-bold transition-colors">
              Limpar
          </button>
      </div>

      {/* TABELA DE LOGS */}
      {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando logs de auditoria...</div>
      ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data/Hora</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Secretaria</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ação</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Detalhes (Entidade)</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {filteredLogs.slice(0, 100).map(log => {
                              const secName = secretarias.find(s => s.id === log.secretariaId)?.nome || '-';
                              const isDelete = log.action.includes('DELETE') || log.action.includes('REMOVE');
                              const isCreate = log.action.includes('CREATE') || log.action.includes('ADD');
                              
                              return (
                                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                                          {new Date(log.timestamp).toLocaleString()}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm font-bold text-gray-900">{log.userName}</div>
                                          <div className="text-[10px] text-gray-400">{log.userRole}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                                          {secName !== '-' ? <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 flex items-center w-fit"><Building size={10} className="mr-1"/> {secName}</span> : <span className="text-gray-400">-</span>}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <span className={`px-2 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full ${
                                              isDelete ? 'bg-red-100 text-red-800' : 
                                              isCreate ? 'bg-green-100 text-green-800' : 
                                              'bg-gray-100 text-gray-800'
                                          }`}>
                                              {log.action}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                                          <span className="font-mono text-gray-700 mr-2">[{log.entity}]</span>
                                          {JSON.stringify(log.details)}
                                      </td>
                                  </tr>
                              );
                          })}
                          {filteredLogs.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                      Nenhum registro encontrado com os filtros atuais.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-500 text-center">
                  Mostrando os últimos {filteredLogs.length > 100 ? 100 : filteredLogs.length} eventos de {stats.totalActions} totais.
              </div>
          </div>
      )}
    </div>
  );
};
