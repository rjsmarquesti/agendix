import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';

const PLANO_BADGE = {
  solo:     'bg-slate-700 text-slate-200',
  pro:      'bg-blue-900 text-blue-300',
  business: 'bg-purple-900 text-purple-300',
};

const STATUS_BADGE = {
  ativo:        'bg-green-900 text-green-300',
  trial:        'bg-yellow-900 text-yellow-300',
  inadimplente: 'bg-red-900 text-red-300',
  inativo:      'bg-slate-700 text-slate-400',
};

function BarraConsumo({ valor, limite, cor = 'bg-blue-500' }) {
  if (limite === null) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-slate-300 text-sm font-medium">{valor}</span>
        <span className="text-slate-500 text-xs">/ ∞</span>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((valor / limite) * 100));
  const barCor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : cor;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300 font-medium">{valor} / {limite}</span>
        <span className={`font-semibold ${pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-yellow-400' : 'text-slate-400'}`}>{pct}%</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${barCor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminConsumo() {
  const [dados, setDados]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca]     = useState('');
  const [filtroPlano, setFiltroPlano] = useState('');

  useEffect(() => {
    api.get('/admin/consumo')
      .then(d => setDados(d))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = dados.filter(t => {
    const ok = busca ? t.nome.toLowerCase().includes(busca.toLowerCase()) || t.slug.includes(busca.toLowerCase()) : true;
    const okPlano = filtroPlano ? t.plano === filtroPlano : true;
    return ok && okPlano;
  });

  const totalLeads       = dados.reduce((s, t) => s + t.leads, 0);
  const totalAgend       = dados.reduce((s, t) => s + t.agendamentos, 0);
  const totalConversas   = dados.reduce((s, t) => s + t.conversas, 0);
  const totalLogoKB      = dados.reduce((s, t) => s + t.logoKB, 0);

  return (
    <AdminLayout title="Consumo de Recursos" subtitle="Uso de serviços e disco por cliente">

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Clientes', value: dados.length, color: 'text-white' },
          { label: 'Leads na Plataforma', value: totalLeads.toLocaleString('pt-BR'), color: 'text-blue-400' },
          { label: 'Agendamentos Total', value: totalAgend.toLocaleString('pt-BR'), color: 'text-green-400' },
          { label: 'Conversas WhatsApp', value: totalConversas.toLocaleString('pt-BR'), color: 'text-purple-400' },
        ].map(c => (
          <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-400 text-xs mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar cliente…"
          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 min-w-[200px]" />
        <select value={filtroPlano} onChange={e => setFiltroPlano(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
          <option value="">Todos os planos</option>
          <option value="solo">Solo</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
        <span className="text-slate-500 text-sm self-center">{filtrados.length} cliente(s)</span>
      </div>

      {/* Tabela */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading
          ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Cliente', 'Plano', 'Agendamentos', 'Usuários', 'Leads', 'Conversas WA', 'Financeiro', 'Logo', 'Status'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(t => (
                  <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {t.logo
                          ? <img src={t.logo} alt="" className="w-8 h-8 rounded-lg object-contain bg-slate-800 p-0.5 flex-shrink-0" />
                          : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: t.corPrimaria || '#2563eb' }}>
                              {t.nome[0]}
                            </div>
                        }
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate max-w-[120px]">{t.nome}</div>
                          <div className="text-slate-500 text-xs">{t.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${PLANO_BADGE[t.plano]}`}>
                        {t.plano}
                      </span>
                    </td>
                    <td className="px-5 py-4 min-w-[140px]">
                      <BarraConsumo valor={t.agendamentos} limite={t.limites.agendamentos} cor="bg-green-500" />
                    </td>
                    <td className="px-5 py-4 min-w-[120px]">
                      <BarraConsumo valor={t.usuarios} limite={t.limites.usuarios} cor="bg-blue-500" />
                    </td>
                    <td className="px-5 py-4 text-slate-300 font-medium">{t.leads.toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-4 text-slate-300 font-medium">{t.conversas.toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-4 text-slate-300 font-medium">{t.lancamentos.toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      {t.logoKB > 0 ? `${t.logoKB} KB` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[t.planoStatus] || 'bg-slate-700 text-slate-400'}`}>
                        {t.planoStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtrados.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-500">Nenhum cliente encontrado.</div>
            )}
          </div>
        )}
      </div>

      {/* Gráfico de uso por plano */}
      {!loading && dados.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

          {/* Consumo de agendamentos por tenant */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Uso de Agendamentos</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {[...dados].sort((a, b) => b.agendamentos - a.agendamentos).slice(0, 15).map(t => {
                const limite = t.limites.agendamentos;
                const pct = limite ? Math.min(100, Math.round((t.agendamentos / limite) * 100)) : null;
                const barCor = pct === null ? 'bg-purple-500' : pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
                return (
                  <div key={t.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 truncate max-w-[160px]">{t.nome}</span>
                      <span className="text-slate-400 flex-shrink-0 ml-2">
                        {t.agendamentos}{limite ? `/${limite}` : ' (∞)'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${barCor}`} style={{ width: pct !== null ? `${pct}%` : '100%', opacity: pct === null ? 0.3 : 1 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leads por tenant */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Leads por Cliente</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {[...dados].sort((a, b) => b.leads - a.leads).slice(0, 15).map(t => {
                const max = Math.max(...dados.map(d => d.leads), 1);
                const pct = Math.round((t.leads / max) * 100);
                return (
                  <div key={t.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 truncate max-w-[160px]">{t.nome}</span>
                      <span className="text-slate-400">{t.leads.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
