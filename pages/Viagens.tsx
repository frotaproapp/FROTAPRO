import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Trip, TripStatus, Vehicle, Professional, ProfessionalType, VehicleType, Solicitor, Passenger } from '../types';
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
    solicitante2: '',
    responsavel: '',
    origin: 'SECRETARIA DE SAÚDE',
    destination: '',
    destination2: '',
    destination3: '',
    destinationUnit: '',
    dateOut: new Date().toISOString().split('T')[0],
    timeOut: '07:00',
    kmOut: 0,
    driverId: '',
    driverName: '',
    vehicleId: '',
    vehicleSnapshot: '',
    vehicleType: VehicleType.CARRO,
    patient: { 
      name: '', cpf: '', cartaoSus: '', birthDate: '', plano: 'SUS', endereco: '', telefone: '', condicao: '',
      hasCompanion: false, companionName: '', companionCpf: '', companionPhone: '', 
      needsOxygen: false, isBedridden: false 
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

  const isAmbulance = (vehicleSnapshot: string) => {
    const selectedVehicle = vehicles.find(v => `${v.plate} - ${v.model}` === vehicleSnapshot);
    return selectedVehicle?.type === VehicleType.AMBULANCIA;
  };

  const addPassenger = () => {
    const newPassenger = { name: '', cpf: '', susCard: '', birthDate: '', direction: 'IDA' as const };
    setEditingTrip({
      ...editingTrip, 
      passengerList: [...(editingTrip.passengerList || []), newPassenger]
    });
  };

  const updatePassenger = (index: number, field: string, value: any) => {
    const updatedList = [...(editingTrip.passengerList || [])];
    updatedList[index] = { ...updatedList[index], [field]: value };
    setEditingTrip({ ...editingTrip, passengerList: updatedList });
  };

  const removePassenger = (index: number) => {
    const updatedList = [...(editingTrip.passengerList || [])];
    updatedList.splice(index, 1);
    setEditingTrip({ ...editingTrip, passengerList: updatedList });
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          const payload = { ...editingTrip };
          if (payload.patient) payload.patient.cpf = payload.patient.cpf.replace(/\D/g, '');
          if (payload.patient?.companionCpf) payload.patient.companionCpf = payload.patient.companionCpf.replace(/\D/g, '');
          if (payload.passengerList) {
            payload.passengerList = payload.passengerList.map((p: Passenger) => ({
              ...p,
              cpf: p.cpf.replace(/\D/g, '')
            }));
          }
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
                          {/* Identificação Operacional */}
                          <div className="border border-gray-300 rounded-lg p-4">
                              <h3 className="text-[10px] font-black uppercase bg-gray-100 px-2 py-1 mb-4">1. Identificação Operacional</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div><label className={labelClass}>Veículo *</label><input list="dl-v" className={inputClass} value={editingTrip.vehicleSnapshot} onChange={e => {
                                    const value = e.target.value.toUpperCase();
                                    setEditingTrip({...editingTrip, vehicleSnapshot: value});
                                  }} required disabled={viewOnly}/><datalist id="dl-v">{vehicles.map(v => <option key={v.id} value={`${v.plate} - ${v.model}`}/>)}</datalist></div>
                                  <div><label className={labelClass}>Condutor *</label><input list="dl-d" className={inputClass} value={editingTrip.driverName} onChange={e => setEditingTrip({...editingTrip, driverName: e.target.value.toUpperCase()})} required disabled={viewOnly}/><datalist id="dl-d">{drivers.map(d => <option key={d.id} value={d.name}/>)}</datalist></div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                  <div><label className={labelClass}>Solicitante Origem</label><input list="dl-s" className={inputClass} value={editingTrip.solicitante} onChange={e => setEditingTrip({...editingTrip, solicitante: e.target.value.toUpperCase()})} disabled={viewOnly}/><datalist id="dl-s">{solicitors.map(s => <option key={s.id} value={s.name}/>)}</datalist></div>
                                  <div><label className={labelClass}>Solicitante 2</label><input className={inputClass} value={editingTrip.solicitante2} onChange={e => setEditingTrip({...editingTrip, solicitante2: e.target.value.toUpperCase()})} disabled={viewOnly}/></div>
                              </div>
                              <div className="mt-4"><label className={labelClass}>Responsável</label><input className={inputClass} value={editingTrip.responsavel} onChange={e => setEditingTrip({...editingTrip, responsavel: e.target.value.toUpperCase()})} disabled={viewOnly}/></div>
                          </div>

                          {/* Itinerário e Dados */}
                          <div className="border border-gray-300 rounded-lg p-4">
                              <h3 className="text-[10px] font-black uppercase bg-gray-100 px-2 py-1 mb-4">2. Itinerário e Dados do Translado</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div><label className={labelClass}>Unidade Destino</label><input className={inputClass} value={editingTrip.destinationUnit} onChange={e => setEditingTrip({...editingTrip, destinationUnit: e.target.value.toUpperCase()})} disabled={viewOnly}/></div>
                                  <div><label className={labelClass}>Destino 1 *</label><input className={inputClass} value={editingTrip.destination} onChange={e => setEditingTrip({...editingTrip, destination: e.target.value.toUpperCase()})} required disabled={viewOnly}/></div>
                                  <div><label className={labelClass}>Destino 2</label><input className={inputClass} value={editingTrip.destination2} onChange={e => setEditingTrip({...editingTrip, destination2: e.target.value.toUpperCase()})} disabled={viewOnly}/></div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div><label className={labelClass}>Destino 3</label><input className={inputClass} value={editingTrip.destination3} onChange={e => setEditingTrip({...editingTrip, destination3: e.target.value.toUpperCase()})} disabled={viewOnly}/></div>
                                  <div><label className={labelClass}>Tipo de Translado</label><select className={inputClass} value={editingTrip.type} onChange={e => setEditingTrip({...editingTrip, type: e.target.value})} disabled={viewOnly}>
                                    <option value="CONSULTA">CONSULTA</option>
                                    <option value="EXAME">EXAME</option>
                                    <option value="CIRURGIA">CIRURGIA</option>
                                    <option value="HEMODIALISE">HEMODIALISE</option>
                                    <option value="QUIMIOTERAPIA">QUIMIOTERAPIA</option>
                                    <option value="INTERNACAO">INTERNACAO</option>
                                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                                    <option value="OUTROS">OUTROS</option>
                                  </select></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-dashed">
                                  <div><label className={labelClass}>Data Saída *</label><input type="date" className={inputClass} value={editingTrip.dateOut} onChange={e => setEditingTrip({...editingTrip, dateOut: e.target.value})} required disabled={viewOnly}/></div>
                                  <div><label className={labelClass}>Hora Saída *</label><input type="time" className={inputClass} value={editingTrip.timeOut} onChange={e => setEditingTrip({...editingTrip, timeOut: e.target.value})} required disabled={viewOnly}/></div>
                              </div>
                              <div className="mt-4"><label className={labelClass}>KM Saída *</label><input type="number" className={inputClass} value={editingTrip.kmOut} onChange={e => setEditingTrip({...editingTrip, kmOut: parseInt(e.target.value) || 0})} required disabled={viewOnly}/></div>
                          </div>

                          {/* Ocupantes - Condicional baseado no tipo de veículo */}
                          <div className="border border-gray-300 rounded-lg p-4">
                              <h3 className="text-[10px] font-black uppercase bg-gray-100 px-2 py-1 mb-4">3. Ocupantes (Pacientes / Passageiros)</h3>
                              
                              {isAmbulance(editingTrip.vehicleSnapshot || '') ? (
                                  // Formulário para Ambulância - Paciente único com acompanhante opcional
                                  <div className="space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <div className="md:col-span-2"><label className={labelClass}>Nome Completo do Paciente *</label><input className={inputClass} value={editingTrip.patient?.name} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, name: e.target.value.toUpperCase()}})} required disabled={viewOnly}/></div>
                                          <div><label className={labelClass}>CPF *</label><input className={inputClass} value={editingTrip.patient?.cpf} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, cpf: maskCPF(e.target.value)}})} maxLength={14} required disabled={viewOnly}/></div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <div><label className={labelClass}>Cartão SUS</label><input className={inputClass} value={editingTrip.patient?.cartaoSus} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, cartaoSus: e.target.value}})} placeholder="000 0000 0000 0000" disabled={viewOnly}/></div>
                                          <div><label className={labelClass}>Nascimento *</label><input type="date" className={inputClass} value={editingTrip.patient?.birthDate} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, birthDate: e.target.value}})} required disabled={viewOnly}/></div>
                                          <div><label className={labelClass}>Telefone</label><input className={inputClass} value={editingTrip.patient?.telefone} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, telefone: e.target.value}})} disabled={viewOnly}/></div>
                                      </div>
                                      <div><label className={labelClass}>Endereço</label><input className={inputClass} value={editingTrip.patient?.endereco} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, endereco: e.target.value.toUpperCase()}})} disabled={viewOnly}/></div>
                                      
                                      {/* Acompanhante */}
                                      <div className="bg-gray-50 p-4 rounded-lg border border-dashed">
                                          <div className="flex items-center gap-3 mb-3">
                                              <input type="checkbox" id="hasCompanion" checked={editingTrip.patient?.hasCompanion} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, hasCompanion: e.target.checked}})} disabled={viewOnly}/>
                                              <label htmlFor="hasCompanion" className="text-sm font-bold uppercase">Paciente com acompanhante</label>
                                          </div>
                                          {editingTrip.patient?.hasCompanion && (
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                  <div className="md:col-span-2"><label className={labelClass}>Nome do Acompanhante</label><input className={inputClass} value={editingTrip.patient?.companionName} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, companionName: e.target.value.toUpperCase()}})} disabled={viewOnly}/></div>
                                                  <div><label className={labelClass}>CPF Acompanhante</label><input className={inputClass} value={editingTrip.patient?.companionCpf} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, companionCpf: maskCPF(e.target.value)}})} maxLength={14} disabled={viewOnly}/></div>
                                                  <div className="md:col-span-3"><label className={labelClass}>Telefone Acompanhante</label><input className={inputClass} value={editingTrip.patient?.companionPhone} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, companionPhone: e.target.value}})} disabled={viewOnly}/></div>
                                              </div>
                                          )}
                                      </div>
                                      
                                      {/* Condições especiais */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="flex items-center gap-3">
                                              <input type="checkbox" id="needsOxygen" checked={editingTrip.patient?.needsOxygen} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, needsOxygen: e.target.checked}})} disabled={viewOnly}/>
                                              <label htmlFor="needsOxygen" className="text-sm font-bold uppercase">Necessita oxigênio</label>
                                          </div>
                                          <div className="flex items-center gap-3">
                                              <input type="checkbox" id="isBedridden" checked={editingTrip.patient?.isBedridden} onChange={e => setEditingTrip({...editingTrip, patient: {...editingTrip.patient, isBedridden: e.target.checked}})} disabled={viewOnly}/>
                                              <label htmlFor="isBedridden" className="text-sm font-bold uppercase">Acamado</label>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  // Formulário para outros veículos - Lista de passageiros
                                  <div className="space-y-4">
                                      <div className="flex justify-between items-center">
                                          <h4 className="text-sm font-black uppercase">Passageiros ({editingTrip.passengerList?.length || 0})</h4>
                                          {!viewOnly && <button type="button" onClick={addPassenger} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold uppercase">+ Adicionar Passageiro</button>}
                                      </div>
                                      
                                      {editingTrip.passengerList?.map((passenger, index) => (
                                          <div key={index} className="bg-gray-50 p-3 rounded border border-dashed relative">
                                              {!viewOnly && <button type="button" onClick={() => removePassenger(index)} className="absolute top-2 right-2 text-red-600 hover:text-red-800"><X size={16}/></button>}
                                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                  <div className="md:col-span-2"><label className={labelClass}>Nome Completo</label><input className={inputClass} value={passenger.name} onChange={e => updatePassenger(index, 'name', e.target.value.toUpperCase())} required disabled={viewOnly}/></div>
                                                  <div><label className={labelClass}>CPF</label><input className={inputClass} value={passenger.cpf} onChange={e => updatePassenger(index, 'cpf', maskCPF(e.target.value))} maxLength={14} required disabled={viewOnly}/></div>
                                                  <div><label className={labelClass}>Nascimento</label><input type="date" className={inputClass} value={passenger.birthDate} onChange={e => updatePassenger(index, 'birthDate', e.target.value)} required disabled={viewOnly}/></div>
                                                  <div><label className={labelClass}>Cartão SUS</label><input className={inputClass} value={passenger.susCard} onChange={e => updatePassenger(index, 'susCard', e.target.value)} placeholder="000 0000 0000 0000" disabled={viewOnly}/></div>
                                                  <div><label className={labelClass}>Direção</label><select className={inputClass} value={passenger.direction} onChange={e => updatePassenger(index, 'direction', e.target.value)} disabled={viewOnly}>
                                                      <option value="IDA">IDA</option>
                                                      <option value="VOLTA">VOLTA</option>
                                                      <option value="AMBOS">AMBOS</option>
                                                  </select></div>
                                              </div>
                                          </div>
                                      ))}
                                      
                                      {(!editingTrip.passengerList || editingTrip.passengerList.length === 0) && (
                                          <div className="text-center py-8 text-gray-400">
                                              <p className="text-sm font-bold uppercase">Nenhum passageiro cadastrado</p>
                                              <p className="text-xs">Clique em "Adicionar Passageiro" para incluir passageiros</p>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>

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