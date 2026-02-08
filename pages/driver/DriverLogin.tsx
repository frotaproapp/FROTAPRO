import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../src/firebaseConfig';
import { Lock, Navigation } from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { UserRole } from '../../types';
import { Logo } from '../../components/Logo';

export const DriverLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === UserRole.MOTORISTA) {
        navigate('/driver/home');
      } else {
        // Se for admin tentando logar aqui, manda pro admin
        navigate('/'); 
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // O AuthContext vai detectar e o useEffect acima redirecionará
    } catch (err: any) {
        console.error(err);
        setError('Login falhou. Verifique suas credenciais.');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 mb-4 bg-slate-800 rounded-2xl p-4 shadow-2xl shadow-black/50 border border-slate-700">
             <Logo className="w-full h-full" showText={false} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">FROTAPRO</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">App do Motorista</p>
        </div>

        {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm mb-6 text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase ml-1">Seu E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-lg font-medium"
              placeholder="motorista@frotapro.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase ml-1">Sua Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-lg font-medium"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl shadow-brand-600/20 flex items-center justify-center transition-all active:scale-95 ${
                loading 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-500 hover:to-brand-600'
            }`}
          >
            {loading ? <span className="animate-pulse">Entrando...</span> : <><Navigation className="mr-2 h-5 w-5"/> ACESSAR SISTEMA</>}
          </button>
        </form>
        
        <p className="text-center text-slate-600 text-xs mt-8 font-medium">
            v2.0 • Acesso Seguro
        </p>
      </div>
    </div>
  );
};
