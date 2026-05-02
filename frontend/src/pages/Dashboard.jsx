import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { BadgeLead, BadgeAgend } from '../components/Badge';
import { api } from '../services/api';

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 flex items-center gap-4 border border-gray-100 dark:border-gray-700">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function formatDt(s) {
  if (!s) return '-';
  return new Date(s).toLocaleString('pt-BR');
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard')
      .then(setData)
      .catch(err => toast.error(err.message));
  }, []);

  const stats = data?.stats;
  const leads = data?.leadsRecentes || [];
  const agends = data?.agendamentosDodia || [];

  return (
    <Layout title="Dashboard" subtitle="Visão geral do seu CRM">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total de Leads" value={stats?.totalLeads}
          color="bg-blue-100 dark:bg-blue-900/30" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />} />
        <StatCard label="Leads Novos" value={stats?.leadsNovos}
          color="bg-yellow-100 dark:bg-yellow-900/30" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.924-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />} />
        <StatCard label="Convertidos" value={stats?.convertidos}
          color="bg-green-100 dark:bg-green-900/30" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />} />
        <StatCard label="Agendamentos Hoje" value={stats?.agendamentosHoje}
          color="bg-purple-100 dark:bg-purple-900/30" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />} />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads recentes */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Leads Recentes</h2>
            <Link to="/leads" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">Ver todos →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Origem</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Cadastrado</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">Nenhum lead ainda</td></tr>
                ) : leads.map(l => (
                  <tr key={l.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{l.nome}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{l.telefone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{l.origem || '-'}</td>
                    <td className="px-6 py-4"><BadgeLead status={l.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDt(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agenda do dia */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Agenda de Hoje</h2>
            <Link to="/agendamentos" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">Ver →</Link>
          </div>
          <div className="p-4 space-y-3">
            {agends.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">Nenhum agendamento hoje</p>
            ) : agends.map(a => (
              <div key={a.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <div className="text-center min-w-[52px]">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{a.hora}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{a.lead.nome}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{a.tipo}</div>
                </div>
                <BadgeAgend status={a.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
