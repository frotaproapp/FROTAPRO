
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { secretariasService } from '../services/secretariasService';
import { UserRole, Professional, ProfessionalType, Secretaria } from '../types';
import { useAuth } from '../services/authContext';
import { UserPlus, Edit, X, Trash2, Save, RefreshCw, UserCheck } from 'lucide-react';

export const OrgUsers = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        senhaInicial: '',
        role: UserRole.PADRAO,
        id: '',
        linkedProfessionalId: '',
        secretariaId: '',
        ativo: true
    });

    const isFullAdmin = currentUser?.role === UserRole.ADMIN_TENANT || 
                        currentUser?.role === UserRole.ORG_ADMIN || 
                        currentUser?.role === UserRole.SUPER_ADMIN;

    const isSecretariaAdmin = currentUser?.role === UserRole.ADMIN_SECRETARIA;

    useEffect(() => {
        loadData();
    }, [currentUser?.id, currentUser?.organization_id]);

    const loadData = async () => {
        const tenantId = currentUser?.organization_id;
        if(!tenantId) return;

        setLoading(true);
        try {
            const [uData, pData, sData] = await Promise.all([
                api.org.getUsers(tenantId, isSecretariaAdmin ? currentUser.secretariaId : null),
                api.professionals.list(),
                isFullAdmin ? secretariasService.listar(tenantId) : Promise.resolve([])
            ]);
            
            setUsers(uData);
            setProfessionals(pData.filter(p => p.type === ProfessionalType.MOTORISTA));
            setSecretarias(sData.filter(s => s.active));
        } catch(e) {
            console.error("Erro ao carregar usuários:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const tenantId = currentUser?.organization_id;
        if(!tenantId) return;

        setIsSaving(true);
        try {
            const { nome, email, role, secretariaId, senhaInicial, id, linkedProfessionalId, ativo } = formData;
            const finalSecretariaId = isSecretariaAdmin ? currentUser.secretariaId : secretariaId;

            if ((role === UserRole.ADMIN_SECRETARIA || isSecretariaAdmin) && !finalSecretariaId) {
                throw new Error("Vínculo com secretaria é obrigatório.");
            }

            const data: any = {
                name: nome.toUpperCase(),
                email,
                role,
                organization_id: tenantId,
                secretaria_id: finalSecretariaId || null,
                active: ativo
            };

            let result: any = null;
            if (id) {
                await api.org.updateUser(tenantId, id, data);
                result = { uid: id };
            } else {
                if (!senhaInicial) throw new Error("Senha inicial obrigatória.");
                result = await api.org.createUser(tenantId, { ...data, password: senhaInicial });
            }

            // Correção TS18047: Adicionada verificação de segurança para result
            if (role === UserRole.MOTORISTA && linkedProfessionalId && result?.uid) {
                const uid = result.uid;
                const pro = professionals.find(p => p.id === linkedProfessionalId);
                if (pro) {
                    await api.professionals.save({ 
                        ...pro, 
                        userId: uid, 
                        secretariaId: data.secretaria_id || pro.secretariaId || null 
                    });
                }
            }

            setShowModal(false);
            loadData();
        } catch(e:any) {
            alert(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const openModal = (u?: any) => {
        const linkedPro = professionals.find(p => p.userId === u?.id);
        setFormData({
            id: u?.id || '',
            nome: u?.name || '',
            email: u?.email || '',
            senhaInicial: '',
            role: u?.role || UserRole.PADRAO,
            linkedProfessionalId: linkedPro?.id || '',
            secretariaId: u?.secretaria_id || (isSecretariaAdmin ? currentUser?.secretariaId || '' : ''),
            ativo: u?.active !== false
        });
        setShowModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center uppercase tracking-tighter">
                        <UserCheck className="mr-3 text-brand-600" size={28}/> Controle de Acessos
                    </h1>
                </div>
                <button onClick={() => openModal()} className="bg-brand-600 text-white px-6 py-3 rounded-xl flex items-center shadow-lg font-black uppercase text-xs transition-all active:scale-95">
                    <UserPlus className="mr-2 h-4 w-4"/> Criar Acesso
                </button>
            </div>
            
            {loading ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <RefreshCw className="animate-spin h-10 w-10 mx-auto text-brand-500 mb-4"/>
                    <p className="text-gray-400 font-bold uppercase text-xs">Sincronizando Índices...</p>
                </div>
            ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Colaborador</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Perfil</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidade</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.map(u => {
                            const secretaria = secretarias.find(s => s.id === u.secretaria_id);
                            return (
                                <tr key={u.id} className="hover:bg-gray-50 group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-black text-gray-900 uppercase">{u.name}</div>
                                        <div className="text-[10px] text-gray-400">{u.email}</div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-[9px] font-black px-2 py-1 rounded border uppercase">{u.role}</span></td>
                                    <td className="px-6 py-4"><span className="text-gray-700 text-[10px] font-bold uppercase">{secretaria?.nome || 'Acesso Geral'}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => openModal(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"><Edit size={18}/></button>
                                            <button onClick={async () => { if(confirm("Revogar acesso?")) { await api.org.removeUser(currentUser!.organization_id, u.id); loadData(); } }} className="p-2 text-red-600 hover:bg-red-50 rounded-xl" disabled={u.id === currentUser?.id}><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl border-t-[12px] border-brand-600">
                        <div className="flex justify-between mb-8">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Gestão de Acesso</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-red-500 rounded-full"><X size={28}/></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Nome Completo</label>
                                <input className="w-full border p-3.5 rounded-xl text-sm uppercase font-black bg-white text-black" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">E-mail</label>
                                <input className="w-full border p-3.5 rounded-xl text-sm bg-white text-black" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={!!formData.id} required />
                            </div>

                            {!formData.id && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Senha Inicial</label>
                                    <input className="w-full border p-3.5 rounded-xl text-sm bg-white text-black" type="password" value={formData.senhaInicial} onChange={(e) => setFormData({ ...formData, senhaInicial: e.target.value })} required />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Perfil</label>
                                    <select className="w-full border p-3.5 rounded-xl text-[11px] font-black uppercase bg-white text-black" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}>
                                        {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Lotação</label>
                                    {isSecretariaAdmin ? <div className="p-3.5 bg-blue-50 rounded-xl text-[10px] font-black text-blue-700">Minha Unidade</div> : 
                                    <select value={formData.secretariaId} onChange={(e) => setFormData({...formData, secretariaId: e.target.value})} className="w-full border p-3.5 rounded-xl text-[11px] font-black uppercase bg-white text-black">
                                        <option value="">-- Geral --</option>
                                        {secretarias.map(sec => <option key={sec.id} value={sec.id}>{sec.nome}</option>)}
                                    </select>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-gray-300 text-brand-600" 
                                    checked={!!formData.ativo} 
                                    onChange={e => setFormData({...formData, ativo: e.target.checked})} 
                                />
                                <label className="text-sm font-black text-gray-700 uppercase">Acesso Liberado</label>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t mt-8">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-400 font-black uppercase text-xs">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center">
                                    {isSaving ? <RefreshCw className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>} Gravar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
