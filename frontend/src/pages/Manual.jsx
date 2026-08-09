import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

// ── Conteúdo dos manuais ─────────────────────────────────────────────────────

const MANUAL_SUPER_ADMIN = [
  {
    id: 'visao-geral', titulo: 'Visão Geral',
    conteudo: `O painel de super admin gerencia todos os tenants (clientes) da plataforma. Aqui você cria contas, define planos, ativa módulos por nicho, monitora uso e faz manutenção operacional.`,
  },
  {
    id: 'gestao-clientes', titulo: 'Gestão de Clientes',
    sub: [
      { id: 'criar-tenant', titulo: 'Criar novo cliente', conteudo: `1. Acesse Admin → Clientes e clique em Novo cliente.\n2. Preencha Nome, Slug (ex: clinica-ana — sem espaços), E-mail, Plano e Status.\n3. Selecione o Nicho — os módulos extras são marcados automaticamente:\n   • Beleza e Estética → Fichas + Anamnese\n   • Saúde e Bem-estar → Prontuários + Anamnese\n   • Fitness → Fichas + Anamnese\n   • Pet → Fichas + Anamnese\n   • Automotivo → Orçamentos\n   • Serviços Residenciais → Orçamentos\n   • Serviços Profissionais → Documentos\n4. Ajuste módulos manualmente se necessário e salve.` },
      { id: 'criar-usuario-admin', titulo: 'Criar usuário admin do tenant', conteudo: `Após criar o tenant:\n1. Localize o cliente na lista → clique no ícone Usuário.\n2. Preencha nome, e-mail e senha provisória (role: admin).\n3. Salvar — o tenant já pode fazer login imediatamente.` },
      { id: 'editar-cliente', titulo: 'Editar cliente existente', conteudo: `1. Clique no ícone de lápis no card do cliente.\n2. Qualquer campo pode ser alterado, incluindo plano e módulos.\n3. Ao trocar de nicho, módulos são recalculados automaticamente.\n4. Salvar — a alteração é registrada no log de auditoria.` },
    ],
  },
  {
    id: 'planos', titulo: 'Planos e Cobrança',
    conteudo: `Planos disponíveis:\n\n• Solo — R$ 39/mês — agendamentos ilimitados, 1 usuário, confirmação WA, sem financeiro\n• Pro — R$ 59/mês — ilimitado, 5 usuários, bot WA completo, financeiro completo, Agente IA\n• Business — R$ 99/mês — ilimitado, usuários ilimitados, tudo completo\n• Trial — gratuito 14 dias — espelha o plano Pro (todos os módulos desbloqueados)\n\nStatus do plano:\n• trial → ativo → inadimplente → cancelado\n• "aguardando_pagamento" fica ativo durante processamento Mercado Pago`,
  },
  {
    id: 'whatsapp', titulo: 'WhatsApp — Instância Evolution',
    conteudo: `Para criar uma instância WA para um tenant:\n1. No card do tenant → ícone WhatsApp (verde) → Criar instância.\n2. O sistema registra na Evolution API e gera o QR Code.\n3. O tenant escaneia o QR em Configurações → WhatsApp.\n\nSe aparecer erro 403: significa que a instância já existe em estado inconsistente. O sistema automaticamente tenta deletar e recriar. Se persistir, acesse a Evolution API diretamente e remova a instância pelo slug do tenant.`,
  },
  {
    id: 'atendimento-wa', titulo: 'Atendimento WhatsApp',
    conteudo: `O módulo Atendimento WA (planos Pro e Business) transforma o WhatsApp do tenant em central de atendimento com fila automática.\n\nComo admin do sistema você:\n• Confirma que o tenant tem plano Pro ou Business (trial também tem acesso)\n• Verifica se a instância Evolution está com status Conectado\n• Monitora o painel de consumo para alertas de volume alto\n\nA configuração operacional (atendentes, carga máxima) é feita pelo admin do tenant.`,
  },
  {
    id: 'logs', titulo: 'Logs e Monitoramento',
    conteudo: `Admin → Logs:\n• Requisições com erro (4xx, 5xx) com IP e rota\n• Ações administrativas (criação de tenant, troca de plano)\n• Webhooks recebidos do Mercado Pago\n\nAdmin → Consumo:\n• Agendamentos por tenant no mês\n• Mensagens WhatsApp enviadas\n• Alertas de limite próximo`,
  },
  {
    id: 'onboarding', titulo: 'Checklist de Onboarding',
    conteudo: `Ao criar um novo cliente, siga esta ordem:\n\n☐ 1. Criar tenant com slug único e sem acentos\n☐ 2. Definir nicho e subnicho corretamente\n☐ 3. Confirmar módulos extras marcados\n☐ 4. Criar usuário admin com senha provisória\n☐ 5. Definir plano e data de vencimento\n☐ 6. Criar instância WhatsApp (se Pro/Business)\n☐ 7. Passar credenciais ao cliente\n☐ 8. Orientar troca de senha no primeiro login\n☐ 9. Orientar a escanear QR Code do WhatsApp`,
  },
];

const MANUAL_ADMIN = [
  {
    id: 'config-iniciais', titulo: 'Configurações Iniciais',
    conteudo: `Antes de começar a usar o sistema, configure a identidade da sua empresa:\n\nMenu → Configurações → Geral\n\n• Nome da empresa — aparece em PDFs, e-mails e no formulário público de agendamento\n• Logo — upload PNG/JPG (máx. 2 MB) — aparece no cabeçalho de todos os PDFs gerados\n• Cor primária — cor dos botões e destaques visuais nos documentos\n• Telefone / E-mail — exibidos no cabeçalho dos PDFs\n• Cidade / Estado — exibidos no rodapé dos documentos\n\n⚠️ Configure logo e dados completos antes de começar a usar — isso impacta diretamente a qualidade dos PDFs exportados.`,
  },
  {
    id: 'usuarios', titulo: 'Gestão de Usuários',
    conteudo: `Menu → Configurações → Usuários\n\nPapéis disponíveis:\n• admin — acesso total: configurações, relatórios, todos os módulos\n• atendente — agenda, leads, atendimento WA — sem configurações e financeiro\n\nCriar usuário:\n1. Novo usuário → nome, e-mail, WhatsApp, senha, role\n2. O usuário recebe e-mail de boas-vindas\n3. Pode trocar a própria senha em Meu Perfil`,
  },
  {
    id: 'atendimento-wa', titulo: 'Atendimento WhatsApp',
    sub: [
      { id: 'conectar-wa', titulo: 'Conectar o WhatsApp', conteudo: `1. Menu → Configurações → WhatsApp → Gerar QR Code\n2. Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo\n3. Escaneie o QR Code exibido na tela\n4. Aguarde confirmar "Conectado" (ícone verde)\n\n⚠️ Use um número EXCLUSIVO para a empresa. Não use número pessoal — o número ficará vinculado ao sistema e não poderá receber mensagens normais enquanto conectado.` },
      { id: 'cadastrar-atendentes', titulo: 'Cadastrar atendentes', conteudo: `Menu → Atendimento WA → aba Atendentes → Novo atendente\n\n• Nome: nome de exibição na fila\n• Telefone: número WhatsApp do atendente com DDI (ex: 5561999990000)\n• Carga máxima: quantos atendimentos simultâneos este atendente aceita (padrão: 5)\n\nO atendente é acionado automaticamente quando uma conversa entra na fila e ele tem capacidade disponível.` },
      { id: 'fila-wa', titulo: 'Como funciona a fila', conteudo: `Fluxo automático:\n\nCliente envia mensagem → Sistema cria sessão (status: Aguardando) → Distribuído ao atendente com menor carga → Atendente recebe notificação no WhatsApp pessoal → Atendimento realizado diretamente pelo WA do atendente → Sessão encerrada\n\nAcompanhe em: Atendimento WA → aba Fila\nMétricas em: Atendimento WA → aba Dashboard` },
    ],
  },
  {
    id: 'fichas', titulo: 'Fichas de Clientes',
    conteudo: `Disponível para: Beleza e Estética, Saúde, Fitness, Pet\n\nA ficha é o cadastro permanente do cliente com dados pessoais e informações específicas do nicho.\n\nCriar ficha:\n1. Menu → Fichas → Nova ficha\n2. Preencha nome, telefone e e-mail\n3. Preencha os campos do nicho (variam por área):\n   • Beleza: fototipo Fitzpatrick, condições de pele, alergias, produtos em uso\n   • Saúde: convênio, carteirinha, profissão, contato de emergência\n   • Fitness: peso, altura, IMC, % gordura, objetivo\n   • Pet: espécie, raça, tutor, microchip\n4. Salvar\n\nExportar PDF: Abra a ficha (ícone olho) → Exportar PDF\nO PDF inclui logo, dados da empresa, campos do nicho e campos de assinatura.`,
  },
  {
    id: 'anamnese', titulo: 'Anamnese',
    conteudo: `Disponível para: Beleza e Estética, Saúde, Fitness, Pet\n\nA anamnese é o questionário de pré-atendimento, preenchido antes de cada procedimento. Diferente da ficha (cadastro permanente), a anamnese pode ser repetida a cada sessão.\n\nQuando preencher:\n• Antes do primeiro procedimento (obrigatório)\n• Quando o cliente relatar mudanças de saúde\n• Periodicamente (a cada 3–6 meses)\n• Sempre que for aplicar um procedimento novo\n\nDiferença Ficha × Anamnese:\n• Ficha — cadastro fixo, criada uma vez por cliente\n• Anamnese — questionário por sessão/procedimento, pode ser repetida\n\nExportar PDF: inclui declaração para assinatura do cliente — tem valor legal. Imprima, peça assinar e arquive.`,
  },
  {
    id: 'orcamentos', titulo: 'Orçamentos',
    conteudo: `Disponível para: Automotivo, Serviços Residenciais\n\nCriar orçamento:\n1. Menu → Orçamentos → Novo orçamento\n2. Informe cliente, telefone e descrição do serviço\n3. Adicione itens: descrição, quantidade e valor unitário (total calculado automaticamente)\n4. Defina prazo de validade e observações (garantia, condições de pagamento)\n5. Salvar — número gerado automaticamente (ORC-2026-0001)\n\nFluxo de status:\nRascunho → Enviado → Aprovado\n                   ↘ Recusado\n                   ↘ Expirado\n\nExportar PDF: inclui tabela de itens, total destacado com cor da empresa e campo de assinatura (para orçamentos Enviados/Aprovados).`,
  },
  {
    id: 'prontuarios', titulo: 'Prontuários',
    conteudo: `Disponível para: Saúde e Bem-estar\n\nO prontuário é o histórico clínico evolutivo do paciente — cada consulta gera um novo registro de evolução.\n\nCriar prontuário:\n1. Menu → Prontuários → Novo prontuário\n2. Preencha dados do paciente e informações clínicas iniciais\n3. A cada consulta, adicione uma nova evolução: data, texto da evolução\n4. O histórico completo fica registrado em ordem cronológica\n\nExportar PDF: gera documento com histórico completo de evoluções, cabeçalho da clínica e campos de assinatura.`,
  },
  {
    id: 'documentos', titulo: 'Documentos',
    conteudo: `Disponível para: Serviços Profissionais\n\nGestão de contratos, propostas e documentos jurídicos dos clientes.\n\nCriar documento:\n1. Menu → Documentos → Novo documento\n2. Defina tipo (Contrato, Proposta, Procuração, Relatório, Outro)\n3. Informe cliente, título e conteúdo\n4. Defina data de vencimento se aplicável\n5. Status: Rascunho → Ativo → Vencido → Cancelado\n\nExportar PDF: documento formatado com cabeçalho do escritório/empresa, conteúdo e campo de assinatura.`,
  },
];

const MANUAL_USUARIO = [
  {
    id: 'primeiro-acesso', titulo: 'Primeiro Acesso',
    conteudo: `1. Acesse o link fornecido pelo administrador\n2. Insira e-mail e senha provisória\n3. Troque a senha imediatamente em Meu Perfil → Alterar senha\n4. O menu lateral mostra apenas os módulos disponíveis para você\n\nSe esquecer a senha: tela de login → "Esqueci minha senha" → verifique o e-mail.`,
  },
  {
    id: 'agenda', titulo: 'Agenda e Agendamentos',
    conteudo: `Menu → Agenda\n\nVer agendamentos:\n• A visualização padrão mostra o dia atual\n• Use ← → para navegar entre dias\n• Clique em um agendamento para ver detalhes\n\nCriar agendamento manual:\n1. Clique em um horário vago ou em "Novo agendamento"\n2. Preencha cliente, serviço, data e hora\n3. Salvar — cliente recebe confirmação via WhatsApp (se conectado)\n\nStatus: confirmado · pendente · concluído · cancelado · faltou\nPara alterar: abra o agendamento e clique no status desejado.`,
  },
  {
    id: 'leads', titulo: 'Leads',
    conteudo: `Menu → Leads\n\nLead é qualquer pessoa que entrou em contato ou se cadastrou pelo formulário público.\n\nTrabalhar com leads:\n1. A lista mostra todos os leads com nome, telefone e status no funil\n2. Clique para ver o histórico completo\n3. Avance o status conforme evolui o relacionamento:\n   Novo → Contato → Negociação → Convertido / Perdido\n4. Registre observações sobre cada contato realizado\n\nConverter lead em agendamento:\nNo perfil do lead → Agendar → cria agendamento vinculado ao lead.`,
  },
  {
    id: 'atendimento-wa', titulo: 'Atendimento WhatsApp',
    sub: [
      { id: 'receber-atendimentos', titulo: 'Como receber atendimentos', conteudo: `Quando um cliente envia mensagem no WhatsApp da empresa, o sistema coloca na fila automaticamente.\n\nSe você for o atendente com menor carga, receberá uma notificação no seu WhatsApp pessoal com os dados do cliente.\n\nAcompanhe em: Menu → Atendimento WA → aba Fila` },
      { id: 'atender', titulo: 'Iniciar e encerrar atendimento', conteudo: `Iniciar:\n1. Receba a notificação no seu WhatsApp pessoal\n2. Inicie a conversa diretamente pelo WhatsApp com o número do cliente\n3. O status da sessão muda automaticamente para "Em atendimento"\n\nEncerrar:\n1. No sistema → Atendimento WA → Fila\n2. Localize a sessão → clique em Encerrar atendimento\n3. Status muda para "Encerrado" e vai para o histórico` },
    ],
  },
  {
    id: 'fichas', titulo: 'Fichas de Clientes',
    conteudo: `Criar ficha:\n1. Menu → Fichas → Nova ficha\n2. Preencha nome, telefone e e-mail do cliente\n3. Preencha os campos específicos do nicho da empresa\n4. Salvar\n\nBuscar ficha existente: barra de busca no topo (busca por nome)\n\nExportar PDF:\n1. Clique no ícone olho na ficha\n2. Clique em Exportar PDF\n3. PDF baixa automaticamente — imprima e peça ao cliente assinar na primeira visita\n\nDica: Crie a ficha logo no primeiro contato com o cliente para manter o histórico completo.`,
  },
  {
    id: 'anamnese', titulo: 'Anamnese',
    conteudo: `A anamnese é o questionário de saúde preenchido antes de cada procedimento.\n\nPreencher anamnese:\n1. Menu → Anamnese → Nova anamnese\n2. Informe o nome do cliente\n3. Vincule a uma ficha existente (se disponível)\n4. Responda as perguntas com o cliente presencialmente\n5. Registre observações do profissional\n6. Salvar\n\nExportar PDF para assinatura:\n1. Abra a anamnese (ícone olho) → Exportar PDF\n2. Imprima → peça ao cliente assinar\n3. Arquive o documento assinado\n\n⚠️ A assinatura da anamnese tem valor legal em procedimentos estéticos e de saúde. Não pule esta etapa.`,
  },
  {
    id: 'orcamentos', titulo: 'Orçamentos',
    conteudo: `Criar orçamento:\n1. Menu → Orçamentos → Novo orçamento\n2. Informe cliente e telefone\n3. Descreva o serviço\n4. Adicione os itens (descrição, quantidade, valor unitário)\n5. Defina prazo de validade\n6. Salvar\n\nEnviar para o cliente:\n1. Abra o orçamento (ícone olho) → Exportar PDF\n2. Envie o PDF pelo WhatsApp ou e-mail\n3. Mude o status para "Enviado"\n\nAcompanhar resposta:\n• Cliente aprovou → status "Aprovado"\n• Cliente recusou → status "Recusado"\n• Sem resposta no prazo → status "Expirado"`,
  },
  {
    id: 'duvidas', titulo: 'Dúvidas Frequentes',
    conteudo: `O PDF não está baixando\n→ Verifique se o navegador está bloqueando pop-ups. Permita pop-ups para este site.\n\nO nome/logo no PDF está errado\n→ Os dados do cabeçalho vêm das configurações da empresa. Informe ao administrador.\n\nNão estou recebendo atendimentos WA\n→ Verifique com o administrador se seu número está cadastrado corretamente e se você não atingiu a carga máxima.\n\nNão encontro o módulo de Fichas / Anamnese / Orçamentos\n→ Esses módulos dependem do nicho configurado. Fale com o administrador para verificar se estão ativados.\n\nEsqueci a senha\n→ Na tela de login → "Esqueci minha senha" → verifique a caixa de entrada do e-mail.`,
  },
];

// ── Mapa de manuais por role ──────────────────────────────────────────────────
const MANUAIS = {
  super_admin: [
    { id: 'sistema', label: 'Admin do Sistema', sections: MANUAL_SUPER_ADMIN },
    { id: 'tenant',  label: 'Admin de Empresa',  sections: MANUAL_ADMIN },
    { id: 'usuario', label: 'Atendente',          sections: MANUAL_USUARIO },
  ],
  admin: [
    { id: 'tenant',  label: 'Admin de Empresa',  sections: MANUAL_ADMIN },
    { id: 'usuario', label: 'Atendente',          sections: MANUAL_USUARIO },
  ],
  atendente: [
    { id: 'usuario', label: 'Atendente', sections: MANUAL_USUARIO },
  ],
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function Manual() {
  const { user } = useAuth();
  const role = user?.role || 'atendente';
  const manuaisDisponiveis = MANUAIS[role] || MANUAIS.atendente;

  const [manualAtivo, setManualAtivo] = useState(manuaisDisponiveis[0].id);
  const [secaoAtiva, setSecaoAtiva]   = useState('');
  const contentRef = useRef(null);

  const manual = manuaisDisponiveis.find(m => m.id === manualAtivo);

  // Scroll para seção
  function scrollTo(id) {
    setSecaoAtiva(id);
    const el = document.getElementById(`sec-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Observador para atualizar a seção ativa durante scroll
  useEffect(() => {
    const ids = [];
    manual?.sections.forEach(s => {
      ids.push(s.id);
      s.sub?.forEach(sub => ids.push(sub.id));
    });

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setSecaoAtiva(e.target.id.replace('sec-', '')); });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    ids.forEach(id => {
      const el = document.getElementById(`sec-${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [manual]);

  // Reset ao trocar de manual
  useEffect(() => {
    setSecaoAtiva('');
    contentRef.current?.scrollTo(0, 0);
  }, [manualAtivo]);

  return (
    <Layout title="Manual do Usuário">
      <div className="flex gap-0 -m-4 md:-m-8 h-[calc(100vh-4rem)]">

        {/* ── Sidebar de navegação ─────────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 flex flex-col border-r overflow-y-auto hidden lg:flex"
          style={{ borderColor: 'var(--bd)', backgroundColor: 'var(--surface)' }}>

          {/* Seletor de manual (só aparece se tiver mais de 1) */}
          {manuaisDisponiveis.length > 1 && (
            <div className="p-3 border-b space-y-1" style={{ borderColor: 'var(--bd)' }}>
              {manuaisDisponiveis.map(m => (
                <button key={m.id} onClick={() => setManualAtivo(m.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={manualAtivo === m.id
                    ? { backgroundColor: 'var(--g)', color: '#08080C' }
                    : { color: 'var(--mt-lt)' }}
                  onMouseEnter={e => { if (manualAtivo !== m.id) { e.currentTarget.style.backgroundColor = 'var(--bd)'; e.currentTarget.style.color = 'var(--tx)'; }}}
                  onMouseLeave={e => { if (manualAtivo !== m.id) { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--mt-lt)'; }}}>
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* TOC */}
          <nav className="flex-1 p-3 space-y-0.5">
            {manual?.sections.map(sec => (
              <div key={sec.id}>
                <button onClick={() => scrollTo(sec.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={secaoAtiva === sec.id
                    ? { color: 'var(--g)', backgroundColor: 'var(--a-dim)' }
                    : { color: 'var(--tx-md)' }}
                  onMouseEnter={e => { if (secaoAtiva !== sec.id) { e.currentTarget.style.backgroundColor = 'var(--bd)'; }}}
                  onMouseLeave={e => { if (secaoAtiva !== sec.id) { e.currentTarget.style.backgroundColor = ''; }}}>
                  {sec.titulo}
                </button>
                {sec.sub?.map(sub => (
                  <button key={sub.id} onClick={() => scrollTo(sub.id)}
                    className="w-full text-left pl-7 pr-3 py-1.5 rounded-lg text-xs transition-colors"
                    style={secaoAtiva === sub.id
                      ? { color: 'var(--g)', backgroundColor: 'var(--a-dim)' }
                      : { color: 'var(--mt-lt)' }}
                    onMouseEnter={e => { if (secaoAtiva !== sub.id) { e.currentTarget.style.backgroundColor = 'var(--bd)'; }}}
                    onMouseLeave={e => { if (secaoAtiva !== sub.id) { e.currentTarget.style.backgroundColor = ''; }}}>
                    {sub.titulo}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Conteúdo principal ───────────────────────────────────── */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          {/* Seletor de manual mobile */}
          {manuaisDisponiveis.length > 1 && (
            <div className="lg:hidden flex gap-2 p-4 border-b flex-wrap" style={{ borderColor: 'var(--bd)' }}>
              {manuaisDisponiveis.map(m => (
                <button key={m.id} onClick={() => setManualAtivo(m.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={manualAtivo === m.id
                    ? { backgroundColor: 'var(--g)', color: '#08080C' }
                    : { backgroundColor: 'var(--bd)', color: 'var(--tx-md)' }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}

          <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">

            {/* Título do manual */}
            <div className="pb-6 border-b" style={{ borderColor: 'var(--bd)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--a-dim)' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--g)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>
                    Manual — {manual?.label}
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--mt-lt)' }}>Agendix v1.5 · Guia completo de uso</p>
                </div>
              </div>
            </div>

            {/* Seções */}
            {manual?.sections.map((sec, si) => (
              <Section key={sec.id} sec={sec} index={si + 1} />
            ))}

            <div className="pb-16 text-center text-xs" style={{ color: 'var(--mt-lt)' }}>
              Agendix — Manual v1.0 · Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ── Seção de conteúdo ─────────────────────────────────────────────────────────

function Section({ sec, index }) {
  return (
    <section id={`sec-${sec.id}`} className="scroll-mt-6 space-y-4">
      {/* Título da seção */}
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: 'var(--a-dim)', color: 'var(--g)' }}>{index}</span>
        <h2 className="text-lg font-bold" style={{ color: 'var(--tx)' }}>{sec.titulo}</h2>
      </div>

      {/* Conteúdo da seção */}
      {sec.conteudo && <ConteudoBloco texto={sec.conteudo} />}

      {/* Sub-seções */}
      {sec.sub?.map(sub => (
        <div key={sub.id} id={`sec-${sub.id}`} className="scroll-mt-6 ml-4 pl-4 border-l space-y-3"
          style={{ borderColor: 'var(--bd)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{sub.titulo}</h3>
          <ConteudoBloco texto={sub.conteudo} />
        </div>
      ))}
    </section>
  );
}

// ── Renderizador de texto com formatação ─────────────────────────────────────

function ConteudoBloco({ texto }) {
  const linhas = texto.split('\n');

  return (
    <div className="space-y-1.5 text-sm leading-relaxed" style={{ color: 'var(--tx-md)' }}>
      {linhas.map((linha, i) => {
        if (!linha.trim()) return <div key={i} className="h-1" />;

        // Linha numerada (começa com número + ponto)
        if (/^\d+\./.test(linha.trim())) {
          return (
            <div key={i} className="flex gap-2">
              <span className="font-semibold flex-shrink-0 w-5" style={{ color: 'var(--tx)' }}>
                {linha.match(/^\d+/)[0]}.
              </span>
              <span>{linha.replace(/^\d+\.\s*/, '')}</span>
            </div>
          );
        }

        // Linha de checklist (começa com ☐)
        if (linha.trim().startsWith('☐')) {
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-base leading-none mt-0.5 flex-shrink-0" style={{ color: 'var(--mt-lt)' }}>☐</span>
              <span>{linha.replace('☐', '').trim()}</span>
            </div>
          );
        }

        // Bullet com •
        if (linha.trim().startsWith('•')) {
          const resto = linha.replace('•', '').trim();
          const [chave, ...valor] = resto.split('—');
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--g)' }} />
              {valor.length > 0
                ? <span><strong style={{ color: 'var(--tx)' }}>{chave.trim()}</strong>{' — '}{valor.join('—')}</span>
                : <span>{chave}</span>}
            </div>
          );
        }

        // Linha com seta (→)
        if (linha.trim().startsWith('→')) {
          return (
            <div key={i} className="flex gap-2 items-start pl-2">
              <span style={{ color: 'var(--g)' }}>→</span>
              <span>{linha.replace('→', '').trim()}</span>
            </div>
          );
        }

        // Linha de aviso (começa com ⚠️)
        if (linha.trim().startsWith('⚠️')) {
          return (
            <div key={i} className="flex gap-2 items-start px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'rgba(234,179,8,0.08)', borderLeft: '3px solid #ca8a04', color: '#a16207' }}>
              <span>{linha.trim()}</span>
            </div>
          );
        }

        // Linha de dica
        if (linha.trim().startsWith('Dica:')) {
          return (
            <div key={i} className="flex gap-2 items-start px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--a-dim)', borderLeft: '3px solid var(--g)', color: 'var(--a-lt)' }}>
              <span>{linha.trim()}</span>
            </div>
          );
        }

        // Cabeçalho de subsecção em MAIÚSCULAS
        if (linha.trim() === linha.trim().toUpperCase() && linha.trim().length > 3 && !linha.includes('→')) {
          return (
            <p key={i} className="font-semibold pt-2 text-xs uppercase tracking-wider" style={{ color: 'var(--mt-lt)' }}>
              {linha.trim()}
            </p>
          );
        }

        // Linha normal
        return <p key={i}>{linha}</p>;
      })}
    </div>
  );
}
