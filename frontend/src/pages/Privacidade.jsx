export default function Privacidade() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-sm">
        <h1>Política de Privacidade — Agendix</h1>
        <p><strong>Última atualização:</strong> 08 de maio de 2026</p>

        <h2>1. Dados coletados</h2>
        <p>Coletamos apenas os dados necessários para o funcionamento do serviço:</p>
        <ul>
          <li><strong>Dados da empresa:</strong> nome, CNPJ/CPF, endereço, logotipo</li>
          <li><strong>Dados dos usuários:</strong> nome, email, telefone (WhatsApp)</li>
          <li><strong>Dados dos clientes finais:</strong> nome, telefone, email (inseridos pelo contratante)</li>
          <li><strong>Dados de uso:</strong> agendamentos, leads, transações financeiras registradas pelo contratante</li>
        </ul>

        <h2>2. Finalidade do uso dos dados</h2>
        <p>Os dados são utilizados exclusivamente para prestação do serviço contratado: gerenciamento de agendamentos, leads e comunicação via WhatsApp. Não vendemos dados a terceiros.</p>

        <h2>3. Compartilhamento</h2>
        <p>Dados podem ser compartilhados com:</p>
        <ul>
          <li><strong>Mercado Pago:</strong> para processamento de pagamentos</li>
          <li><strong>Evolution API / WhatsApp:</strong> para envio de mensagens configuradas pelo contratante</li>
          <li><strong>n8n:</strong> para automações configuradas pelo contratante</li>
        </ul>

        <h2>4. Armazenamento e segurança</h2>
        <p>Os dados são armazenados em servidores no Brasil, com acesso restrito por autenticação JWT e separação por tenant (multi-tenancy). Backups são realizados periodicamente.</p>

        <h2>5. Direitos do titular (LGPD)</h2>
        <p>Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
        <ul>
          <li>Acessar seus dados</li>
          <li>Corrigir dados incorretos</li>
          <li>Solicitar exclusão dos dados</li>
          <li>Portabilidade dos dados</li>
        </ul>
        <p>Para exercer esses direitos, entre em contato: <a href="mailto:suporte@divulgabr.com.br">suporte@divulgabr.com.br</a></p>

        <h2>6. Retenção de dados</h2>
        <p>Dados são mantidos enquanto a conta estiver ativa. Após o cancelamento, os dados são removidos em até 90 dias, salvo obrigação legal.</p>

        <h2>7. Contato do DPO</h2>
        <p>Encarregado de Proteção de Dados: <strong>PREENCHA O NOME</strong> — <a href="mailto:suporte@divulgabr.com.br">suporte@divulgabr.com.br</a></p>
      </div>
    </div>
  );
}
