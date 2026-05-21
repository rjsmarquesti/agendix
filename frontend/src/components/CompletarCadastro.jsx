import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const FIELD = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400';

export default function CompletarCadastro() {
  const { tenant, updateTenant } = useAuth();

  const deveExibir =
    tenant &&
    tenant.planoStatus !== 'trial' &&
    !tenant.cadastroCompleto;

  const [form, setForm] = useState({
    cnpj: '', razaoSocial: '', email: tenant?.email || '', telefone: tenant?.telefone || '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP',
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function buscarCep(cep) {
    const c = cep.replace(/\D/g, '');
    if (c.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm(f => ({ ...f, logradouro: d.logradouro || f.logradouro, bairro: d.bairro || f.bairro, cidade: d.localidade || f.cidade, estado: d.uf || f.estado }));
      }
    } catch { /* silencioso */ }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      await api.put('/settings/completar-cadastro', form);
      updateTenant({ ...tenant, cadastroCompleto: true, email: form.email, telefone: form.telefone });
    } catch (err) {
      setErro(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  if (!deveExibir) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Complete seu cadastro</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Obrigatório para continuar usando o Agendix após o período de teste.</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Dados fiscais */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Dados fiscais</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CNPJ / CPF *</label>
                <input required value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Razão Social *</label>
                <input required value={form.razaoSocial} onChange={set('razaoSocial')} placeholder="Nome da empresa" className={FIELD} />
              </div>
            </div>
          </div>

          {/* Contato */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Contato</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={set('email')} placeholder="contato@empresa.com" className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Telefone *</label>
                <input required value={form.telefone} onChange={set('telefone')} placeholder="(11) 99999-9999" className={FIELD} />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Endereço</p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CEP *</label>
                  <input required value={form.cep} onChange={e => { set('cep')(e); buscarCep(e.target.value); }}
                    placeholder="00000-000" className={FIELD} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Logradouro *</label>
                  <input required value={form.logradouro} onChange={set('logradouro')} placeholder="Rua, Av., Alameda..." className={FIELD} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Número *</label>
                  <input required value={form.numero} onChange={set('numero')} placeholder="123" className={FIELD} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Complemento</label>
                  <input value={form.complemento} onChange={set('complemento')} placeholder="Sala 10, Apto 2..." className={FIELD} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bairro</label>
                  <input value={form.bairro} onChange={set('bairro')} placeholder="Centro" className={FIELD} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cidade *</label>
                  <input required value={form.cidade} onChange={set('cidade')} placeholder="São Paulo" className={FIELD} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Estado *</label>
                  <select required value={form.estado} onChange={set('estado')}
                    className={FIELD}>
                    {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {erro}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
            {loading
              ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Salvando...</>
              : 'Salvar e continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
