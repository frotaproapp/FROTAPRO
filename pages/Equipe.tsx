import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Professional, ProfessionalType, TripStatus } from '../types';
import { Plus, Edit, Trash2, X, AlertCircle, CheckCircle, Car, Filter, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const Equipe = () => {
  const [pros, setPros] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPro, setEditingPro] = useState<Partial<Professional>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para armazenar IDs de motoristas em viagem
  const [activeDriverIds, setActiveDriverIds] = useState<Set<string>>(new Set());
  
  // Controle de Filtros via URL
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Busca paralela de profissionais e viagens para verificar status real
      const [prosData, tripsData] = await Promise.all([
          api.professionals.list(),
          api.trips.list()
      ]);
      
      setPros(prosData);

      // Identifica motoristas com viagens EM_ANDAMENTO
      const activeTrips = tripsData.filter(t => t.status === TripStatus.EM_ANDAMENTO && t.driverId);
      const activeIds = new Set(activeTrips.map(t => t.driverId as string));
      setActiveDriverIds(activeIds);

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
      if (!editingPro.name) throw new Error("Nome obrigatório");
      await api.professionals.save(editingPro as Professional);
      setShowModal(false);
      loadData();
    } catch (e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Excluir profissional?")) return;
    try {
      await api.professionals.delete(id);
      loadData();
    } catch (e) { console.error(e); }
  };

  const openModal = (p?: Professional) => {
    setEditingPro(p || { status: 'ATIVO', type: ProfessionalType.MOTORISTA });
    setShowModal(true);
  };

  const clearFilter = () => {
      setSearchParams({});
  };

  // Lógica de Filtragem Visual
  const filteredPros = pros.filter(pro => {
      if (!filterParam) return true;
      
      const isTraveling = activeDriverIds.has(pro.id);
      const isAvailable = !isTraveling && pro.status === 'ATIVO';

      if (filterParam === 'TRAVELING') return isTraveling;
      if (filterParam === 'AVAILABLE') return isAvailable;
      
      return true;
  });

  const getStatusBadge = (pro: Professional) => {
      if (pro.status === 'INATIVO') {
          return <span className="flex items-center text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200"><XCircle size={10} className="mr-1"/> INATIVO</span>;
      }
      
      if (activeDriverIds.has(pro.id)) {
          return <span className="flex items-center text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded border border-amber-200 animate-pulse"><Car size={10} className="mr-1"/> EM VIAGEM (INDISPONÍVEL)</span>;
      }

      return <span className="flex items-center text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200"><CheckCircle size={10} className="mr-1"/> DISPONÍVEL</span>;
  };

  const inputClass = "w-full border border-gray-300 rounded p-2 text-sm focus:ring-brand-500 focus:border-brand-500 bg-white text-black";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Equipe</h1>
          <p className="text-sm text-gray-500">Monitoramento de status e cadastro de colaboradores.</p>
        </div>
        <button onClick={() => openModal()} className="bg-brand-600 text-white px-4 py-2 rounded flex items-center hover:bg-brand-700 shadow-sm transition-all">
          <Plus className="mr-2 h-5 w-5"/> Novo Profissional
        </button>
      </div>

      {/* BARRA DE FILTRO ATIVO */}
      {filterParam && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-between text-sm text-blue-800 animate-fadeIn">
              <div className="flex items-center font-bold">
                  <Filter size={16} className="mr-2"/>
                  Filtro Ativo: {filterParam === 'TRAVELING' ? 'Motoristas em Viagem' : 'Motoristas Disponíveis'}
              </div>
              <button onClick={clearFilter} className="text-gray-500 hover:text-red-500 flex items-center bg-white border border-gray-200 px-3 py-1 rounded hover:bg-red-50 transition-colors">
                  <X size={14} className="mr-1"/> Limpar Filtro
              </button>
          </div>
      )}

      {loading ? <div className="text-center py-10 text-gray-500">Sincronizando dados da equipe...</div> : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredPros.map(pro => (
          <div key={pro.id} className={`bg-white p-4 rounded-lg shadow-sm border transition-all hover:shadow-md ${activeDriverIds.has(pro.id) ? 'border-amber-300 ring-1 ring-amber-100' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{pro.name}</h3>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{pro.type}</span>
              </div>
              <div className="flex space-x-1">
                <button onClick={() => openModal(pro)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50"><Edit size={18}/></button>
                <button onClick={() => handleDelete(pro.id)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 size={18}/></button>
              </div>
            </div>
            
            <div className="mb-3">
              {getStatusBadge(pro)}
            </div>

            {pro.type === ProfessionalType.MOTORISTA && (
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${pro.userId ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-[10px] font-bold uppercase ${pro.userId ? 'text-green-700' : 'text-red-700'}`}>
                  {pro.userId ? '✅ Vinculado ao App Mobile' : '❌ Não Vinculado - Sem Acesso Mobile'}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
              <span>Doc: <span className="font-mono text-gray-700">{pro.documentNumber || 'N/A'}</span></span>
            </div>
          </div>
        ))}
        
        {filteredPros.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">
            Nenhum profissional encontrado com este filtro.
          </div>
        )}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-bold text-gray-800">{editingPro.id ? 'Editar' : 'Novo'} Profissional</h2>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X/></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nome Completo</label>
                    <input 
                        id="proName"
                        className={inputClass} 
                        value={editingPro.name || ''} 
                        onChange={e => setEditingPro({...editingPro, name: e.target.value.replace(/[0-9]/g, '').toUpperCase()})} 
                        required 
                        placeholder="Nome do colaborador"
                        autoFocus
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Função</label>
                        <select className={inputClass} value={editingPro.type} onChange={e => setEditingPro({...editingPro, type: e.target.value as ProfessionalType})}>
                            {Object.values(ProfessionalType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Doc (CNH/CRM)</label>
                        <input className={inputClass} value={editingPro.documentNumber || ''} onChange={e => setEditingPro({...editingPro, documentNumber: e.target.value})} placeholder="Registro"/>
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Situação Cadastral</label>
                    <select className={inputClass} value={editingPro.status} onChange={e => setEditingPro({...editingPro, status: e.target.value as any})}>
                        <option value="ATIVO">Ativo (Disponível para Escala)</option>
                        <option value="INATIVO">Inativo (Bloqueado)</option>
                    </select>
                 </div>
                 <div className="flex justify-end pt-4 gap-2">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 text-sm font-bold">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="bg-brand-600 text-white px-6 py-2 rounded shadow hover:bg-brand-700 text-sm font-bold flex items-center">
                        {isSaving ? 'Salvando...' : 'Salvar Dados'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};