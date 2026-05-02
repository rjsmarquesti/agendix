import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';

const PLANO_COLOR = { basico: 'bg-slate-700 text-slate-200', pro: 'bg-blue-900 text-blue-300', premium: 'bg-yellow-900 text-yellow-300' };

export default function AdminDashboard() {
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    api.get('/admin/tenants')
      .then(d => setTenants(d.tenants))
      .catch(err => toast.error(err.message));
  }, []);

  const ativos     = tenants.filter(t => t.ativo).length;
  const inativos   = tenants.filter(t => !t.ativo).length;
  const totalLeads = tenants.reduce((s, t) => s + (t._count?.leads || 0), 0);

  const porPlano = ['basico', 'pro', 'premium'].map(p => ({
    plano: p,
    count: tenants.filter(t => t.plano === p).length,
  }));

  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral de todos os clientes">

      {/* Header impressão */}
      <div className="print-only">
        <div style={{ borderBottom: '2px solid #334155', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Divulga BR — Painel Administrativo</div>
          <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>Relatório de Clientes</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
            Emitido em {new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}
          </div>
        </div>
      </div>

      {/* Botão PDF */}
      <div className="flex justify-end mb-4 no-print">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-sm transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          PDF
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total de clientes', value: tenants.length, color: 'text-white' },
          { label: 'Ativos',            value: ativos,         color: 'text-green-400' },
          { label: 'Inativos',          value: inativos,       color: 'text-red-400' },
          { label: 'Total de leads',    value: totalLeads,     color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
            <p className="text-slate-400 text-sm">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Por plano */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Clientes por plano</h2>
          <div className="space-y-3">
            {porPlano.map(({ plano, count }) => (
              <div key={plano} className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${PLANO_COLOR[plano]}`}>{plano}</span>
                <span className="text-white font-bold text-lg">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clientes recentes */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Clientes recentes</h2>
          <div className="space-y-3">
            {tenants.slice(0, 6).map(t => (
              <div key={t.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  {t.logo
                    ? <img src={t.logo} alt={t.nome} className="w-9 h-9 rounded-xl object-contain bg-slate-800 p-1 flex-shrink-0" />
                    : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: t.corPrimaria || '#2563eb' }}>
                        {t.nome[0]}
                      </div>
                  }
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{t.nome}</p>
                    <p className="text-slate-500 text-xs">{t.slug} · {t._count?.leads || 0} leads</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${PLANO_COLOR[t.plano]}`}>{t.plano}</span>
                  <span className={`w-2 h-2 rounded-full ${t.ativo ? 'bg-green-400' : 'bg-red-500'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela completa — só no PDF */}
      <div className="print-only mt-6">
        <h2 style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Todos os clientes</h2>
        <table>
          <thead>
            <tr>
              {['Empresa', 'Slug', 'Plano', 'Leads', 'Usuários', 'Status'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id}>
                <td>{t.nome}</td>
                <td>{t.slug}</td>
                <td style={{ textTransform: 'capitalize' }}>{t.plano}</td>
                <td>{t._count?.leads || 0}</td>
                <td>{t._count?.users || 0}</td>
                <td>{t.ativo ? 'Ativo' : 'Inativo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </AdminLayout>
  );
}
