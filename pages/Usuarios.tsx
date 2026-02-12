import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { secretariasService } from '../services/secretariasService';
import { User, UserRole, Secretaria } from '../types';
import { Plus, Edit, Trash2, X, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../services/authContext';

export const Usuarios = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({
      active: true,
      role: UserRole.PADRAO
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser?.organization_id]);

  const loadData = async () => {
    const orgId = currentUser?.organization_id;
    if (!orgId) return;
    
    try {
        const [u, s] = await Promise.all([
          api.users.list(),
          secretariasService.listar(orgId)
        ]);
        setUsers(u as User[]);
        setSecretarias(s);
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = currentUser?.organization_id;
    if (!orgId) {
      alert("Erro: Contexto de organização não identificado.");
      return;
    }

    setIsSaving(true);
    try {
        if(!editingUser.name || !editingUser.email) throw new Error("Dados obrigatórios faltando");
        
        if (editingUser.role === UserRole.SUPER_ADMIN && currentUser?.role !== UserRole.SUPER_ADMIN) {
            throw new Error("Você não tem permissão para criar usuários SUPER_ADMIN.");
        }

        const payload = {
            name: editingUser.name,
            role: editingUser.role,
            active: editingUser.active,
            secretaria_id: editingUser.secretaria_id || null
        };

        if (editingUser.id) {
            await api.users.update(editingUser.id, payload);
        } else {
            await api.users.create({ 
                ...payload,
                email: editingUser.email,
                organization_id: orgId,
                active: editingUser.active !== false
            });
        }
        setShowModal(false);
        loadData();
    } catch(e:any) {
        alert(e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Remover acesso deste usuário permanentemente?")) return;
    const orgId = currentUser?.organization_id;
    if (!orgId) return;

    try { 
        await api.users.delete(id); 
        loadData(); 
    } catch(e) {console.error(e);}
  };

  const openModal = (u?: User) => {
    setEditingUser(u || { role: UserRole.PADRAO, active: true });
    setShowModal(true);
  };

  const inputClass = "w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none uppercase font-bold bg-white text-black";

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
            <button onClick={() => openModal()} className="bg-brand-600 text-white px-6 py-3 rounded-xl flex items-center shadow-lg font-black uppercase text-xs transition-all active:scale-95">
                <Plus className="mr-2 h-4 w-4"/> Novo Usuário
            </button>
        </div>

        {loading ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <RefreshCw className="animate-spin h-10 w-10 mx-auto text-brand-500 mb-4"/>
                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Sincronizando Usuários...</p>
            </div>
        ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Perfil / Secretaria</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Gerenciar</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4 font-black text-gray-900 uppercase text-sm">{u.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <span className="bg-gray-100 text-gray-800 text-[10px] px-2 py-1 rounded border border-gray-200 font-black uppercase w-fit">{u.role}</span>
                                    {u.secretaria_id && (
                                        <span className="text-[9px] text-brand-600 font-bold uppercase">
                                            {secretarias.find(s => s.id === u.secretaria_id)?.nome || 'Secretaria Vinculada'}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                {u.active ? 
                                    <span className="text-green-600 text-[10px] font-black flex items-center uppercase"><Check size={14} className="mr-1"/> Ativo</span> : 
                                    <span className="text-red-600 text-[10px] font-black flex items-center uppercase"><X size={14} className="mr-1"/> Inativo</span>
                                }
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={18}/></button>
                                    <button onClick={() => handleDelete(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors" disabled={u.id === currentUser?.id}><Trash2 size={18}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        )}

        {showModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl animate-fadeIn border-t-[12px] border-brand-600 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{editingUser.id ? 'Editar' : 'Novo'} Usuário</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Gestão de Acesso Institucional</p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={28}/></button>
                    </div>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                             <input 
                                className={inputClass} 
                                value={editingUser.name || ''} 
                                onChange={e => setEditingUser({...editingUser, name: e.target.value.replace(/[0-9]/g, '').toUpperCase()})} 
                                required 
                             />
                        </div>
                        <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">E-mail Corporativo</label>
                             <input className={inputClass} type="email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value.toLowerCase()})} required disabled={!!editingUser.id} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nível de Permissão</label>
                                <select className={inputClass} value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                                    {Object.values(UserRole)
                                        .filter(r => r !== UserRole.SUPER_ADMIN || currentUser?.role === UserRole.SUPER_ADMIN)
                                        .map(r => <option key={r} value={r}>{r}</option>)
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Secretaria (Opcional)</label>
                                <select 
                                    className={inputClass} 
                                    value={editingUser.secretaria_id || ''} 
                                    onChange={e => setEditingUser({...editingUser, secretaria_id: e.target.value || undefined})}
                                >
                                    <option value="">GERAL / TODAS</option>
                                    {secretarias.map((s: Secretaria) => (
                                        <option key={s.id} value={s.id}>{s.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <input type="checkbox" id="userActive" className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" checked={editingUser.active} onChange={e => setEditingUser({...editingUser, active: e.target.checked})} />
                            <label htmlFor="userActive" className="text-sm font-black text-gray-700 uppercase">Usuário com Acesso Liberado</label>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t mt-8">
                            <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-gray-600 transition-colors">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-brand-700 transition-all active:scale-95 flex items-center">
                                {isSaving ? <RefreshCw className="animate-spin mr-3"/> : null}
                                {editingUser.id ? 'Salvar Alterações' : 'Criar Usuário'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
