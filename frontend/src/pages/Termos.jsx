export default function Termos() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-sm">

        <h1>Termos de Uso — Agendix</h1>
        <p>
          <strong>Última atualização:</strong> 18 de maio de 2026
        </p>
        <p>
          Bem-vindo ao <strong>Agendix</strong>, plataforma SaaS de CRM e agendamento online desenvolvida e
          operada pela <strong>DivulgaBR Agência Digital</strong>, inscrita no CNPJ{' '}
          <strong>50.406.025/0001-68</strong>, com sede em Brasília — DF ("nós", "nosso" ou "DivulgaBR").
        </p>
        <p>
          Ao criar uma conta, acessar ou utilizar qualquer funcionalidade do Agendix, você ("Contratante" ou
          "Usuário") declara ter lido, compreendido e concordado integralmente com estes Termos de Uso. Caso
          não concorde, não utilize o serviço.
        </p>

        <hr />

        <h2>1. Definições</h2>
        <ul>
          <li>
            <strong>Plataforma:</strong> sistema Agendix acessível via web, incluindo painel administrativo,
            APIs e funcionalidades integradas.
          </li>
          <li>
            <strong>Contratante:</strong> pessoa jurídica ou física que contrata o uso da Plataforma e é
            responsável pela sua utilização e pelos dados inseridos.
          </li>
          <li>
            <strong>Usuário Final:</strong> clientes do Contratante que interagem com agendamentos, formulários
            públicos ou comunicações geradas pela Plataforma.
          </li>
          <li>
            <strong>Tenant:</strong> instância isolada criada para cada Contratante, com dados segregados dos
            demais.
          </li>
        </ul>

        <h2>2. Objeto do serviço</h2>
        <p>
          O Agendix oferece, mediante assinatura, as seguintes funcionalidades, conforme o plano contratado:
        </p>
        <ul>
          <li>Gestão de agenda e agendamentos online</li>
          <li>CRM de leads e clientes</li>
          <li>Comunicação via WhatsApp (Evolution API)</li>
          <li>Módulo financeiro (receitas e despesas)</li>
          <li>Automações via n8n</li>
          <li>Painel administrativo multi-usuário</li>
          <li>Relatórios e exportação de dados</li>
        </ul>

        <h2>3. Cadastro e conta</h2>
        <p>
          Para utilizar o Agendix é necessário criar uma conta com informações verdadeiras e atualizadas. O
          Contratante é responsável pela confidencialidade de suas credenciais e por todos os atos realizados
          em sua conta. Qualquer uso não autorizado deve ser comunicado imediatamente a{' '}
          <a href="mailto:suporte@divulgabr.com.br">suporte@divulgabr.com.br</a>.
        </p>
        <p>
          O cadastro exige a informação de CNPJ ou CPF válido, endereço e dados de contato. Informações
          falsas ensejam suspensão imediata da conta.
        </p>

        <h2>4. Período de teste e planos pagos</h2>
        <p>
          Novos Contratantes têm direito a <strong>14 (quatorze) dias de teste gratuito</strong> com acesso
          completo à Plataforma. Ao término do período de teste, o acesso é suspenso até a adesão a um plano
          pago.
        </p>
        <p>Os planos disponíveis e seus valores mensais são:</p>
        <ul>
          <li>
            <strong>Solo:</strong> R$ 49,00/mês — até 100 agendamentos/mês, 1 usuário, confirmação WA automática
          </li>
          <li>
            <strong>Pro:</strong> R$ 89,00/mês — agendamentos ilimitados, 5 usuários, bot WhatsApp completo,
            módulo financeiro básico
          </li>
          <li>
            <strong>Business:</strong> R$ 149,00/mês — agendamentos ilimitados, usuários ilimitados, bot
            WhatsApp + Agente IA, módulo financeiro completo
          </li>
        </ul>
        <p>
          Os preços podem ser alterados com aviso prévio de <strong>30 dias</strong> por e-mail. A assinatura
          em vigor não é afetada até o próximo ciclo de renovação.
        </p>

        <h2>5. Pagamento e cobrança</h2>
        <p>
          Os pagamentos são processados via <strong>Mercado Pago</strong> mediante assinatura recorrente com
          cartão de crédito. A cobrança é realizada automaticamente na data de vencimento de cada ciclo mensal.
        </p>
        <p>
          Em caso de falha no pagamento, o Contratante será notificado por e-mail e terá até{' '}
          <strong>5 (cinco) dias</strong> para regularizar antes da suspensão do acesso. O acesso é
          reestabelecido automaticamente após confirmação do pagamento.
        </p>

        <h2>6. Cancelamento e reembolso</h2>
        <p>
          O Contratante pode cancelar a assinatura a qualquer momento pelo painel em{' '}
          <strong>Configurações → Plano</strong>. O acesso permanece ativo até o último dia do período já
          pago, sem reembolso proporcional.
        </p>
        <p>
          Excetuam-se os casos de desistência dentro do prazo de 7 (sete) dias após a primeira contratação
          paga, conforme art. 49 do Código de Defesa do Consumidor, nos quais o reembolso integral será
          realizado.
        </p>

        <h2>7. Responsabilidades do Contratante</h2>
        <p>O Contratante compromete-se a:</p>
        <ul>
          <li>Utilizar a Plataforma em conformidade com a legislação vigente</li>
          <li>
            Obter consentimento adequado dos seus Usuários Finais para coleta e processamento de dados
            pessoais, conforme a LGPD (Lei 13.709/2018)
          </li>
          <li>Não utilizar a Plataforma para envio de spam, conteúdo ilegal ou enganoso</li>
          <li>Manter suas credenciais em sigilo e comunicar imediatamente qualquer acesso indevido</li>
          <li>Manter dados cadastrais atualizados (CNPJ, e-mail, telefone)</li>
        </ul>

        <h2>8. Responsabilidades da DivulgaBR</h2>
        <p>A DivulgaBR compromete-se a:</p>
        <ul>
          <li>Manter a Plataforma disponível com esforço razoável de uptime</li>
          <li>Realizar backups periódicos dos dados dos Tenants</li>
          <li>Notificar o Contratante em caso de incidentes de segurança que afetem seus dados</li>
          <li>Tratar os dados conforme a Política de Privacidade e a LGPD</li>
        </ul>

        <h2>9. Limitação de responsabilidade</h2>
        <p>
          A DivulgaBR não se responsabiliza por: (a) falhas de serviços de terceiros (Mercado Pago,
          Evolution API, WhatsApp, provedores de hospedagem, n8n); (b) perdas decorrentes de uso indevido
          da Plataforma pelo Contratante; (c) indisponibilidades causadas por força maior, ataques
          cibernéticos ou manutenções programadas comunicadas com antecedência.
        </p>
        <p>
          Em nenhuma hipótese a responsabilidade total da DivulgaBR excederá o valor pago pelo Contratante
          nos <strong>3 (três) meses anteriores</strong> ao evento gerador.
        </p>

        <h2>10. Propriedade intelectual</h2>
        <p>
          Todos os direitos sobre a Plataforma Agendix — código-fonte, marca, design, documentação e
          funcionalidades — pertencem exclusivamente à DivulgaBR. O Contratante recebe apenas uma licença
          de uso não exclusiva, intransferível e revogável, limitada ao período de vigência da assinatura.
        </p>
        <p>
          Os dados inseridos pelo Contratante permanecem de sua propriedade. A DivulgaBR não reivindica
          direitos sobre conteúdo do Tenant.
        </p>

        <h2>11. Suspensão e encerramento</h2>
        <p>
          A DivulgaBR reserva-se o direito de suspender ou encerrar uma conta, a qualquer momento e sem
          aviso prévio, em caso de: violação destes Termos; inadimplência superior a 30 dias; uso ilegal
          ou abusivo da Plataforma; suspeita de fraude.
        </p>
        <p>
          Após encerramento, os dados do Tenant são mantidos por até 90 dias para possibilidade de
          exportação, sendo então excluídos definitivamente, salvo obrigação legal de retenção.
        </p>

        <h2>12. Alterações nos Termos</h2>
        <p>
          Estes Termos podem ser atualizados a qualquer momento. Alterações relevantes serão comunicadas
          com <strong>15 dias de antecedência</strong> por e-mail. O uso continuado da Plataforma após a
          vigência das alterações implica aceitação dos novos termos.
        </p>

        <h2>13. Foro e lei aplicável</h2>
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
          comarca de <strong>Brasília — DF</strong> para dirimir quaisquer controvérsias decorrentes deste
          instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
        </p>

        <h2>14. Contato</h2>
        <p>
          Para dúvidas, sugestões ou notificações jurídicas:
        </p>
        <ul>
          <li>
            <strong>E-mail:</strong>{' '}
            <a href="mailto:suporte@divulgabr.com.br">suporte@divulgabr.com.br</a>
          </li>
          <li>
            <strong>Empresa:</strong> DivulgaBR Agência Digital — CNPJ 50.406.025/0001-68
          </li>
          <li>
            <strong>Sede:</strong> Brasília — DF, Brasil
          </li>
        </ul>

      </div>
    </div>
  );
}
