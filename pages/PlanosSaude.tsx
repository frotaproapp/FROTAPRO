import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { HealthPlan } from '../types';
import { Plus, Trash2, Heart, Edit, Save, X } from 'lucide-react';

export const PlanosSaude = () => {
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [newPlanName, setNewPlanName] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const getSafeError = (e: any) => e?.message || (typeof e === 'string' ? e : JSON.stringify(e));

  const fetchPlans = async () => {
    try {
        const data = await api.healthPlans.list();
        setPlans(data);
    } catch (e) {
        console.error("Error fetching plans", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;

    try {
        await api.healthPlans.add(newPlanName.toUpperCase());
        setNewPlanName('');
        fetchPlans();
    } catch (e: any) {
        alert("Erro ao adicionar: " + getSafeError(e));
    }
  };

  const handleStartEdit = (plan: HealthPlan) => {
      setEditingId(plan.id);
      setEditName(plan.name);
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setEditName('');
  };

  const handleUpdate = async () => {
      if (!editingId || !editName.trim()) return;
      
      const originalPlan = plans.find(p => p.id === editingId);
      if (originalPlan) {
          try {
              await api.healthPlans.update({
                  ...originalPlan,
                  name: editName.toUpperCase()
              });
              
              setEditingId(null);
              setEditName('');
              fetchPlans();
          } catch (e: any) {
              alert("Erro ao atualizar: " + getSafeError(e));
          }
      }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este plano de saúde?')) {
      try {
          await api.healthPlans.delete(id);
          fetchPlans();
      } catch (e: any) {
          alert("Erro ao excluir: " + getSafeError(e));
      }
    }
  };

  const inputClass = "block w-full border border-gray-300 rounded-md p-2 bg-white text-black shadow-sm focus:ring-brand-500 focus:border-brand-500";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos de Saúde</h1>
          <p className="text-sm text-gray-500">Cadastro de convênios para uso nos registros de pacientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-fit">
              <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                  <Plus className="mr-2 h-5 w-5" /> Cadastrar Novo Plano
              </h3>
              <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                      <label htmlFor="newPlanName" className="block text-sm font-medium text-gray-700">Nome do Convênio / Plano</label>
                      <input 
                        id="newPlanName"
                        name="newPlanName"
                        type="text" 
                        required 
                        value={newPlanName} 
                        onChange={e => setNewPlanName(e.target.value)} 
                        placeholder="Ex: UNIMED, BRADESCO SAÚDE, SUS..."
                        className={inputClass}
                      />
                  </div>
                  <button type="submit" className="w-full bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700 font-medium">
                      Salvar Cadastro
                  </button>
              </form>
          </div>

          <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
             <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                 <h3 className="text-sm font-bold text-gray-700">Planos Cadastrados ({plans.length})</h3>
             </div>
             <ul className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                 {plans.map(plan => (
                     <li key={plan.id} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                         {editingId === plan.id ? (
                             <div className="flex w-full items-center gap-2">
                                 <input 
                                    id={`edit-plan-${plan.id}`}
                                    name="editPlanName"
                                    type="text" 
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm bg-white text-black"
                                    autoFocus
                                    aria-label="Editar nome do plano"
                                 />
                                 <button onClick={handleUpdate} className="text-green-600 p-1 hover:bg-green-50 rounded"><Save size={18}/></button>
                                 <button onClick={handleCancelEdit} className="text-red-600 p-1 hover:bg-red-50 rounded"><X size={18}/></button>
                             </div>
                         ) : (
                             <>
                                <div className="flex items-center">
                                    <div className="bg-red-100 p-2 rounded-full mr-3 text-red-600">
                                        <Heart size={16} />
                                    </div>
                                    <span className="font-medium text-gray-900">{plan.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => handleStartEdit(plan)}
                                        className="text-gray-400 hover:text-blue-600 p-2 rounded hover:bg-blue-50"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(plan.id)}
                                        className="text-gray-400 hover:text-red-600 p-2 rounded hover:bg-red-50"
                                        title="Remover"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                             </>
                         )}
                     </li>
                 ))}
                 {plans.length === 0 && !loading && (
                     <li className="px-4 py-6 text-center text-gray-500">Nenhum plano cadastrado.</li>
                 )}
             </ul>
          </div>
      </div>
    </div>
  );
};