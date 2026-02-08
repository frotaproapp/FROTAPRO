import React, { useState, useEffect } from 'react';
import { api, generateId } from '../services/api';
import { useAuth } from '../services/authContext';
import { ContinuityMetrics } from '../types';
import { 
  Activity, 
  ShieldAlert, 
  PlayCircle, 
  CheckCircle, 
  AlertTriangle, 
  Server, 
  Database,
  Lock,
  FileText,
  CalendarCheck,
  ClipboardList,
  RefreshCw,
  XCircle,
  Clock
} from 'lucide-react';

export const DisasterRecovery = () => {
  const { hasRole } = useAuth();
  const [backupPath, setBackupPath] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SIMULATING' | 'VALIDATED' | 'PROMOTING' | 'DONE'>('IDLE');
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Estados para o novo painel de simulação
  const [simulations, setSimulations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<ContinuityMetrics | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
      if (hasRole('SUPER_ADMIN')) {
          loadData();
      }
  }, []);

  const loadData = async () => {
      try {
          const [simsData, metricsData] = await Promise.all([
              api.dr.listSimulations(),
              api.dr.getDashboardMetrics()
          ]);
          setSimulations(simsData as any[]);
          setMetrics(metricsData);
      } catch (e) {
          console.error("Erro ao carregar dados DR", e);
      }
  };

  if (!hasRole('SUPER_ADMIN')) {
      return <div className="p-8 text-center text-red-600 font-bold">ACESSO RESTRITO A SUPER ADMIN</div>;
  }

  // --- NOVA FUNÇÃO DE SIMULAÇÃO (API V2) ---
  const runSimulation = async (type: string) => {
    if (isSimulating) return;
    setIsSimulating(true);
    try {
        await api.dr.runSimulation(type);
        alert('Simulação executada com sucesso! Verifique a tabela de evidências.');
        loadData();
    } catch (e: any) {
        alert('Erro ao executar simulação: ' + (e.message || 'Erro desconhecido'));
    } finally {
        setIsSimulating(false);
    }
  };

  // --- FUNÇÕES LEGADAS (RESTORE MANUAL) ---
  const handleSimulateManual = async () => {
      if (!backupPath) return setError('Caminho do backup obrigatório.');
      setStatus('SIMULATING');
      setError('');
      try {
          const result: any = await api.dr.simulate(backupPath);
          setReport(result.report);
          setStatus('VALIDATED');
      } catch (e: any) {
          setError('Erro na simulação: ' + (e.message || JSON.stringify(e)));
          setStatus('IDLE');
      }
  };

  const handlePromoteManual = async () => {
      if (status !== 'VALIDATED') return;
      if (!confirm('ATENÇÃO CRÍTICA: Você está prestes a sobrescrever a PRODUÇÃO com os dados do Sandbox. Confirmar?')) return;
      
      setStatus('PROMOTING');
      try {
          await api.dr.promote(backupPath);
          alert('Promoção iniciada com sucesso. O ambiente de produção está sendo restaurado.');
          setStatus('DONE');
      } catch (e: any) {
          setError('Erro na promoção: ' + (e.message || JSON.stringify(e)));
          setStatus('VALIDATED'); 
      }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'SUCCESS': return <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded flex items-center w-fit"><CheckCircle size={12} className="mr-1"/> SUCESSO</span>;
          case 'FAILED': return <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded flex items-center w-fit"><XCircle size={12} className="mr-1"/> FALHA</span>;
          case 'WARNING': return <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded flex items-center w-fit"><AlertTriangle size={12} className="mr-1"/> ALERTA</span>;
          case 'RUNNING': return <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded flex items-center w-fit"><RefreshCw size={12} className="mr-1 animate-spin"/> EXECUTANDO</span>;
          default: return <span className="text-xs text-gray-500">{status}</span>;
      }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
        <header className="flex items-center justify-between border-b pb-4 bg-white p-4 rounded shadow-sm">
            <div>
                <h1 className="text-2xl font-black text-red-800 flex items-center">
                    <ShieldAlert className="mr-3" size={32} />
                    SALA DE CRISE - DISASTER RECOVERY (DR)
                </h1>
                <p className="text-sm text-red-600 font-bold mt-1">Ambiente de Controle de Catástrofes e Restauração Segura</p>
            </div>
            <div className="flex items-center space-x-2">
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded font-bold text-xs flex items-center">
                    <Server size={14} className="mr-1"/> SANDBOX: ONLINE
                </div>
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-bold text-xs flex items-center">
                    <Database size={14} className="mr-1"/> PRODUÇÃO: MONITORADA
                </div>
            </div>
        </header>

        {/* PAINEL DE SIMULAÇÃO ATIVA (NOVO) */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-600">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Activity className="mr-2 text-indigo-600"/> Testes de Conformidade (DR Drills) - ISO 22301
            </h2>
            <div className="flex flex-wrap gap-4 mb-6">
                <button 
                    onClick={() => runSimulation("BACKUP_RESTORE")} 
                    disabled={isSimulating}
                    className="flex items-center px-4 py-3 bg-indigo-600 text-white rounded font-bold shadow hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {isSimulating ? <RefreshCw className="animate-spin mr-2"/> : <PlayCircle className="mr-2"/>}
                    Simular Restore de Backup
                </button>
                <button 
                    onClick={() => runSimulation("DATA_CORRUPTION")} 
                    disabled={isSimulating}
                    className="flex items-center px-4 py-3 bg-gray-800 text-white rounded font-bold shadow hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                    {isSimulating ? <RefreshCw className="animate-spin mr-2"/> : <AlertTriangle className="mr-2"/>}
                    Simular Corrupção de Dados
                </button>
                <button 
                    onClick={() => runSimulation("SERVICE_OUTAGE")} 
                    disabled={isSimulating}
                    className="flex items-center px-4 py-3 bg-red-600 text-white rounded font-bold shadow hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                    {isSimulating ? <RefreshCw className="animate-spin mr-2"/> : <Activity className="mr-2"/>}
                    Simular Indisponibilidade
                </button>
            </div>

            <h3 className="text-sm font-bold text-gray-600 uppercase mb-3 flex items-center">
                <ClipboardList size={16} className="mr-1"/> Histórico de Evidências (Últimas 20)
            </h3>
            <div className="border rounded-lg overflow-hidden bg-white">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase text-xs">Tipo de Simulação</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase text-xs">Status</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase text-xs">RTO (Tempo)</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase text-xs">Data/Hora</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase text-xs">Notas (RPO)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {simulations.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center text-gray-400">Nenhuma simulação registrada.</td></tr>
                        ) : (
                            simulations.map((sim, i) => (
                                <tr key={sim.id || i} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{sim.type}</td>
                                    <td className="px-4 py-3">{getStatusBadge(sim.status)}</td>
                                    <td className="px-4 py-3 font-mono">
                                        {sim.rtoSeconds !== null ? `${sim.rtoSeconds}s` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {new Date(sim.startedAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {sim.rpoDescription || sim.notes}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* SECTION 1: ISO 22301 COMPLIANCE (DINÂMICO) */}
        {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-sm font-bold text-gray-600 uppercase mb-3 flex items-center"><CalendarCheck size={16} className="mr-1"/> Status de Conformidade (Auditável)</h3>
                
                <div className={`mb-4 p-4 rounded-lg flex items-center ${metrics.isoStatus === 'COMPLIANT' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    {metrics.isoStatus === 'COMPLIANT' ? (
                        <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                    ) : (
                        <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
                    )}
                    <div>
                        <p className="font-bold text-gray-900">{metrics.isoStatus === 'COMPLIANT' ? 'SISTEMA EM CONFORMIDADE' : 'ATENÇÃO: TESTE NECESSÁRIO'}</p>
                        <p className="text-xs text-gray-600">
                            {metrics.isoStatus === 'COMPLIANT' 
                                ? `Última simulação realizada em ${new Date(metrics.lastDrill.date).toLocaleDateString()}. Próximo teste em 90 dias.`
                                : `Último teste válido em ${metrics.lastDrill.date !== 'N/A' ? new Date(metrics.lastDrill.date).toLocaleDateString() : 'NUNCA'}. Realize uma simulação imediatamente.`}
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 border-b">
                        <span className="text-sm">Restore Completo</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${metrics.isoStatus === 'COMPLIANT' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                            {metrics.isoStatus === 'COMPLIANT' ? 'VALIDADO' : 'PENDENTE'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* PAINEL DE CONTROLE MANUAL (LEGADO - PARA RESTORE REAL) */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Database className="mr-2 text-blue-600"/> Recuperação Manual Real (Sandbox & Produção)
            </h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Caminho do Snapshot (Storage)</label>
                    <input 
                        type="text" 
                        className="w-full border-2 border-gray-300 p-3 rounded font-mono text-sm focus:border-blue-500 focus:ring-0"
                        placeholder="gs://bucket-name/backups/daily/YYYY-MM-DD"
                        value={backupPath}
                        onChange={e => setBackupPath(e.target.value)}
                        disabled={status !== 'IDLE'}
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded text-sm font-bold flex items-center">
                        <AlertTriangle className="mr-2 h-4 w-4"/> {error}
                    </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    {status === 'IDLE' && (
                        <button 
                            onClick={handleSimulateManual}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-bold shadow-lg flex items-center transition-transform hover:scale-105"
                        >
                            <PlayCircle className="mr-2 h-5 w-5"/> INICIAR RESTORE NO SANDBOX
                        </button>
                    )}

                    {status === 'SIMULATING' && (
                        <div className="flex items-center text-blue-600 font-bold animate-pulse">
                            <Activity className="mr-2 h-5 w-5 animate-spin"/> Restaurando para ambiente isolado...
                        </div>
                    )}

                    {status === 'VALIDATED' && (
                        <div className="flex gap-4 w-full">
                            <div className="flex-1 bg-green-50 p-3 rounded border border-green-200 text-green-800 text-sm font-bold flex items-center justify-center">
                                <CheckCircle className="mr-2 h-5 w-5"/> SANDBOX VALIDADO
                            </div>
                            <button 
                                onClick={handlePromoteManual}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-bold shadow-lg flex items-center transition-transform hover:scale-105"
                            >
                                <Lock className="mr-2 h-5 w-5"/> PROMOVER PARA PRODUÇÃO
                            </button>
                        </div>
                    )}

                    {status === 'PROMOTING' && (
                        <div className="flex items-center text-red-600 font-bold animate-pulse">
                            <AlertTriangle className="mr-2 h-5 w-5"/> Aplicando dados em Produção... NÃO FECHE ESTA JANELA.
                        </div>
                    )}

                    {status === 'DONE' && (
                        <div className="w-full bg-green-600 text-white p-4 rounded shadow-lg text-center font-bold text-lg">
                            SUCESSO: AMBIENTE DE PRODUÇÃO RESTAURADO.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {report && (
            <div className="bg-gray-800 text-green-400 p-6 rounded-lg shadow-lg font-mono text-sm overflow-x-auto">
                <h3 className="text-white font-bold border-b border-gray-600 pb-2 mb-4 flex items-center">
                    <FileText className="mr-2"/> RELATÓRIO TÉCNICO DE RESTAURAÇÃO
                </h3>
                <pre>{JSON.stringify(report, null, 2)}</pre>
            </div>
        )}
    </div>
  );
};