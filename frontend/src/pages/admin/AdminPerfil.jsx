import { useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminPerfil() {
  const { user, login, token } = useAuth();

  const [formPerfil, setFP] = useState({ nome: user?.nome || '', email: user?.email || '' });
  const [formSenha, setFS]  = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [loadingP, setLP]   = useState(false);
  const [loadingS, setLS]   = useState(false);

  async function salvarPerfil(e) {
    e.preventDefault();
    setLP(true);
    try {
      const res = await api.put('/auth/perfil', formPerfil);
      toast.success('Perfil atualizado!');
      // Atualiza dados no contexto sem fazer logout
      login({ token, user: res.user });
    } catch (err) { toast.error(err.message); }
    finally { setLP(false); }
  }

  async function salvarSenha(e) {
    e.preventDefault();
    if (formSenha.novaSenha !== formSenha.confirmar) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLS(true);
    try {
      await api.put('/auth/senha', { senhaAtual: formSenha.senhaAtual, novaSenha: formSenha.novaSenha });
      toast.success('Senha alterada com sucesso!');
      setFS({ senhaAtual: '', novaSenha: '', confirmar: '' });
    } catch (err) { toast.error(err.message); }
    finally { setLS(false); }
  }

  return (
    <AdminLayout title="Meu Perfil" subtitle="Altere seus dados de acesso ao painel">
      <div className="max-w-xl space-y-6">

        {/* Dados pessoais */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Dados de acesso</h2>
          <form onSubmit={salvarPerfil} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nome</label>
              <input
                type="text" required value={formPerfil.nome}
                onChange={e => setFP(f => ({ ...f, nome: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
              <input
                type="email" required value={formPerfil.email}
                onChange={e => setFP(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              type="submit" disabled={loadingP}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition text-sm">
              {loadingP ? 'Salvando...' : 'Salvar dados'}
            </button>
          </form>
        </div>

        {/* Alterar senha */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Alterar senha</h2>
          <form onSubmit={salvarSenha} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Senha atual</label>
              <input
                type="password" required value={formSenha.senhaAtual}
                onChange={e => setFS(f => ({ ...f, senhaAtual: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nova senha</label>
              <input
                type="password" required minLength={6} value={formSenha.novaSenha}
                onChange={e => setFS(f => ({ ...f, novaSenha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Confirmar nova senha</label>
              <input
                type="password" required value={formSenha.confirmar}
                onChange={e => setFS(f => ({ ...f, confirmar: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              type="submit" disabled={loadingS}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition text-sm">
              {loadingS ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </div>

      </div>
    </AdminLayout>
  );
}
