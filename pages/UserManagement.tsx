import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
import { api } from '../services/api';
import { Users, UserPlus, Trash2, Shield, Edit, CheckCircle, XCircle } from 'lucide-react';
import { UserRole, User } from '../types';

export const UserManagement = () => {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ 
      name: '', 
      email: '', 
      cpf: '',
      role: UserRole.USER, 
      password: '' 
  });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const canManage = hasRole(UserRole.ORG_ADMIN) || hasRole(UserRole.SUPER_ADMIN) || hasRole(UserRole.DIRETOR);

  const getSafeError = (e: any) => e?.message || (typeof e === 'string' ? e : JSON.stringify(e));

  const loadUsers = async () => {
    try {
        const data = await api.users.list();
        // Added mapping to bridge database fields (nome, ativo) to the User interface
        const mapped = (data || []).map((x: any) => ({
            ...x,
            name: x.nome || x.name,
            active: x.ativo !== false
        }));
        setUsers(mapped);
    } catch (e) {
        console.error("Error loading users", e);
    }
  };

  useEffect(() => {
    if (canManage) {
      loadUsers();
    }
  }, [user, canManage]);

  if (!canManage) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-red-600 bg-white shadow rounded-lg p-6">
            <Shield size={48} className="mb-2"/>
            <h2 className="text-xl font-bold">Acesso Restrito</h2>
            <p>Apenas administradores podem gerenciar usuários desta organização.</p>
        </div>
    );
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.name || !newUser.cpf) return alert('Preencha nome, email, CPF e senha.');
    // Added fix: Identify current tenant context
    const tenantId = user?.tenantId;
    if (!tenantId) return;
    setLoading(true);

    try {
        // Fix: Replaced api.users.create (non-existent) with api.org.createUser
        // Maps 'name' to 'nome' and 'password' to 'senha' per backend requirements
        await api.org.createUser(tenantId, {
            nome: newUser.name,
            email: newUser.email,
            cpf: newUser.cpf,
            role: newUser.role,
            senha: newUser.password
        });

        alert('Usuário cadastrado com sucesso!');
        setNewUser({ name: '', email: '', cpf: '', role: UserRole.USER, password: '' });
        setShowForm(false);
        loadUsers();
    } catch (error: any) {
        alert('Erro ao criar usuário: ' + getSafeError(error));
    } finally {
        setLoading(false);
    }
  };

  const toggleActive = async (u: User) => {
    // Added fix: Identify current tenant context
    const tenantId = user?.tenantId;
    if (!tenantId) return;
    try {
        // Fix: Replaced api.users.save (non-existent) with api.org.updateUser
        // Updates the 'ativo' field in the database
        await api.org.updateUser(tenantId, u.id, { ativo: !u.active });
        loadUsers();
    } catch (e: any) {
        alert("Erro: " + getSafeError(e));
    }
  };
  
  const handleDelete = async (id: string) => {
      if(window.confirm("Remover este usuário permanentemente?")) {
          // Added fix: Identify current tenant context
          const tenantId = user?.tenantId;
          if (!tenantId) return;
          try {
              // Fix: Replaced api.users.delete (non-existent) with api.org.removeUser
              await api.org.removeUser(tenantId, id);
              loadUsers();
          } catch(e: any) {
              alert("Erro ao remover usuário: " + getSafeError(e));
          }
      }
  };

  const inputClass = "w-full border border-gray-300 p-2 rounded text-sm bg-white text-black focus:ring-brand-500 focus:border-brand-500";

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Users className="mr-2 text-brand-600"/> Usuários da Organização
            </h1>
            <p className="text-sm text-gray-500">Cadastre e gerencie o acesso de seus colaboradores.</p>
        </div>
        <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded flex items-center hover:bg-brand-700 transition-colors shadow"
        >
            <UserPlus className="mr-2 h-5 w-5"/> {showForm ? 'Fechar Formulário' : 'Novo Usuário'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border border-brand-200 animate-fadeIn">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Dados do Novo Colaborador</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="newUserName" className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nome Completo</label>
                    <input
                        id="newUserName"
                        name="newUserName"
                        type="text"
                        className={inputClass}
                        placeholder="Ex: João da Silva"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="newUserCpf" className="block text-xs font-bold text-gray-500 mb-1 uppercase">CPF (Somente Números)</label>
                    <input
                        id="newUserCpf"
                        name="newUserCpf"
                        type="text"
                        className={inputClass}
                        placeholder="000.000.000-00"
                        value={newUser.cpf}
                        onChange={(e) => setNewUser({ ...newUser, cpf: e.target.value.replace(/\D/g, '') })}
                        required
                        maxLength={11}
                    />
                </div>
                <div>
                    <label htmlFor="newUserRole" className="block text-xs font-bold text-gray-500 mb-1 uppercase">Função / Permissão</label>
                    <select
                        id="newUserRole"
                        name="newUserRole"
                        className={inputClass}
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    >
                        <option value={UserRole.USER}>Padrão (Operacional)</option>
                        <option value={UserRole.COORDENADOR}>Coordenador (Gestão)</option>
                        <option value={UserRole.ORG_ADMIN}>Administrador (Diretor)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="newUserEmail" className="block text-xs font-bold text-gray-500 mb-1 uppercase">E-mail de Acesso</label>
                    <input
                        id="newUserEmail"
                        name="newUserEmail"
                        type="email"
                        className={inputClass}
                        placeholder="usuario@organizacao.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="newUserPassword" className="block text-xs font-bold text-gray-500 mb-1 uppercase">Senha Inicial</label>
                    <input
                        id="newUserPassword"
                        name="newUserPassword"
                        type="password"
                        className={inputClass}
                        placeholder="********"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        required
                    />
                </div>
            </div>
            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold text-sm shadow flex items-center"
                >
                    {loading ? 'Processando...' : <><UserPlus size={16} className="mr-2"/> Cadastrar Usuário</>}
                </button>
            </div>
            </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colaborador</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissão</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{u.name || 'Sem nome'}</div>
                    <div className="text-xs text-gray-400 font-mono">ID: {u.id.substring(0,8)}...</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                <td className="px-6 py-4 text-sm">
                   <span className={`px-2 py-1 rounded text-xs font-bold border ${
                       u.role === UserRole.ORG_ADMIN ? 'bg-purple-100 text-purple-700 border-purple-200' :
                       u.role === UserRole.COORDENADOR ? 'bg-blue-100 text-blue-700 border-blue-200' :
                       'bg-gray-100 text-gray-700 border-gray-200'
                   }`}>
                       {u.role === UserRole.ORG_ADMIN ? 'ADMINISTRADOR' : u.role}
                   </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {u.active ? (
                    <span className="inline-flex items-center text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded border border-green-100">
                        <CheckCircle size={12} className="mr-1"/> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded border border-red-100">
                        <XCircle size={12} className="mr-1"/> Inativo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right flex justify-end space-x-2">
                  <button
                    className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${u.active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                    onClick={() => toggleActive(u)}
                    disabled={u.id === user?.id}
                    title={u.active ? "Bloquear Acesso" : "Liberar Acesso"}
                  >
                    {u.active ? 'Bloquear' : 'Ativar'}
                  </button>
                  <button 
                    onClick={() => handleDelete(u.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Excluir Usuário"
                    disabled={u.id === user?.id}
                  >
                      <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
                <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                        Nenhum usuário encontrado nesta organização.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};