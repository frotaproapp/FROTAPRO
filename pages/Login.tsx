
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { Logo } from '../components/Logo';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="px-8 py-10 text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 mb-4">
                <Logo className="w-full h-full" showText={false} />
            </div>
            <h2 className="text-3xl font-black tracking-tighter uppercase text-brand-900">
              FROTAPRO
            </h2>
            <p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mt-1">
              Gestão de Frota Institucional
            </p>
          </div>

          {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-xs font-bold mb-6 animate-shake">
                  {error}
              </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">E-mail Corporativo</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  placeholder="usuario@municipio.gov.br"
                />
              </div>
            </div>

            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Sua Senha</label>
              <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-300" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase text-sm shadow-xl hover:bg-brand-700 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Sincronizando...' : 'Acessar Sistema'}
            </button>
          </form>
        </div>
        <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">© {new Date().getFullYear()} Frotapro Gov • Infra Supabase</p>
        </div>
      </div>
    </div>
  );
};
