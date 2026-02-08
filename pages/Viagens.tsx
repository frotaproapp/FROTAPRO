import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Trip, TripStatus, Vehicle, Professional, ProfessionalType, VehicleType, Solicitor } from '../types';
import { Plus, Edit, Map, Search, X, Save, Printer, Ambulance, RefreshCw, HeartPulse, Building2, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { TripTicket } from '../components/TripTicket';

export const Viagens = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Professional[]>([]);
  const [solicitors, setSolicitors] = useState<Solicitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicketTrip, setSelectedTicketTrip] = useState<Trip | null>(null);
  
  const initialTripState = {
    status: TripStatus.AGENDADA,
    type: 'CONSULTA',
    solicitante: '',
    responsavel: '',
    origin: 'SECRETARIA DE SAÚDE',
    destination: '',
    dateOut: new Date().toISOString().split('T')[0],
    timeOut: '07:00',
    kmOut: 0,
    driverId: '',
    driverName: '',
    patient: { 
      name: '', cpf: '', cartaoSus: '', birthDate: '', plano: 'SUS', endereco: '', telefone: '',
      hasCompanion: false, needsOxygen: false, isBedridden: false 
    },
    passengerList: []
  };

  const [editingTrip, setEditingTrip] = useState<Partial<any>>(initialTripState);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const [tData, vData, pData, sData] = await Promise.all([
            api.trips.list(),
            api.vehicles.list(),
            api.professionals.list(),
            api.solicitors.list()
        ]);
        setTrips(tData);
        setVehicles(vData.filter(v => v.status === 'ATIVO'));
        setDrivers(pData.filter(p => p.type === ProfessionalType.MOTORISTA));
        setSolicitors(sData);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const maskCPF = (val: string) => {
    return val.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          const payload = { ...editingTrip };
          if (payload.patient) payload.patient.cpf = payload.patient.cpf.replace(/\D/g, '');
          if (payload.id) await api.trips.update(payload);
          else await api.trips.create(payload);
          setShowModal(false);
          loadData();
      } catch(e) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const inputClass = "w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none uppercase font-bold bg-white text-black";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1";

  return (
      <div className="space-y-6">
          {selectedTicketTrip && <TripTicket trip={selectedTicketTrip} onClose={() => setSelectedTicketTrip(null)} />}
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h1 className="text-2xl font-black text-gray-900 flex items-center uppercase"><Map className="mr-3 text-brand-600"/> Viagens</h1>
              <button onClick={() => { setEditingTrip(initialTripState); setViewOnly(false); setShowModal(true); }} className="bg-brand-600 text-white px-6 py-3 rounded-xl font-black shadow-lg uppercase text-xs">Nova Viagem</button>
          </div>

          <div className="grid grid-cols-1 gap-4">
              {loading ? <div className="text-center py-20 text-gray-400 animate-pulse">Sincronizando...</div> : trips.map(trip => (
                  <div key={trip.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                          <p className="text-[10px] font-black text-brand-600 uppercase">{trip.type} • {trip.dateOut}</p>
                          <h3 className="text-lg font-black text-gray-900 uppercase">{trip.destination}</h3>
                          <p className="text-xs text-gray-500 uppercase">{trip.patient?.name || 'Vários Passageiros'} • {trip.vehicleSnapshot}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingTrip(trip); setViewOnly(true); setShowModal(true); }} className="p-2 bg-gray-100 rounded-lg"><Eye size={18}/></button>
                        <button onClick={() => setSelectedTicketTrip(trip)} className="p-2 bg-brand-50 text-brand-600 rounded-lg"><Printer size={18}/></button>
                        <button onClick={async () => { if(confirm("Excluir viagem?")) { await api.trips.update({...trip, status: TripStatus.CANCELADA}); loadData(); } }} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={18}/></button>
                      </div>
                  </div>
              ))}
          </div>

          {showModal && (
              <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 flex flex-col border-t-[10px] border-brand-600">
                      <div className="p-6 border-b flex justify-between items-center">
                          <h2 className="text-xl font-black uppercase">Ficha de Viagem</h2>
                          <button onClick={() => setShowModal(false)}><X size={28}/></button>
                      </div>
                      <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><label className={labelClass}>Veículo</label><input list="dl-v" className={inputClass} value={editingTrip.vehicleSnapshot} onChange={e => setEditingTrip({...editingTrip, vehicleSnapshot: e.target.value.toUpperCase()})} required disabled={viewOnly}/><datalist id="dl-v">{vehicles.map(v => <option key={v.id} value={`${v.plate} - ${v.model}`}/>)}</datalist></div>
                              <div><label className={labelClass}>Condutor</label><input list="dl-d" className={inputClass} value={editingTrip.driverName} onChange={e => setEditingTrip({...editingTrip, driverName: e.target.value.toUpperCase()})} required disabled={viewOnly}/><datalist id="dl-d">{drivers.map(d => <option key={d.id} value={d.name}/>)}</datalist></div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-2xl border">
                              <h3 className="text-xs font-black uppercase mb-4 flex items-center"><HeartPulse size={16} className="mr-2 text-brand-600"/> Prontuário do Paciente</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="md:col-span-2"><label className={labelClass}>Nome Completo</label><input className={inputClass} value={editingTrip.patient?.name} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, name: e.target.value.toUpperCase()}})} required disabled={viewOnly}/></div>
                                  <div><label className={labelClass}>CPF</label><input className={inputClass} value={editingTrip.patient?.cpf} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, cpf: maskCPF(e.target.value)}})} maxLength={14} required disabled={viewOnly}/></div>
                                  <div><label className={labelClass}>Cartão SUS</label><input className={inputClass} value={editingTrip.patient?.cartaoSus} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, cartaoSus: e.target.value}})} placeholder="000 0000 0000 0000" disabled={viewOnly}/></div>
                                  <div><label className={labelClass}>Nascimento</label><input className={inputClass} value={editingTrip.patient?.birthDate} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, birthDate: e.target.value}})} placeholder="DD/MM/AAAA" required disabled={viewOnly}/></div>
                              </div>
                          </div>
                          <div><label className={labelClass}>Destino</label><input className={inputClass} value={editingTrip.destination} onChange={e => setEditingTrip({...editingTrip, destination: e.target.value.toUpperCase()})} required disabled={viewOnly}/></div>
                          <div className="flex justify-end gap-3 pt-4 border-t">
                              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-400 font-black uppercase text-xs">Cancelar</button>
                              {!viewOnly && <button type="submit" className="bg-brand-600 text-white px-10 py-3 rounded-xl font-black uppercase text-xs flex items-center">{isSaving ? <RefreshCw className="animate-spin mr-2"/> : <Save className="mr-2"/>} Gravar Ficha</button>}
                          </div>
                      </form>
                  </div>
              </div>
          )}
      </div>
  );
};