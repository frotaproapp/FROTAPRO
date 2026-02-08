
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, ShieldAlert, Clock, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { Alert, TripStatus } from '../types';

export const Alertas = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const fetchData = async () => {
          try {
              // Busca alertas manuais e viagens simultaneamente
              const [dbAlerts, trips] = await Promise.all([
                  api.alerts.list(),
                  api.trips.list()
              ]);

              // Filtra viagens não finalizadas com mais de 24h
              const now = new Date();
              const overdueTrips = trips.filter(t => {
                  // Ignora viagens já resolvidas
                  if (t.status === TripStatus.CONCLUIDA || t.status === TripStatus.CANCELADA) return false;

                  // Monta data da viagem
                  const tripDateStr = `${t.dateOut}T${t.timeOut || '00:00'}`;
                  const tripDate = new Date(tripDateStr);

                  // Verifica se data é válida
                  if (isNaN(tripDate.getTime())) return false;

                  // Calcula diferença em horas
                  const diffMs = now.getTime() - tripDate.getTime();
                  const diffHours = diffMs / (1000 * 60 * 60);

                  return diffHours > 24;
              });

              // Converte viagens atrasadas em objetos de Alerta
              const tripAlerts: Alert[] = overdueTrips.map(t => ({
                  id: `auto-trip-${t.id}`,
                  title: 'Viagem Pendente (+24h)',
                  message: `A viagem para ${t.destination} (Paciente: ${t.patient?.name || 'N/A'}) realizada em ${new Date(t.dateOut).toLocaleDateString()} ainda consta como "${t.status}". É necessário finalizar ou cancelar este registro.`,
                  date: new Date().toISOString().split('T')[0], // Data do alerta é hoje
                  severity: 'warning'
              }));

              // Combina e ordena por data (mais recente primeiro)
              const combinedAlerts = [...dbAlerts, ...tripAlerts].sort((a, b) => 
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              );

              setAlerts(combinedAlerts);
          } catch(e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      };
      fetchData();
  }, []);

  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Alertas</h1>
          <p className="text-sm text-gray-500">Monitoramento ativo da frota e pendências operacionais.</p>
        </div>

        <div className="grid gap-4">
          {loading && <p className="text-gray-500 flex items-center"><Clock className="animate-spin mr-2 h-4 w-4"/> Verificando sistema...</p>}
          
          {!loading && alerts.length === 0 && (
              <div className="bg-white p-8 rounded-lg shadow border border-gray-200 text-center text-gray-500">
                  <ShieldAlert className="mx-auto h-12 w-12 text-gray-300 mb-2"/>
                  <p>Nenhum alerta ou pendência no sistema.</p>
              </div>
          )}

          {alerts.map(alert => (
            <div key={alert.id} className={`p-4 rounded-lg border-l-4 shadow-sm bg-white ${
              alert.severity === 'critical' ? 'border-red-500' : 
              alert.severity === 'warning' ? 'border-yellow-500' : 'border-blue-500'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {alert.severity === 'critical' ? <ShieldAlert className="h-6 w-6 text-red-500"/> :
                   alert.severity === 'warning' ? <AlertTriangle className="h-6 w-6 text-yellow-500"/> :
                   <Info className="h-6 w-6 text-blue-500"/>}
                </div>
                <div className="ml-3 w-full">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center">
                        {alert.title}
                        {alert.id.startsWith('auto-trip-') && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-2 rounded-full border border-gray-200">AUTOMÁTICO</span>}
                    </h3>
                    <span className="text-xs text-gray-400">{new Date(alert.date).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    <p>{alert.message}</p>
                    {alert.id.startsWith('auto-trip-') && (
                        <div className="mt-2">
                            <a href="#/viagens" className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center">
                                <MapPin size={12} className="mr-1"/> Ir para Viagens
                            </a>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
    </div>
  );
};
