
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { secretariasService } from '../services/secretariasService';
import { useAuth } from '../services/authContext';
import { Vehicle, VehicleType, AmbulanceType, UserRole, Secretaria } from '../types';
import { Plus, Edit, RefreshCw, XCircle, Car, Wind, ShieldCheck, Building2, Users, Stethoscope, Settings2 } from 'lucide-react';

export const Frota = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle>>({
    type: VehicleType.CARRO,
    status: 'ATIVO',
    currentKm: 0,
    year: new Date().getFullYear(),
    capacity: 5,
    hasOxygen: false,
    checklist: { spareTire: true, warningTriangle: true, jack: true, wheelWrench: true, fireExtinguisher: true }
  });

  useEffect(() => { loadData(); }, [user?.organization_id]);

  const loadData = async () => {
    setLoading(true);
    try { 
        const orgId = user?.organization_id;
        const [vData, sData] = await Promise.all([
            api.vehicles.list(),
            orgId ? secretariasService.listar(orgId) : Promise.resolve([])
        ]);
        setVehicles(vData);
        setSecretarias(sData.filter(s => s.active));
    } catch (e) { 
        console.error(e); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        if (!editingVehicle.secretariaId && user?.role !== UserRole.SUPER_ADMIN) {
            throw new Error("Vínculo com Secretaria é obrigatório.");
        }
        
        console.log('Debug - Veículo sendo salvo:', editingVehicle);
        console.log('Debug - Usuário atual:', user);
        
        await api.vehicles.save(editingVehicle);
        setShowModal(false);
        loadData();
    } catch (e: any) { 
        console.error('Debug - Erro completo ao salvar veículo:', e);
        alert(`Erro ao salvar veículo: ${e.message}`); 
    } finally { 
        setIsSaving(false); 
    }
  };

  const toggleChecklist = (field: keyof NonNullable<Vehicle['checklist']>) => {
    if (!editingVehicle.checklist) return;
    setEditingVehicle({ ...editingVehicle, checklist: { ...editingVehicle.checklist, [field]: !editingVehicle.checklist[field] } });
  };

  const inputClass = "w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-bold uppercase transition-all bg-white text-black";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center"><Car className="mr-2 text-brand-600"/> Gestão de Frota</h1>
          <p className="text-sm text-gray-500 font-medium">Monitoramento técnico e alocação de veículos.</p>
        </div>
        <button onClick={() => { 
            setEditingVehicle({ 
                type: VehicleType.CARRO, 
                status: 'ATIVO', 
                currentKm: 0, 
                year: new Date().getFullYear(),
                capacity: 5,
                hasOxygen: false,
                checklist: { spareTire: true, warningTriangle: true, jack: true, wheelWrench: true, fireExtinguisher: true } 
            }); 
            setShowModal(true); 
          }}
          className="bg-brand-600 text-white px-6 py-3 rounded-xl hover:bg-brand-700 flex items-center font-black shadow-lg uppercase text-xs tracking-wider transition-all active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" /> Novo Veículo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
            <RefreshCw className="animate-spin h-10 w-10 mx-auto text-brand-500 mb-4"/>
            <p className="text-gray-400 font-bold uppercase text-xs">Sincronizando Frota...</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map(v => {
          const secretaria = secretarias.find(s => s.id === v.secretariaId);
          return (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all p-6 group">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${v.status === 'ATIVO' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {v.status}
                        </span>
                        <h3 className="text-2xl font-black text-gray-900 uppercase mt-1 tracking-tighter">{v.plate}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v.model}</p>
                    </div>
                    <button onClick={() => { setEditingVehicle(v); setShowModal(true); }} className="p-2 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"><Edit size={20} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 p-3 rounded-xl border">
                        <p className={labelClass}>Tipo</p>
                        <p className="text-xs font-black text-gray-700 uppercase">
                            {v.type}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border">
                        <p className={labelClass}>Odômetro</p>
                        <p className="text-xs font-black text-gray-700"><RefreshCw size={12} className="inline mr-1"/> {v.currentKm?.toLocaleString()} KM</p>
                    </div>
                </div>

                <div className="pt-4 border-t flex items-center justify-between text-gray-400">
                    <div className="flex items-center">
                        <Building2 size={14} className="mr-1.5" />
                        <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{secretaria?.nome || 'FROTA GLOBAL'}</span>
                    </div>
                    <div className="flex items-center">
                        <Users size={14} className="mr-1" />
                        <span className="text-[10px] font-bold">{v.capacity} LUG</span>
                    </div>
                </div>
            </div>
          );
        })}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white rounded-[2rem] max-w-3xl w-full shadow-2xl animate-fadeIn flex flex-col my-8 border-t-8 border-brand-600">
             <div className="flex justify-between items-center p-8 border-b">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Ficha Técnica do Veículo</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl"><XCircle size={32}/></button>
             </div>
             
             <form onSubmit={handleSave} className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className={labelClass}>Placa (Sem traço) *</label>
                        <input className={inputClass} placeholder="ABC1D23" value={editingVehicle.plate || ''} onChange={e => setEditingVehicle({...editingVehicle, plate: e.target.value.toUpperCase().replace('-', '')})} required maxLength={7} />
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelClass}>Marca / Modelo / Cor *</label>
                        <input className={inputClass} placeholder="EX: FIAT DUCATO - BRANCA" value={editingVehicle.model || ''} onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value.toUpperCase()})} required />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className={labelClass}>Tipo de Veículo *</label>
                        <select className={inputClass} value={editingVehicle.type} onChange={e => setEditingVehicle({...editingVehicle, type: e.target.value as VehicleType})}>
                            <option value={VehicleType.CARRO}>CARRO (PASSEIO/SUV)</option>
                            <option value={VehicleType.AMBULANCIA}>AMBULÂNCIA (USA/USB)</option>
                            <option value={VehicleType.VAN}>VAN / MICRO-ÔNIBUS</option>
                            <option value={VehicleType.ONIBUS}>ÔNIBUS (TFD/ESCOLAR)</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Secretaria Responsável *</label>
                        <select className={inputClass} value={editingVehicle.secretariaId || ''} onChange={e => setEditingVehicle({...editingVehicle, secretariaId: e.target.value})} required>
                            <option value="">-- SELECIONE --</option>
                            {secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Capacidade (Lugares) *</label>
                        <input type="number" className={inputClass} value={editingVehicle.capacity || ''} onChange={e => setEditingVehicle({...editingVehicle, capacity: Number(e.target.value)})} required />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-2xl border">
                    <div>
                        <label className={labelClass}>Odômetro Atual (KM) *</label>
                        <input type="number" className={inputClass} value={editingVehicle.currentKm || ''} onChange={e => setEditingVehicle({...editingVehicle, currentKm: Number(e.target.value)})} required />
                    </div>
                    <div>
                        <label className={labelClass}>Ano de Fabricação</label>
                        <input type="number" className={inputClass} value={editingVehicle.year || ''} onChange={e => setEditingVehicle({...editingVehicle, year: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className={labelClass}>Status Operacional</label>
                        <select className={inputClass} value={editingVehicle.status} onChange={e => setEditingVehicle({...editingVehicle, status: e.target.value as any})}>
                            <option value="ATIVO">DISPONÍVEL (ATIVO)</option>
                            <option value="MANUTENCAO">MANUTENÇÃO / OFICINA</option>
                            <option value="INATIVO">BAIXADO / INATIVO</option>
                        </select>
                    </div>
                </div>

                {editingVehicle.type === VehicleType.AMBULANCIA && (
                    <div className="p-6 bg-red-50 rounded-2xl border border-red-100 space-y-4 animate-fadeIn">
                        <h4 className="text-[10px] font-black text-red-600 uppercase flex items-center tracking-widest"><Stethoscope size={14} className="mr-2"/> Especificações</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Classificação</label>
                                <select className={inputClass} value={editingVehicle.ambulanceType || ''} onChange={e => setEditingVehicle({...editingVehicle, ambulanceType: e.target.value as AmbulanceType})}>
                                    <option value="A">TIPO A - TRANSPORTE SIMPLES</option>
                                    <option value="B">TIPO B - SUPORTE BÁSICO (USB)</option>
                                    <option value="C">TIPO C - RESGATE</option>
                                    <option value="D">TIPO D - SUPORTE AVANÇADO (USA)</option>
                                </select>
                            </div>
                            <div className="flex items-center pt-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-6 h-6 rounded border-red-300 text-red-600" checked={editingVehicle.hasOxygen} onChange={e => setEditingVehicle({...editingVehicle, hasOxygen: e.target.checked})} />
                                    <span className="text-xs font-black text-red-800 uppercase flex items-center"><Wind size={16} className="mr-2"/> Possui Oxigênio?</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center tracking-widest"><ShieldCheck size={16} className="mr-2 text-green-600"/> Itens de Segurança</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {['spareTire', 'warningTriangle', 'jack', 'wheelWrench', 'fireExtinguisher'].map(field => (
                            <button key={field} type="button" onClick={() => toggleChecklist(field as any)} className={`flex flex-col items-center justify-center p-4 rounded-xl border text-[9px] font-black uppercase transition-all gap-2 ${editingVehicle.checklist?.[field as keyof NonNullable<Vehicle['checklist']>] ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                {field === 'spareTire' ? 'Estepe' : field === 'warningTriangle' ? 'Triângulo' : field === 'jack' ? 'Macaco' : field === 'wheelWrench' ? 'Chave Roda' : 'Extintor'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-8 border-t">
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 text-gray-400 font-black uppercase text-xs">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="bg-brand-600 text-white px-12 py-4 rounded-2xl font-black uppercase text-sm shadow-xl hover:bg-brand-700 flex items-center">
                        {isSaving ? <RefreshCw className="animate-spin mr-2"/> : <Settings2 size={18} className="mr-2"/>} Gravar Dados
                    </button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};
