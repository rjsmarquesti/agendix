export default function Privacidade() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-sm">

        <h1>Política de Privacidade — Agendix</h1>
        <p>
          <strong>Última atualização:</strong> 18 de maio de 2026
        </p>
        <p>
          A <strong>DivulgaBR Agência Digital</strong>, CNPJ <strong>50.406.025/0001-68</strong>, com sede em
          Brasília — DF, operadora da plataforma <strong>Agendix</strong>, está comprometida com a proteção
          dos dados pessoais de seus Contratantes e Usuários Finais, em conformidade com a{' '}
          <strong>Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)</strong> e demais normas
          aplicáveis.
        </p>
        <p>
          Esta Política descreve quais dados coletamos, como os utilizamos, com quem compartilhamos, por
          quanto tempo os retemos e quais são os seus direitos como titular.
        </p>

        <hr />

        <h2>1. Controlador de dados</h2>
        <p>
          <strong>DivulgaBR Agência Digital</strong>
          <br />
          CNPJ: 50.406.025/0001-68
          <br />
          Sede: Brasília — DF, Brasil
          <br />
          E-mail: <a href="mailto:suporte@divulgabr.com.br">suporte@divulgabr.com.br</a>
        </p>
        <p>
          No contexto da plataforma Agendix, a DivulgaBR atua como{' '}
          <strong>Controladora</strong> dos dados dos Contratantes (usuários que contratam o sistema) e como{' '}
          <strong>Operadora</strong> em relação aos dados dos clientes finais inseridos pelos Contratantes.
        </p>

        <h2>2. Dados que coletamos</h2>

        <h3>2.1 Dados dos Contratantes</h3>
        <ul>
          <li>Nome completo ou razão social</li>
          <li>CNPJ ou CPF</li>
          <li>Endereço comercial (logradouro, número, bairro, cidade, estado, CEP)</li>
          <li>E-mail e telefone de contato</li>
          <li>Logotipo e identidade visual da empresa</li>
          <li>Dados de pagamento (processados pelo Mercado Pago — não armazenamos dados de cartão)</li>
          <li>Registros de acesso, logs de ações e endereços IP</li>
        </ul>

        <h3>2.2 Dados inseridos pelos Contratantes (clientes finais)</h3>
        <p>
          Os Contratantes podem inserir na Plataforma dados de seus próprios clientes, incluindo:
        </p>
        <ul>
          <li>Nome, telefone e e-mail de clientes finais</li>
          <li>Histórico de agendamentos e serviços</li>
          <li>Informações financeiras registradas manualmente</li>
          <li>Mensagens trocadas via WhatsApp pelo bot configurado</li>
        </ul>
        <p>
          Nesses casos, o Contratante é o Controlador desses dados e é o único responsável por obter o
          consentimento adequado de seus clientes finais.
        </p>

        <h3>2.3 Dados coletados automaticamente</h3>
        <ul>
          <li>Endereço IP e dados de navegação (para segurança e auditoria)</li>
          <li>Data e hora de acessos e operações realizadas</li>
          <li>Tipo de dispositivo e navegador</li>
        </ul>

        <h2>3. Base legal para o tratamento</h2>
        <p>Tratamos dados pessoais com fundamento nas seguintes bases legais previstas na LGPD:</p>
        <ul>
          <li>
            <strong>Execução de contrato</strong> (art. 7º, V): para prestação dos serviços contratados
          </li>
          <li>
            <strong>Legítimo interesse</strong> (art. 7º, IX): para segurança, prevenção a fraudes e
            melhoria da Plataforma
          </li>
          <li>
            <strong>Cumprimento de obrigação legal</strong> (art. 7º, II): para atendimento a requisições
            de autoridades competentes
          </li>
          <li>
            <strong>Consentimento</strong> (art. 7º, I): para comunicações de marketing, quando aplicável
          </li>
        </ul>

        <h2>4. Finalidade do uso dos dados</h2>
        <p>Utilizamos os dados coletados para:</p>
        <ul>
          <li>Criar e gerenciar contas de Contratantes na Plataforma</li>
          <li>Processar pagamentos e gerenciar assinaturas</li>
          <li>Enviar notificações relacionadas ao serviço (confirmações, alertas, lembretes)</li>
          <li>Prestar suporte técnico e atendimento ao cliente</li>
          <li>Garantir a segurança e integridade da Plataforma</li>
          <li>Cumprir obrigações legais e regulatórias</li>
          <li>Melhorar funcionalidades e a experiência de uso (dados anonimizados/agregados)</li>
        </ul>
        <p>
          <strong>Não vendemos, alugamos ou comercializamos dados pessoais a terceiros.</strong>
        </p>

        <h2>5. Compartilhamento de dados</h2>
        <p>
          Compartilhamos dados apenas quando estritamente necessário, com os seguintes parceiros e nas
          respectivas finalidades:
        </p>
        <ul>
          <li>
            <strong>Mercado Pago:</strong> processamento de pagamentos e assinaturas recorrentes
          </li>
          <li>
            <strong>Evolution API / Meta (WhatsApp):</strong> envio de mensagens automáticas configuradas
            pelo Contratante
          </li>
          <li>
            <strong>n8n:</strong> automações de fluxo de trabalho configuradas pelo Contratante
          </li>
          <li>
            <strong>Hostinger (SMTP):</strong> envio de e-mails transacionais (confirmações, recuperação
            de senha, notificações)
          </li>
          <li>
            <strong>Autoridades públicas:</strong> quando exigido por lei, ordem judicial ou requisição
            de autoridade competente
          </li>
        </ul>
        <p>
          Todos os parceiros são contratados com cláusulas de confidencialidade e tratamento adequado
          de dados.
        </p>

        <h2>6. Armazenamento e segurança</h2>
        <p>Os dados são armazenados em servidores localizados no Brasil, com as seguintes medidas de segurança:</p>
        <ul>
          <li>Criptografia AES-256 para dados sensíveis (chaves de API, credenciais de integração)</li>
          <li>Autenticação JWT com expiração configurada</li>
          <li>Autenticação de dois fatores (2FA TOTP) disponível</li>
          <li>Separação total de dados por Tenant (multi-tenancy isolado)</li>
          <li>Backups periódicos automáticos</li>
          <li>Logs de auditoria para ações críticas</li>
          <li>Rate limiting e proteção contra ataques de força bruta</li>
          <li>Comunicação via HTTPS/TLS em todos os endpoints</li>
        </ul>
        <p>
          Embora adotemos medidas técnicas e organizacionais adequadas, nenhum sistema é 100% inviolável.
          Em caso de incidente de segurança que afete seus dados, notificaremos os titulares e a ANPD
          conforme exigido pela LGPD.
        </p>

        <h2>7. Retenção de dados</h2>
        <p>Mantemos os dados pelo seguinte período:</p>
        <ul>
          <li>
            <strong>Conta ativa:</strong> durante toda a vigência da assinatura
          </li>
          <li>
            <strong>Após cancelamento:</strong> até 90 (noventa) dias para possibilitar exportação, sendo
            então excluídos definitivamente
          </li>
          <li>
            <strong>Dados financeiros:</strong> mínimo de 5 (cinco) anos, conforme obrigação fiscal e
            contábil
          </li>
          <li>
            <strong>Logs de auditoria:</strong> até 2 (dois) anos, para fins de segurança e conformidade
          </li>
        </ul>

        <h2>8. Direitos dos titulares (LGPD)</h2>
        <p>
          Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você, como titular de dados
          pessoais, tem os seguintes direitos:
        </p>
        <ul>
          <li>
            <strong>Confirmação e acesso:</strong> saber se tratamos seus dados e obter cópia dos mesmos
          </li>
          <li>
            <strong>Correção:</strong> solicitar a atualização de dados incompletos, inexatos ou
            desatualizados
          </li>
          <li>
            <strong>Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários ou tratados em
            desconformidade com a LGPD
          </li>
          <li>
            <strong>Portabilidade:</strong> obter seus dados em formato estruturado e interoperável
          </li>
          <li>
            <strong>Eliminação:</strong> excluir dados tratados com base no consentimento, salvo obrigação
            legal de retenção
          </li>
          <li>
            <strong>Informação:</strong> sobre com quem compartilhamos seus dados
          </li>
          <li>
            <strong>Revogação do consentimento:</strong> a qualquer momento, quando o tratamento se basear
            nesta base legal
          </li>
          <li>
            <strong>Oposição:</strong> contestar tratamento que considere em desconformidade com a lei
          </li>
        </ul>
        <p>
          Para exercer qualquer um desses direitos, entre em contato com nosso DPO (item 10 abaixo).
          Responderemos em até <strong>15 (quinze) dias úteis</strong>.
        </p>

        <h2>9. Cookies e tecnologias similares</h2>
        <p>
          A Plataforma utiliza armazenamento local (localStorage) apenas para manter a sessão autenticada
          do usuário. Não utilizamos cookies de rastreamento, publicidade ou análise comportamental de
          terceiros.
        </p>

        <h2>10. Encarregado de Proteção de Dados (DPO)</h2>
        <p>
          Conforme o art. 41 da LGPD, indicamos como Encarregado pelo Tratamento de Dados Pessoais:
        </p>
        <ul>
          <li>
            <strong>Nome:</strong> Rogério José Siqueira Marques
          </li>
          <li>
            <strong>CRT/DF:</strong> 00489124754
          </li>
          <li>
            <strong>E-mail:</strong>{' '}
            <a href="mailto:suporte@divulgabr.com.br">suporte@divulgabr.com.br</a>
          </li>
        </ul>
        <p>
          O DPO é responsável por: receber e dar tratamento às reclamações e comunicações dos titulares;
          orientar os colaboradores da DivulgaBR sobre práticas de proteção de dados; e interagir com a
          Autoridade Nacional de Proteção de Dados (ANPD).
        </p>

        <h2>11. Transferência internacional de dados</h2>
        <p>
          Os dados são armazenados primariamente no Brasil. Integrações com serviços terceiros (Mercado
          Pago, Meta/WhatsApp, n8n) podem envolver transferência internacional de dados. Nesses casos,
          asseguramos que os destinatários ofereçam nível adequado de proteção compatível com a LGPD.
        </p>

        <h2>12. Menores de idade</h2>
        <p>
          O Agendix destina-se exclusivamente a pessoas jurídicas ou maiores de 18 anos. Não coletamos
          intencionalmente dados de menores. Caso identifiquemos dados de menores coletados
          inadvertidamente, procederemos à exclusão imediata.
        </p>

        <h2>13. Alterações nesta Política</h2>
        <p>
          Esta Política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas por
          e-mail com <strong>15 dias de antecedência</strong>. O uso continuado da Plataforma após a
          vigência das alterações implica aceitação da nova Política.
        </p>

        <h2>14. Contato e reclamações</h2>
        <p>
          Para dúvidas, solicitações de direitos ou reclamações relacionadas ao tratamento de dados:
        </p>
        <ul>
          <li>
            <strong>DPO:</strong> Rogério José Siqueira Marques — CRT/DF 00489124754
          </li>
          <li>
            <strong>E-mail:</strong>{' '}
            <a href="mailto:suporte@divulgabr.com.br">suporte@divulgabr.com.br</a>
          </li>
          <li>
            <strong>ANPD:</strong> você também pode encaminhar reclamações à Autoridade Nacional de
            Proteção de Dados em{' '}
            <a href="https://www.gov.br/anpd" target="_blank" rel="noreferrer">
              www.gov.br/anpd
            </a>
          </li>
        </ul>

      </div>
    </div>
  );
}
