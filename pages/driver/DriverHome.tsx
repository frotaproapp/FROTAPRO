
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../services/authContext';
import { Trip, TripStatus, Vehicle, Professional } from '../../types';
// Add RefreshCw to the imports from lucide-react to fix line 286 error
import { LogOut, Play, StopCircle, MapPin, Gauge, Fuel, CheckCircle, AlertTriangle, Navigation, Clock, History, FileText, X, Save, Lock, Calendar, ChevronRight, User, Eye, ChevronLeft, Users, MessageSquare, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';

export const DriverHome = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [scheduledTrips, setScheduledTrips] = useState<Trip[]>([]); 
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState<Professional | null>(null);
  
  const [historyTrips, setHistoryTrips] = useState<Trip[]>([]);
  const [currentMonthLabel, setCurrentMonthLabel] = useState('');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedHistoryTrip, setSelectedHistoryTrip] = useState<Trip | null>(null);
  const [incidentText, setIncidentText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);
  const [view, setView] = useState<'HOME' | 'HISTORY' | 'PROFILE' | 'CONFIRM_START' | 'FINISH'>('HOME');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tripToStart, setTripToStart] = useState<Trip | null>(null);
  const [startKm, setStartKm] = useState<number | ''>('');
  const [finishKm, setFinishKm] = useState<number | ''>('');
  const [fuelLiters, setFuelLiters] = useState<number | ''>('');
  const [finishNotes, setFinishNotes] = useState('');

  useEffect(() => {
    if (user?.tenantId) {
        loadOperationalData();
        const interval = setInterval(loadOperationalData, 30000);
        return () => clearInterval(interval);
    }
  }, [user]);

  const loadOperationalData = async () => {
    try {
        if (!user?.id || !user?.tenantId) return;
        
        // 🔥 Correção Mobile: Agora passando tenantId para a API
        const [tripsData, vehiclesData, professionalsData] = await Promise.all([
            api.trips.listByDriver(user.tenantId, user.id),
            api.vehicles.list(),
            api.professionals.list()
        ]);

        const myProfile = professionalsData.find(p => p.userId === user?.id);
        setDriverProfile(myProfile || null);
        const myDriverId = myProfile ? myProfile.id : user?.id;

        const myActive = tripsData.find(t => 
            t.status === TripStatus.EM_ANDAMENTO && 
            (t.driverUid === user.id || t.driverId === myDriverId)
        );

        const myScheduled = tripsData.filter(t => 
            (t.status === TripStatus.AGENDADA || t.status === TripStatus.AGUARDANDO) && 
            (t.driverUid === user.id || t.driverId === myDriverId)
        ).sort((a, b) => {
            const dateA = new Date(`${a.dateOut}T${a.timeOut}`);
            const dateB = new Date(`${b.dateOut}T${b.timeOut}`);
            return dateA.getTime() - dateB.getTime();
        });

        setActiveTrip(myActive || null);
        setScheduledTrips(myScheduled);
        setVehicles(vehiclesData.filter(v => v.status === 'ATIVO'));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadHistory = async () => {
      setLoading(true);
      try {
          if (!user?.id || !user?.tenantId) return;
          const allTrips = await api.trips.listByDriver(user.tenantId, user.id);
          const now = new Date();
          setCurrentMonthLabel(now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endOfMonth.setHours(23, 59, 59, 999);
          const myHistory = allTrips.filter(t => {
                const tripDate = new Date(t.dateOut);
                return (t.status === TripStatus.CONCLUIDA || t.status === TripStatus.CANCELADA) && tripDate >= startOfMonth && tripDate <= endOfMonth;
            }).sort((a, b) => new Date(b.dateOut).getTime() - new Date(a.dateOut).getTime());
          setHistoryTrips(myHistory);
          setView('HISTORY');
      } catch (e) { alert("Erro ao carregar histórico."); } finally { setLoading(false); }
  };

  const checkTimeWindow = (trip: Trip) => {
      const now = new Date();
      const tripDate = new Date(`${trip.dateOut}T${trip.timeOut}`);
      const tolerance = 60 * 60 * 1000; // 1 hora de antecedência permitida
      return now.getTime() >= (tripDate.getTime() - tolerance);
  };

  const initiateStartSequence = (trip: Trip) => {
      setTripToStart(trip);
      const vehicle = vehicles.find(v => v.id === trip.vehicleId);
      setStartKm(vehicle ? vehicle.currentKm : (trip.kmOut || ''));
      setView('CONFIRM_START');
  };

  const confirmStartTrip = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tripToStart || !startKm) return;
      const vehicle = vehicles.find(v => v.id === tripToStart.vehicleId);
      setLoading(true);
      try {
          const now = new Date();
          await api.trips.update({
              ...tripToStart,
              status: TripStatus.EM_ANDAMENTO,
              kmOut: Number(startKm),
              dateOut: now.toISOString().split('T')[0],
              timeOut: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          });
          if (vehicle) await api.vehicles.save({ ...vehicle, currentKm: Number(startKm) });
          await loadOperationalData();
          setView('HOME');
          setTripToStart(null);
      } catch (e) { alert('Erro ao iniciar viagem.'); } finally { setLoading(false); }
  };

  const handleFinishTrip = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeTrip || !finishKm) return;
      const finalKmValue = Number(finishKm);
      if (finalKmValue <= (activeTrip.kmOut || 0)) {
          alert('ERRO: KM Final deve ser maior que o KM Inicial.');
          return;
      }
      setLoading(true);
      try {
          const now = new Date();
          await api.trips.update({
              ...activeTrip,
              status: TripStatus.CONCLUIDA,
              kmIn: finalKmValue,
              fuelLiters: Number(fuelLiters) || 0,
              driverNotes: finishNotes,
              dateReturn: now.toISOString().split('T')[0],
              timeReturn: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          });
          const vehicle = vehicles.find(v => v.id === activeTrip.vehicleId);
          if (vehicle) await api.vehicles.save({ ...vehicle, currentKm: finalKmValue });
          await loadOperationalData();
          setView('HOME');
          setFinishKm('');
          setFuelLiters('');
          setFinishNotes('');
      } catch (e) { alert('Erro ao finalizar viagem.'); } finally { setLoading(false); }
  };

  const openIncidentModal = (trip: Trip) => {
      setSelectedHistoryTrip(trip);
      setIncidentText(trip.driverNotes || '');
      setShowIncidentModal(true);
  };

  const handleSaveIncident = async () => {
      if (!selectedHistoryTrip) return;
      setSavingNote(true);
      try {
          await api.trips.update({ ...selectedHistoryTrip, driverNotes: incidentText });
          const updatedList = historyTrips.map(t => t.id === selectedHistoryTrip.id ? { ...t, driverNotes: incidentText } : t);
          setHistoryTrips(updatedList);
          setShowIncidentModal(false);
      } catch (e) { alert('Erro ao salvar relato.'); } finally { setSavingNote(false); }
  };

  const BottomNav = () => (
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4 flex justify-around items-center z-50 shadow-2xl">
          <button onClick={() => setView('HOME')} className={`flex flex-col items-center ${view === 'HOME' ? 'text-brand-500' : 'text-slate-500'}`}>
              <Navigation size={24} className={view === 'HOME' ? 'fill-current' : ''} />
              <span className="text-[10px] font-bold mt-1 uppercase">Início</span>
          </button>
          <button onClick={() => { loadHistory(); }} className={`flex flex-col items-center ${view === 'HISTORY' ? 'text-brand-500' : 'text-slate-500'}`}>
              <History size={24} />
              <span className="text-[10px] font-bold mt-1 uppercase">Histórico</span>
          </button>
          <button onClick={() => setView('PROFILE')} className={`flex flex-col items-center ${view === 'PROFILE' ? 'text-brand-500' : 'text-slate-500'}`}>
              <User size={24} className={view === 'PROFILE' ? 'fill-current' : ''} />
              <span className="text-[10px] font-bold mt-1 uppercase">Perfil</span>
          </button>
      </div>
  );

  if (view === 'CONFIRM_START') {
      return (
          <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col">
              <div className="flex items-center mb-6">
                  <button onClick={() => setView('HOME')} className="p-2 bg-slate-800 rounded-lg mr-4"><Navigation className="rotate-180" size={24}/></button>
                  <h1 className="text-xl font-bold">Confirmar Saída</h1>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl mb-6 border border-slate-700 relative">
                  <button onClick={() => setViewingTrip(tripToStart)} className="absolute top-4 right-4 p-2 bg-slate-700 rounded-lg text-blue-300 transition-colors"><Eye size={20}/></button>
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Destino</p>
                  <p className="text-white text-lg font-bold mb-3 pr-10">{tripToStart?.destination}</p>
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Veículo</p>
                  <p className="text-white">{tripToStart?.vehicleSnapshot}</p>
              </div>
              <form onSubmit={confirmStartTrip} className="space-y-6 flex-1">
                  <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2 uppercase">KM Atual (Painel)</label>
                      <div className="relative">
                          <Gauge className="absolute left-4 top-4 text-slate-500" />
                          <input type="number" value={startKm} onChange={(e) => setStartKm(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 pl-12 text-white text-2xl font-mono focus:ring-2 focus:ring-green-500 outline-none" required autoFocus />
                      </div>
                  </div>
                  <button type="submit" className="w-full bg-green-600 text-white font-bold text-xl py-5 rounded-xl shadow-lg active:scale-95 transition-transform mt-auto">INICIAR AGORA</button>
              </form>
          </div>
      );
  }

  if (view === 'FINISH') {
      return (
          <div className="min-h-screen bg-slate-900 text-white p-4 pb-20 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="flex items-center mb-6">
                  <button onClick={() => setView('HOME')} className="p-2 bg-slate-800 rounded-lg mr-4"><Navigation className="rotate-180" size={24}/></button>
                  <h1 className="text-xl font-bold">Encerrar Viagem</h1>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl mb-6 border border-slate-700">
                  <div className="flex justify-between items-center text-sm text-slate-400 mb-2"><span>Veículo</span><span className="text-white font-bold">{activeTrip?.vehicleSnapshot}</span></div>
                  <div className="flex justify-between items-center text-sm text-slate-400"><span>KM Saída</span><span className="text-white font-bold font-mono text-lg">{activeTrip?.kmOut}</span></div>
              </div>
              <form onSubmit={handleFinishTrip} className="space-y-6 flex-1">
                  <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2 uppercase ml-1">KM de Chegada (Obrigatório)</label>
                      <div className="relative"><Gauge className="absolute left-4 top-4 text-slate-500" size={20}/><input type="number" value={finishKm} onChange={(e) => setFinishKm(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 pl-12 text-white text-2xl font-mono focus:ring-2 focus:ring-blue-500 outline-none" required autoFocus /></div>
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2 uppercase ml-1">Abastecimento (Litros)</label>
                      <div className="relative"><Fuel className="absolute left-4 top-4 text-slate-500" size={20} /><input type="number" value={fuelLiters} onChange={(e) => setFuelLiters(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 pl-12 text-white text-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.0" /></div>
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2 uppercase ml-1">Observações / Ocorrências</label>
                      <div className="relative"><MessageSquare className="absolute left-4 top-4 text-slate-500" size={20} /><textarea value={finishNotes} onChange={(e) => setFinishNotes(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 pl-12 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]" placeholder="Relate pneu furado, atrasos, problemas mecânicos..." /></div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold text-xl py-5 rounded-xl shadow-lg active:scale-95 transition-transform mt-4 mb-8">FINALIZAR AGORA</button>
              </form>
          </div>
      );
  }

  if (view === 'HISTORY') {
      return (
          <div className="min-h-screen bg-slate-900 text-white p-4 pb-24 flex flex-col">
              <div className="flex items-center mb-6 border-b border-slate-800 pb-4"><button onClick={() => setView('HOME')} className="p-2 bg-slate-800 rounded-lg mr-3 text-slate-300"><ChevronLeft size={24}/></button><div className="flex-1"><h1 className="text-xl font-bold flex items-center"><History className="mr-2"/> Histórico</h1><p className="text-xs text-slate-400 uppercase font-bold mt-1">{currentMonthLabel}</p></div></div>
              <div className="flex-1 overflow-y-auto space-y-4">{historyTrips.length === 0 ? (<div className="text-center text-slate-500 mt-10"><History size={48} className="mx-auto mb-4 opacity-50"/><p>Nenhuma viagem registrada.</p></div>) : (historyTrips.map(trip => (<div key={trip.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative"><div className="flex justify-between items-start mb-2"><div><span className="text-xs font-bold text-slate-400 block mb-1">{new Date(trip.dateOut).toLocaleDateString()}</span><h3 className="font-bold text-white text-lg">{trip.destination}</h3></div><span className={`px-2 py-1 rounded text-[10px] font-bold border ${trip.status === 'CONCLUIDA' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>{trip.status}</span></div><button onClick={() => openIncidentModal(trip)} className={`w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${trip.driverNotes ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/50' : 'bg-slate-700 text-slate-300'}`}>{trip.driverNotes ? <FileText size={16} className="mr-2"/> : <AlertTriangle size={16} className="mr-2"/>}{trip.driverNotes ? 'Ver/Editar Relato' : 'Relatar Ocorrência'}</button></div>)))}</div>
              {showIncidentModal && selectedHistoryTrip && (<div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><div className="bg-slate-800 w-full max-w-sm rounded-2xl p-6 border border-slate-700 shadow-2xl"><div className="flex justify-between mb-4"><h3 className="text-lg font-bold text-white flex items-center"><AlertTriangle className="mr-2 text-yellow-500" size={20}/> Relatar Ocorrência</h3><button onClick={() => setShowIncidentModal(false)} className="text-slate-400"><X/></button></div><textarea className="w-full h-32 bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm outline-none mb-4" value={incidentText} onChange={e => setIncidentText(e.target.value)} /><button onClick={handleSaveIncident} disabled={savingNote} className="w-full bg-yellow-600 text-white font-bold py-3 rounded-xl">{savingNote ? 'Salvando...' : 'Salvar Relato'}</button></div></div>)}
              <BottomNav />
          </div>
      );
  }

  if (view === 'PROFILE') {
      return (
          <div className="min-h-screen bg-slate-900 text-white p-6 pb-24 flex flex-col">
              <div className="flex items-center mb-8 border-b border-slate-800 pb-4"><button onClick={() => setView('HOME')} className="p-2 bg-slate-800 rounded-lg mr-3 text-slate-300"><ChevronLeft size={24}/></button><h1 className="text-2xl font-bold">Meu Perfil</h1></div>
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6 text-center"><div className="w-20 h-20 bg-brand-600 rounded-full mx-auto flex items-center justify-center mb-4 text-2xl font-bold">{user?.name?.charAt(0)}</div><h2 className="text-xl font-bold">{user?.name}</h2><p className="text-slate-400 text-sm uppercase">{user?.email}</p></div>
              <button onClick={() => setShowPasswordModal(true)} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between mb-4"><div className="flex items-center"><div className="p-2 bg-blue-500/20 rounded-lg mr-4 text-blue-400"><Lock size={20}/></div><span className="font-bold">Alterar Senha</span></div><ChevronRight size={20} className="text-slate-500"/></button>
              <button onClick={() => {logout(); navigate('/driver');}} className="w-full bg-red-900/20 border border-red-900/50 p-4 rounded-xl text-red-400 font-bold flex items-center justify-center"><LogOut size={20} className="mr-2"/> SAIR DA CONTA</button>
              {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
              <BottomNav />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24 relative">
      <div className="p-6 flex justify-between items-center bg-slate-800 rounded-b-3xl shadow-lg">
          <div><p className="text-slate-400 text-xs font-bold uppercase">Olá, {user?.name?.split(' ')[0]}</p><h1 className="text-2xl font-black">FROTAPRO <span className="text-brand-500">GO</span></h1></div>
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600"><User size={20} className="text-slate-300" /></div>
      </div>
      <div className="p-6 mt-2">
          {loading ? (
              <div className="text-center py-20 text-slate-500 animate-pulse"><RefreshCw className="animate-spin mx-auto mb-4" size={32}/><p>Sincronizando Viagens...</p></div>
          ) : activeTrip ? (
              <div className="animate-fadeIn">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-2xl text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 animate-pulse"></div>
                      <div className="flex justify-center mb-4"><div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center"><Navigation size={40} className="text-white animate-pulse" /></div></div>
                      <h2 className="text-3xl font-black mb-1 uppercase">Em Trânsito</h2>
                      <p className="text-blue-200 text-sm font-medium mb-6 uppercase tracking-widest">Para {activeTrip.destination}</p>
                      <div className="bg-black/20 rounded-xl p-4 mb-4 backdrop-blur-md">
                          <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2"><span className="text-blue-200 text-xs uppercase">Veículo</span><span className="font-bold text-sm">{activeTrip.vehicleSnapshot}</span></div>
                          <div className="flex justify-between items-center"><span className="text-blue-200 text-xs uppercase">Saída (KM)</span><span className="font-mono text-xl font-bold text-white">{activeTrip.kmOut}</span></div>
                      </div>
                      <button onClick={() => setViewingTrip(activeTrip)} className="w-full bg-blue-900/40 text-blue-100 font-bold text-sm py-3 rounded-xl mb-3 flex items-center justify-center border border-blue-500/30"><Eye className="mr-2" size={18} /> VER DETALHES</button>
                      <button onClick={() => setView('FINISH')} className="w-full bg-white text-blue-900 font-black text-lg py-4 rounded-xl flex items-center justify-center shadow-lg"><StopCircle className="mr-2" /> ENCERRAR VIAGEM</button>
                  </div>
              </div>
          ) : (
              <div className="animate-fadeIn space-y-4">
                  <h2 className="text-lg font-bold text-slate-300 flex items-center"><Calendar className="mr-2" size={20}/> Viagens Agendadas</h2>
                  {scheduledTrips.length === 0 ? (
                      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center text-slate-500"><Clock size={40} className="mx-auto mb-2 opacity-50"/><p>Nenhuma viagem agendada.</p></div>
                  ) : (
                      <div className="space-y-3">
                          {scheduledTrips.map(trip => {
                              const canStart = checkTimeWindow(trip);
                              return (
                                  <div key={trip.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative overflow-hidden">
                                      <div className="flex justify-between items-start mb-3">
                                          <div><span className="text-xs font-bold text-slate-400 block mb-1">{new Date(trip.dateOut).toLocaleDateString()} às {trip.timeOut}</span><h3 className="font-bold text-white text-lg">{trip.destination}</h3><p className="text-xs text-slate-400 mt-1 uppercase">{trip.vehicleSnapshot}</p></div>
                                      </div>
                                      <div className="grid grid-cols-4 gap-2">
                                          <button onClick={() => setViewingTrip(trip)} className="col-span-1 bg-slate-700 text-blue-200 rounded-lg flex items-center justify-center"><Eye size={20}/></button>
                                          <button onClick={() => canStart && initiateStartSequence(trip)} disabled={!canStart} className={`col-span-3 py-3 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${canStart ? 'bg-green-600 text-white shadow-lg active:scale-95' : 'bg-slate-700 text-slate-500'}`}>{canStart ? <><Play size={16} className="mr-2"/> INICIAR VIAGEM</> : <><Lock size={16} className="mr-2"/> AGUARDE O HORÁRIO</>}</button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          )}
      </div>
      <BottomNav />
      {viewingTrip && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-2xl animate-fadeIn text-slate-900">
                  <div className="bg-slate-100 p-4 sticky top-0 border-b border-slate-200 flex justify-between items-center"><h3 className="font-bold text-lg flex items-center"><FileText className="mr-2 text-brand-600" size={20}/> Detalhes da Viagem</h3><button onClick={() => setViewingTrip(null)} className="p-2 bg-slate-200 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"><X size={20}/></button></div>
                  <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-400 uppercase">Destino</p><p className="font-black text-xl text-brand-700">{viewingTrip.destination}</p></div><div className="text-right"><p className="text-xs font-bold text-slate-400 uppercase">Horário</p><p className="font-bold text-lg">{viewingTrip.timeOut}</p><p className="text-xs text-slate-500">{new Date(viewingTrip.dateOut).toLocaleDateString()}</p></div></div>
                      <hr className="border-slate-100"/>
                      {viewingTrip.patient?.name && (
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><h4 className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center"><User size={14} className="mr-1"/> Paciente</h4><p className="font-bold text-slate-800">{viewingTrip.patient.name}</p>{viewingTrip.patient.hasCompanion && <span className="inline-block mt-1 bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">+ ACOMPANHANTE</span>}</div>
                      )}
                      <div className="grid grid-cols-2 gap-4"><div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Veículo</p><p className="text-sm font-bold text-slate-700">{viewingTrip.vehicleSnapshot}</p></div><div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Tipo</p><p className="text-sm font-bold text-slate-700">{viewingTrip.type}</p></div></div>
                  </div>
                  <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl"><button onClick={() => setViewingTrip(null)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">Fechar Detalhes</button></div>
              </div>
          </div>
      )}
    </div>
  );
};
