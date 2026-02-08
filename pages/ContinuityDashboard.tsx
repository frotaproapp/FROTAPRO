import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
import { api } from '../services/api';
import { ContinuityMetrics } from '../types';
import { 
  ShieldCheck, 
  Activity, 
  Database, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText,
  Server,
  TrendingDown,
  CalendarCheck
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';

export const ContinuityDashboard = () => {
  const { hasRole } = useAuth();
  const [metrics, setMetrics] = useState<ContinuityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasRole('SUPER_ADMIN')) {
      loadMetrics();
    }
  }, []);

  const loadMetrics = async () => {
    try {
        const data = await api.dr.getDashboardMetrics();
        setMetrics(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  if (!hasRole('SUPER_ADMIN')) {
      return <div className="p-8 text-center text-red-600 font-bold">ACESSO RESTRITO (ISO 27001)</div>;
  }

  if (loading || !metrics) {
      return <div className="p-8 text-center text-gray-500">Carregando indicadores de continuidade...</div>;
  }

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'COMPLIANT': return 'bg-green-100 text-green-800 border-green-200';
          case 'WARNING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'NON_COMPLIANT': return 'bg-red-100 text-red-800 border-red-200';
          default: return 'bg-gray-100';
      }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
        {/* HEADER */}
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center">
                    <Activity className="mr-3 text-brand-600" size={32} />
                    Painel de Continuidade de Negócios (BCM)
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Monitoramento em tempo real da resiliência do sistema e conformidade com ISO 22301.
                </p>
            </div>
            <div className={`px-4 py-2 rounded-lg border flex items-center shadow-sm ${getStatusColor(metrics.isoStatus)}`}>
                {metrics.isoStatus === 'COMPLIANT' ? <CheckCircle className="mr-2" size={20}/> : <AlertTriangle className="mr-2" size={20}/>}
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Status ISO 22301</p>
                    <p className="text-lg font-black">{metrics.isoStatus === 'COMPLIANT' ? 'CONFORME' : metrics.isoStatus === 'WARNING' ? 'ATENÇÃO' : 'NÃO CONFORME'}</p>
                </div>
            </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Último Backup</span>
                    <Database className="text-blue-500 h-5 w-5"/>
                </div>
                <p className="text-lg font-bold text-gray-900">{new Date(metrics.lastBackup.date).toLocaleDateString()}</p>
                <div className="flex items-center mt-2">
                    {metrics.lastBackup.status === 'SUCCESS' ? 
                        <span className="text-xs text-green-600 font-bold flex items-center"><CheckCircle size={12} className="mr-1"/> SUCESSO</span> : 
                        <span className="text-xs text-red-600 font-bold flex items-center"><XCircle size={12} className="mr-1"/> FALHA</span>
                    }
                    <span className="text-[10px] text-gray-400 ml-2 truncate">{metrics.lastBackup.location}</span>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Última Simulação (DR)</span>
                    <Server className="text-purple-500 h-5 w-5"/>
                </div>
                <p className="text-lg font-bold text-gray-900">{metrics.lastDrill.date !== 'N/A' ? new Date(metrics.lastDrill.date).toLocaleDateString() : 'Pendente'}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.lastDrill.type}</p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">RTO (Tempo Recuperação)</span>
                    <Clock className="text-orange-500 h-5 w-5"/>
                </div>
                <div className="flex items-end">
                    <p className="text-2xl font-black text-gray-900">{metrics.rto.actual}h</p>
                    <span className="text-xs text-gray-400 mb-1 ml-2">Meta: &lt; {metrics.rto.target}h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div className={`h-1.5 rounded-full ${metrics.rto.actual <= metrics.rto.target ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min((metrics.rto.actual / metrics.rto.target) * 100, 100)}%` }}></div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">RPO (Perda Aceitável)</span>
                    <ShieldCheck className="text-green-500 h-5 w-5"/>
                </div>
                <div className="flex items-end">
                    <p className="text-2xl font-black text-gray-900">{metrics.rpo.actual}h</p>
                    <span className="text-xs text-gray-400 mb-1 ml-2">Meta: &lt; {metrics.rpo.target}h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div className={`h-1.5 rounded-full ${metrics.rpo.actual <= metrics.rpo.target ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min((metrics.rpo.actual / metrics.rpo.target) * 100, 100)}%` }}></div>
                </div>
            </div>
        </div>

        {/* CHART SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <TrendingDown className="mr-2 text-brand-600"/> Melhoria Contínua do RTO (Horas)
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.rto.history}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{fontSize: 12}} />
                            <YAxis tick={{fontSize: 12}} />
                            <Tooltip />
                            <ReferenceLine y={4} label="Meta (4h)" stroke="red" strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="value" stroke="#0284c7" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">* Histórico trimestral de tempo de restauração em ambiente Sandbox.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <CalendarCheck className="mr-2 text-brand-600"/> Próximas Auditorias
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center p-3 bg-green-50 rounded border border-green-100">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-green-800">Simulação Trimestral</p>
                            <p className="text-xs text-green-600">Automático via Cloud Scheduler</p>
                        </div>
                        <span className="text-xs font-bold bg-white px-2 py-1 rounded text-green-700">15/OUT</span>
                    </div>
                    <div className="flex items-center p-3 bg-gray-50 rounded border border-gray-200 opacity-60">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-700">Restore Completo Anual</p>
                            <p className="text-xs text-gray-500">Validação Manual</p>
                        </div>
                        <span className="text-xs font-bold bg-white px-2 py-1 rounded text-gray-500">15/JAN</span>
                    </div>
                </div>
                
                <div className="mt-6 pt-4 border-t">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Riscos Ativos</h4>
                    {metrics.isoStatus === 'COMPLIANT' ? (
                        <p className="text-sm text-green-600 flex items-center"><CheckCircle size={14} className="mr-1"/> Nenhum risco crítico identificado.</p>
                    ) : (
                        <ul className="space-y-1">
                            {metrics.rpo.actual > 24 && <li className="text-xs text-red-600 flex items-center"><AlertTriangle size={12} className="mr-1"/> Backup desatualizado (&gt;24h)</li>}
                            {metrics.isoStatus === 'WARNING' && <li className="text-xs text-yellow-600 flex items-center"><AlertTriangle size={12} className="mr-1"/> Simulação DR pendente</li>}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};