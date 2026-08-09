/**
 * Gerador de PDFs profissionais — Agendix
 * Usa jsPDF + jspdf-autotable (sem dependência de servidor)
 * Cabeçalho com logo/dados do tenant, rodapé com data e página.
 */

// Importações estáticas — o Vite fará code-splitting automático deste módulo
// porque ele só é carregado sob demanda (dynamic import nos componentes)
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Constantes de layout ─────────────────────────────────────────────────────
const PAGE_W   = 210;       // A4 largura mm
const PAGE_H   = 297;       // A4 altura mm
const MARGIN   = 14;        // margem lateral
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Utilitários ──────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

/** Carrega imagem de URL remota e retorna dataURL via canvas */
async function urlToBase64(url) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width  = img.naturalWidth  || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null; // logo não carregou; seguimos sem ela
  }
}

/** Formata data dd/mm/aaaa */
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR');
}

/** Formata valor monetário */
function fmtMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Cabeçalho e rodapé (shared) ───────────────────────────────────────────────

/**
 * Desenha o cabeçalho corporativo.
 * Retorna a posição Y após o cabeçalho (onde começa o conteúdo).
 */
async function drawHeader(doc, tenant, docTitle, docSubtitle, logoBase64) {
  let logoW = 0;

  // Logo à esquerda (se disponível)
  if (logoBase64) {
    try {
      const imgProps = doc.getImageProperties(logoBase64);
      const ratio = imgProps.width / imgProps.height;
      const logoH = 18;
      logoW = Math.min(logoH * ratio, 36);
      doc.addImage(logoBase64, 'PNG', MARGIN, 7, logoW, logoH);
    } catch { logoW = 0; }
  }

  // Nome e dados do tenant em texto escuro
  const txX = MARGIN + logoW + (logoW > 0 ? 6 : 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(tenant?.nome || 'Empresa', txX, 14);

  const subInfo = [
    tenant?.telefone,
    tenant?.email,
    [tenant?.cidade, tenant?.estado].filter(Boolean).join('/'),
  ].filter(Boolean).join('  ·  ');

  if (subInfo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(subInfo, txX, 21);
  }

  // Linha divisória abaixo do cabeçalho do tenant
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 30, PAGE_W - MARGIN, 30);

  // Faixa cinza com título do documento
  doc.setFillColor(248, 249, 252);
  doc.rect(0, 32, PAGE_W, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(docTitle, MARGIN, 42);

  if (docSubtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(docSubtitle, PAGE_W - MARGIN, 42, { align: 'right' });
  }

  // Linha inferior da faixa de título
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(0, 48, PAGE_W, 48);

  return 56; // Y de início do conteúdo
}

/** Desenha rodapé em todas as páginas */
function drawFooters(doc) {
  const now = new Date().toLocaleString('pt-BR');
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Documento gerado em ${now} · Agendix`, MARGIN, PAGE_H - 8);
    doc.text(`Página ${i} de ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }
}

// ── Seção de dados (label + valor em linhas) ─────────────────────────────────

/**
 * Renderiza um bloco de seção com título e pares label/valor.
 * Retorna o novo Y após o bloco.
 */
function drawSection(doc, title, rows, startY) {
  // Quebra de página automática
  if (startY > PAGE_H - 50) {
    doc.addPage();
    startY = 20;
  }

  // Título da seção
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, startY, CONTENT_W, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(title.toUpperCase(), MARGIN + 3, startY + 5);
  let y = startY + 11;

  const labelW = 55;
  const valueW = CONTENT_W - labelW - 4;

  rows.forEach(({ label, value }) => {
    if (!value && value !== 0) return;
    const strValue = String(value);

    // Quebrar valor longo em linhas
    const lines = doc.splitTextToSize(strValue, valueW);
    const lineH  = 5;
    const blockH = lines.length * lineH + 3;

    // Nova página se não couber
    if (y + blockH > PAGE_H - 20) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, MARGIN + 2, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(lines, MARGIN + labelW, y + 4);

    // Linha divisória entre campos
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y + blockH, MARGIN + CONTENT_W, y + blockH);

    y += blockH;
  });

  return y + 5;
}

// ── Assinatura (campo para assinar ao final) ─────────────────────────────────

function drawSignature(doc, y, label = 'Assinatura do profissional') {
  if (y > PAGE_H - 40) { doc.addPage(); y = 20; }
  y += 10;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(label, MARGIN, y + 5);

  doc.line(MARGIN + CONTENT_W - 80, y, MARGIN + CONTENT_W, y);
  doc.text('Assinatura do cliente / responsável', MARGIN + CONTENT_W - 80, y + 5);
  return y + 14;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF 0: AGENDA DO DIA
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_AGENDA_PT = {
  marcado:    'Marcado',
  confirmado: 'Confirmado',
  cancelado:  'Cancelado',
  realizado:  'Realizado',
};

/**
 * Gera a folha diária de agendamentos.
 * @param {Array}  agendamentos — lista de agendamentos do dia
 * @param {object} tenant       — dados do tenant
 * @param {string} dataISO      — data no formato YYYY-MM-DD
 */
export async function gerarPdfAgendaDia(agendamentos, tenant, dataISO) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const logoUrl = tenant?.logo
    ? (tenant.logo.startsWith('http') ? tenant.logo : `${window.location.origin}${tenant.logo}`)
    : null;
  const logoB64 = logoUrl ? await urlToBase64(logoUrl) : null;

  const dataFmt = new Date(dataISO + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  const dataFmtCapitalized = dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1);

  const emitido = `Emitido em ${new Date().toLocaleString('pt-BR')}`;
  let y = await drawHeader(doc, tenant, 'Agenda do Dia', emitido, logoB64);

  const cor = tenant?.corPrimaria || '#2563eb';
  const [r, g, b] = hexToRgb(cor);

  // ── Data do dia ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(dataFmtCapitalized, PAGE_W / 2, y + 6, { align: 'center' });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 10, PAGE_W - MARGIN, y + 10);
  y += 16;

  // ── Bloco de estatísticas (4 cards lado a lado) ───────────────────────
  const total      = agendamentos.length;
  const pendentes  = agendamentos.filter(a => a.status === 'marcado').length;
  const confirmados = agendamentos.filter(a => a.status === 'confirmado').length;
  const realizados = agendamentos.filter(a => a.status === 'realizado').length;
  const cancelados = agendamentos.filter(a => a.status === 'cancelado').length;

  const stats = [
    { label: 'Total', value: total,       cor: [r, g, b],   textCor: [255, 255, 255] },
    { label: 'Marcados',  value: pendentes,   cor: [219, 234, 254], textCor: [30, 64, 175] },
    { label: 'Confirmados', value: confirmados, cor: [220, 252, 231], textCor: [20, 83, 45] },
    { label: 'Realizados', value: realizados,  cor: [241, 245, 249], textCor: [71, 85, 105] },
  ];

  const cardW = (CONTENT_W - 9) / 4;
  stats.forEach((s, i) => {
    const x = MARGIN + i * (cardW + 3);
    doc.setFillColor(...s.cor);
    doc.roundedRect(x, y, cardW, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...s.textCor);
    doc.text(String(s.value), x + cardW / 2, y + 9, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(s.label, x + cardW / 2, y + 14, { align: 'center' });
  });
  y += 22;

  // ── Tabela de agendamentos ────────────────────────────────────────────
  if (total === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum agendamento para esta data.', PAGE_W / 2, y + 10, { align: 'center' });
  } else {
    const sorted = [...agendamentos].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

    const tableRows = sorted.map(ag => [
      ag.hora?.slice(0, 5) || '—',
      ag.lead?.nome || ag.clienteNome || '—',
      ag.servico?.nome || ag.tipo || '—',
      STATUS_AGENDA_PT[ag.status] || ag.status || '—',
      ag.lead?.telefone || '—',
      ag.observacoes || '',
    ]);

    // Cores por status nas linhas
    const statusRowColor = {
      marcado:    [219, 234, 254],
      confirmado: [220, 252, 231],
      cancelado:  [254, 226, 226],
      realizado:  [241, 245, 249],
    };

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Horário', 'Cliente', 'Serviço / Tipo', 'Status', 'Telefone', 'Obs.']],
      body: tableRows,
      headStyles: {
        fillColor: [r, g, b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [30, 41, 59],
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 42 },
        2: { cellWidth: 38 },
        3: { cellWidth: 24, halign: 'center' },
        4: { cellWidth: 30 },
        5: { cellWidth: 'auto', textColor: [100, 116, 139], fontSize: 7.5, fontStyle: 'italic' },
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.2,
      // Colorir linha por status
      willDrawCell(data) {
        if (data.section !== 'body') return;
        const ag = sorted[data.row.index];
        const color = statusRowColor[ag?.status];
        if (color && data.column.index === 3) {
          doc.setFillColor(...color);
        }
      },
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Rodapé de cancelados (se houver) ─────────────────────────────────
  if (cancelados > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`* ${cancelados} agendamento(s) cancelado(s) não incluído(s) nas estatísticas de atendimento.`, MARGIN, y);
    y += 6;
  }

  // ── Campo de anotações ────────────────────────────────────────────────
  if (y < PAGE_H - 60) {
    if (y + 35 > PAGE_H - 20) { doc.addPage(); y = 20; }
    y += 4;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(MARGIN, y, CONTENT_W, 30, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, 30, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('ANOTAÇÕES DO DIA', MARGIN + 4, y + 6);
    // Linhas para escrita manual
    for (let l = 1; l <= 3; l++) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(MARGIN + 4, y + 6 + l * 7, MARGIN + CONTENT_W - 4, y + 6 + l * 7);
    }
  }

  drawFooters(doc);

  const dataArq = dataISO.replace(/-/g, '');
  doc.save(`agenda-${dataArq}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF 1: FICHA DE CLIENTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @param {object} ficha  — registro de ficha com campos dinâmicos
 * @param {object} tenant — dados do tenant (nome, logo, telefone, email, etc.)
 * @param {Array}  fields — campos dinâmicos do nicho (de getFichaFields)
 * @param {string} docLabel — label do módulo, ex: "Ficha de Cliente"
 */
export async function gerarPdfFicha(ficha, tenant, fields, docLabel = 'Ficha de Cliente') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Logo
  const logoUrl = tenant?.logo
    ? (tenant.logo.startsWith('http') ? tenant.logo : `${window.location.origin}${tenant.logo}`)
    : null;
  const logoB64 = logoUrl ? await urlToBase64(logoUrl) : null;

  const subtitle = `Emitido em ${new Date().toLocaleDateString('pt-BR')}  ·  ID #${ficha.id}`;
  let y = await drawHeader(doc, tenant, docLabel, subtitle, logoB64);

  // ── Dados pessoais ────────────────────────────────────────────────────
  const dadosPessoais = [
    { label: 'Nome completo', value: ficha.nome },
    { label: 'Telefone',      value: ficha.telefone },
    { label: 'E-mail',        value: ficha.email },
  ];
  y = drawSection(doc, 'Dados Pessoais', dadosPessoais, y);

  // ── Dados do nicho ────────────────────────────────────────────────────
  if (fields.length > 0) {
    const dadosNicho = fields.map(f => ({
      label: f.label,
      value: ficha.campos?.[f.key],
    }));
    y = drawSection(doc, 'Informações Complementares', dadosNicho, y);
  }

  // ── Observações ───────────────────────────────────────────────────────
  if (ficha.observacoes) {
    y = drawSection(doc, 'Observações', [{ label: 'Observações', value: ficha.observacoes }], y);
  }

  // ── Assinatura ────────────────────────────────────────────────────────
  drawSignature(doc, y);

  drawFooters(doc);
  doc.save(`ficha-${ficha.nome.replace(/\s+/g, '-').toLowerCase()}-${ficha.id}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF 2: ANAMNESE
// ═══════════════════════════════════════════════════════════════════════════════

export async function gerarPdfAnamnese(anamnese, tenant, fields, docLabel = 'Anamnese') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const logoUrl = tenant?.logo
    ? (tenant.logo.startsWith('http') ? tenant.logo : `${window.location.origin}${tenant.logo}`)
    : null;
  const logoB64 = logoUrl ? await urlToBase64(logoUrl) : null;

  const subtitle = `Emitido em ${new Date().toLocaleDateString('pt-BR')}  ·  ID #${anamnese.id}`;
  let y = await drawHeader(doc, tenant, docLabel, subtitle, logoB64);

  // ── Identificação ─────────────────────────────────────────────────────
  const identificacao = [
    { label: 'Cliente',          value: anamnese.nomeCliente },
    { label: 'Ficha vinculada',  value: anamnese.ficha?.nome },
    { label: 'Data de criação',  value: fmtDate(anamnese.createdAt) },
  ];
  y = drawSection(doc, 'Identificação', identificacao, y);

  // ── Questionário dinâmico ─────────────────────────────────────────────
  if (fields.length > 0) {
    const questionario = fields.map(f => ({
      label: f.label,
      value: anamnese.campos?.[f.key],
    }));
    y = drawSection(doc, 'Questionário', questionario, y);
  }

  // ── Observações ───────────────────────────────────────────────────────
  if (anamnese.observacoes) {
    y = drawSection(doc, 'Observações do profissional', [{ label: 'Obs.', value: anamnese.observacoes }], y);
  }

  // ── Declaração ────────────────────────────────────────────────────────
  if (y + 30 > PAGE_H - 40) { doc.addPage(); y = 20; }
  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const declaracao = 'Declaro que as informações prestadas são verdadeiras e autorizo a utilização das mesmas para fins de atendimento.';
  const declLines = doc.splitTextToSize(declaracao, CONTENT_W);
  doc.text(declLines, MARGIN, y);
  y += declLines.length * 4 + 4;

  drawSignature(doc, y);
  drawFooters(doc);

  doc.save(`anamnese-${anamnese.nomeCliente.replace(/\s+/g, '-').toLowerCase()}-${anamnese.id}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF 3: ORÇAMENTO
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_PT = {
  rascunho: 'Rascunho',
  enviado:  'Enviado ao cliente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  expirado: 'Expirado',
};

export async function gerarPdfOrcamento(orc, tenant, docLabel = 'Orçamento') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const logoUrl = tenant?.logo
    ? (tenant.logo.startsWith('http') ? tenant.logo : `${window.location.origin}${tenant.logo}`)
    : null;
  const logoB64 = logoUrl ? await urlToBase64(logoUrl) : null;

  const subtitle = `${orc.numero}  ·  Emitido em ${new Date().toLocaleDateString('pt-BR')}`;
  let y = await drawHeader(doc, tenant, docLabel, subtitle, logoB64);

  // ── Dados do cliente e orçamento ─────────────────────────────────────
  const cor = tenant?.corPrimaria || '#2563eb';
  const [r, g, b] = hexToRgb(cor);

  const dadosOrc = [
    { label: 'Cliente',      value: orc.clienteNome },
    { label: 'Telefone',     value: orc.clienteTel },
    { label: 'Número',       value: orc.numero },
    { label: 'Status',       value: STATUS_PT[orc.status] || orc.status },
    { label: 'Válido até',   value: orc.validadeAte ? fmtDate(orc.validadeAte) : null },
    { label: 'Descrição',    value: orc.descricao },
  ];
  y = drawSection(doc, 'Dados do Orçamento', dadosOrc, y);

  // ── Tabela de itens ───────────────────────────────────────────────────
  const itens = Array.isArray(orc.itens) ? orc.itens.filter(i => i.descricao?.trim()) : [];

  if (itens.length > 0) {
    if (y > PAGE_H - 60) { doc.addPage(); y = 20; }

    // Título da seção
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('ITENS DO ORÇAMENTO', MARGIN + 3, y + 5);
    y += 9;

    const tableRows = itens.map(item => [
      item.descricao,
      String(item.qtd || 1),
      fmtMoeda(item.valorUnit),
      fmtMoeda((Number(item.qtd) || 0) * (Number(item.valorUnit) || 0)),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Descrição', 'Qtd', 'Valor Unit.', 'Total']],
      body: tableRows,
      headStyles: {
        fillColor: [r, g, b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [30, 41, 59],
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.2,
    });

    y = doc.lastAutoTable.finalY + 4;

    // ── Linha de total ────────────────────────────────────────────────
    if (y > PAGE_H - 30) { doc.addPage(); y = 20; }

    doc.setFillColor(r, g, b);
    doc.rect(MARGIN + CONTENT_W - 80, y, 80, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', MARGIN + CONTENT_W - 78, y + 7);
    doc.text(fmtMoeda(orc.valorTotal), MARGIN + CONTENT_W - 2, y + 7, { align: 'right' });
    y += 16;
  }

  // ── Observações ───────────────────────────────────────────────────────
  if (orc.observacoes) {
    y = drawSection(doc, 'Observações', [{ label: 'Obs.', value: orc.observacoes }], y);
  }

  // ── Condições gerais ─────────────────────────────────────────────────
  if (y + 20 > PAGE_H - 40) { doc.addPage(); y = 20; }
  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const cond = 'Este orçamento tem caráter informativo e não constitui contrato. Os valores são válidos pelo prazo indicado acima. Em caso de dúvidas, entre em contato conosco.';
  doc.text(doc.splitTextToSize(cond, CONTENT_W), MARGIN, y);
  y += 10;

  // ── Assinatura (para orçamentos aprovados) ────────────────────────────
  if (['aprovado', 'enviado'].includes(orc.status)) {
    drawSignature(doc, y, 'Assinatura do responsável');
  }

  drawFooters(doc);
  doc.save(`orcamento-${orc.numero}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF 4: PRONTUÁRIO
// ═══════════════════════════════════════════════════════════════════════════════

export async function gerarPdfProntuario(prontuario, tenant, docLabel = 'Prontuário') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const logoUrl = tenant?.logo
    ? (tenant.logo.startsWith('http') ? tenant.logo : `${window.location.origin}${tenant.logo}`)
    : null;
  const logoB64 = logoUrl ? await urlToBase64(logoUrl) : null;

  const subtitle = `Emitido em ${new Date().toLocaleDateString('pt-BR')}  ·  ID #${prontuario.id}`;
  let y = await drawHeader(doc, tenant, docLabel, subtitle, logoB64);

  // ── Dados do paciente ─────────────────────────────────────────────────
  y = drawSection(doc, 'Dados do Paciente', [
    { label: 'Nome',            value: prontuario.nomeCliente },
    { label: 'Telefone',        value: prontuario.telefone },
    { label: 'E-mail',          value: prontuario.email },
    { label: 'Data nasc.',      value: prontuario.dataNascimento },
    { label: 'Convênio',        value: prontuario.convenio },
    { label: 'Nº Carteirinha',  value: prontuario.numeroCarteirinha },
  ], y);

  // ── Campos dinâmicos ──────────────────────────────────────────────────
  const campos = prontuario.campos;
  if (campos && typeof campos === 'object') {
    const camposRows = Object.entries(campos)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => ({ label: k, value: String(v) }));
    if (camposRows.length > 0) {
      y = drawSection(doc, 'Informações Clínicas', camposRows, y);
    }
  }

  // ── Diagnóstico ───────────────────────────────────────────────────────
  if (prontuario.diagnostico) {
    y = drawSection(doc, 'Diagnóstico', [{ label: 'Diagnóstico', value: prontuario.diagnostico }], y);
  }

  // ── Observações ───────────────────────────────────────────────────────
  if (prontuario.observacoes) {
    y = drawSection(doc, 'Observações', [{ label: 'Obs.', value: prontuario.observacoes }], y);
  }

  // ── Histórico de Evoluções ────────────────────────────────────────────
  const evolucoes = Array.isArray(prontuario.evolucoes) ? prontuario.evolucoes : [];
  if (evolucoes.length > 0) {
    if (y > PAGE_H - 50) { doc.addPage(); y = 20; }

    // Cabeçalho da seção
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('HISTÓRICO DE EVOLUÇÕES', MARGIN + 3, y + 5);
    y += 11;

    for (const ev of evolucoes) {
      const evDate = ev.data ? new Date(ev.data).toLocaleDateString('pt-BR') : '—';
      const header = `${evDate}${ev.profissional ? '  ·  ' + ev.profissional : ''}`;

      if (y > PAGE_H - 30) { doc.addPage(); y = 20; }

      // Mini-cabeçalho da evolução
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(header, MARGIN + 2, y + 4);
      y += 7;

      // Texto da evolução
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(ev.texto || '—', CONTENT_W - 4);
      const lineH = 4.5;
      if (y + lines.length * lineH > PAGE_H - 20) { doc.addPage(); y = 20; }
      doc.text(lines, MARGIN + 2, y);
      y += lines.length * lineH + 3;

      // Separador
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
      y += 4;
    }
  }

  // ── Assinatura ────────────────────────────────────────────────────────
  drawSignature(doc, y, 'Assinatura do profissional responsável');

  drawFooters(doc);
  const nomeArq = prontuario.nomeCliente.replace(/\s+/g, '-').toLowerCase();
  doc.save(`prontuario-${nomeArq}-${prontuario.id}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF 5: DOCUMENTO
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_DOC_PT = {
  rascunho:  'Rascunho',
  ativo:     'Ativo',
  vencido:   'Vencido',
  cancelado: 'Cancelado',
};

const TIPO_DOC_PT = {
  contrato:      'Contrato',
  declaracao:    'Declaração',
  receita:       'Receita',
  atestado:      'Atestado',
  laudo:         'Laudo',
  autorizacao:   'Autorização',
  outro:         'Outro',
};

export async function gerarPdfDocumento(documento, tenant, docLabel = 'Documento') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const logoUrl = tenant?.logo
    ? (tenant.logo.startsWith('http') ? tenant.logo : `${window.location.origin}${tenant.logo}`)
    : null;
  const logoB64 = logoUrl ? await urlToBase64(logoUrl) : null;

  const tipoLabel = TIPO_DOC_PT[documento.tipo] || documento.tipo || 'Documento';
  const subtitle  = `${tipoLabel}  ·  Emitido em ${new Date().toLocaleDateString('pt-BR')}  ·  ID #${documento.id}`;
  let y = await drawHeader(doc, tenant, docLabel || tipoLabel, subtitle, logoB64);

  // ── Dados gerais ──────────────────────────────────────────────────────
  y = drawSection(doc, 'Informações do Documento', [
    { label: 'Título',          value: documento.titulo },
    { label: 'Tipo',            value: tipoLabel },
    { label: 'Status',          value: STATUS_DOC_PT[documento.status] || documento.status },
    { label: 'Cliente',         value: documento.clienteNome },
    { label: 'Telefone',        value: documento.clienteTel },
    { label: 'Data vencimento', value: documento.dataVencimento ? fmtDate(documento.dataVencimento) : null },
  ], y);

  // ── Conteúdo do documento ─────────────────────────────────────────────
  if (documento.conteudo) {
    if (y > PAGE_H - 50) { doc.addPage(); y = 20; }

    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('CONTEÚDO', MARGIN + 3, y + 5);
    y += 11;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const contentLines = doc.splitTextToSize(documento.conteudo, CONTENT_W);
    const lineH = 5;

    for (const line of contentLines) {
      if (y > PAGE_H - 20) { doc.addPage(); y = 20; }
      doc.text(line, MARGIN, y);
      y += lineH;
    }
    y += 4;
  }

  // ── Observações ───────────────────────────────────────────────────────
  if (documento.observacoes) {
    y = drawSection(doc, 'Observações', [{ label: 'Obs.', value: documento.observacoes }], y);
  }

  // ── Assinatura ────────────────────────────────────────────────────────
  drawSignature(doc, y, 'Assinatura do responsável');

  drawFooters(doc);
  const nomeArq = documento.titulo.replace(/\s+/g, '-').toLowerCase();
  doc.save(`documento-${nomeArq}-${documento.id}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
export async function gerarPdfOrdemServico(os, tenant, docLabel = 'Ordem de Serviço') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const logoUrl = tenant?.logo
    ? (tenant.logo.startsWith('http') ? tenant.logo : `${window.location.origin}${tenant.logo}`)
    : null;
  const logoB64 = logoUrl ? await urlToBase64(logoUrl) : null;

  const subtitle = `${os.numero}  ·  Emitido em ${new Date().toLocaleDateString('pt-BR')}`;
  let y = await drawHeader(doc, tenant, docLabel, subtitle, logoB64);

  const cor = tenant?.corPrimaria || '#2563eb';
  const [r, g, b] = hexToRgb(cor);

  const STATUS_OS = {
    aberta: 'Aberta', em_andamento: 'Em andamento',
    aguardando_peca: 'Aguardando peça', concluida: 'Concluída', cancelada: 'Cancelada',
  };

  // ── Dados da OS ───────────────────────────────────────────────────────
  const dadosOS = [
    { label: 'Cliente',     value: os.clienteNome },
    { label: 'Telefone',    value: os.clienteTel },
    { label: 'Endereço',    value: os.clienteEndereco },
    { label: 'Número OS',   value: os.numero },
    { label: 'Status',      value: STATUS_OS[os.status] || os.status },
    { label: 'Descrição',   value: os.descricaoServico },
  ];
  y = drawSection(doc, 'Dados da Ordem de Serviço', dadosOS, y);

  // ── Dados técnicos ────────────────────────────────────────────────────
  const dadosTec = [
    { label: 'Técnico',     value: os.tecnicoNome },
    { label: 'Abertura',    value: os.dataAbertura || null },
    { label: 'Previsão',    value: os.dataPrevista || null },
    { label: 'Conclusão',   value: os.dataConclusao || null },
    { label: 'Garantia',    value: os.garantiaDias ? `${os.garantiaDias} dias` : null },
  ].filter(d => d.value);

  if (dadosTec.length > 0) {
    y = drawSection(doc, 'Dados Técnicos', dadosTec, y);
  }

  // ── Tabela de itens ───────────────────────────────────────────────────
  const itens = Array.isArray(os.itens) ? os.itens.filter(i => i.descricao?.trim()) : [];

  if (itens.length > 0) {
    if (y > PAGE_H - 60) { doc.addPage(); y = 20; }

    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('ITENS / PEÇAS', MARGIN + 3, y + 5);
    y += 9;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Descrição', 'Qtd', 'Valor Unit.', 'Total']],
      body: itens.map(item => [
        item.descricao,
        String(item.qtd || 1),
        fmtMoeda(item.valorUnit),
        fmtMoeda((Number(item.qtd) || 0) * (Number(item.valorUnit) || 0)),
      ]),
      headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, cellPadding: 3 },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59], cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.2,
    });

    y = doc.lastAutoTable.finalY + 4;

    if (y > PAGE_H - 30) { doc.addPage(); y = 20; }
    doc.setFillColor(r, g, b);
    doc.rect(MARGIN + CONTENT_W - 80, y, 80, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', MARGIN + CONTENT_W - 78, y + 7);
    doc.text(fmtMoeda(os.valorTotal), MARGIN + CONTENT_W - 2, y + 7, { align: 'right' });
    y += 16;
  }

  // ── Observações ───────────────────────────────────────────────────────
  if (os.observacoes) {
    y = drawSection(doc, 'Observações', [{ label: 'Obs.', value: os.observacoes }], y);
  }

  // ── Condições gerais ─────────────────────────────────────────────────
  if (y + 20 > PAGE_H - 40) { doc.addPage(); y = 20; }
  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const cond = 'Esta ordem de serviço foi gerada eletronicamente e possui validade legal. A garantia dos serviços é contada a partir da data de conclusão. Em caso de dúvidas, entre em contato conosco.';
  doc.text(doc.splitTextToSize(cond, CONTENT_W), MARGIN, y);
  y += 10;

  // ── Assinatura ────────────────────────────────────────────────────────
  if (['concluida'].includes(os.status)) {
    drawSignature(doc, y, 'Assinatura do cliente');
  }

  drawFooters(doc);
  doc.save(`os-${os.numero}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
export async function gerarPdfProcesso(processo, tenant, docLabel = 'Processo Jurídico') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const logoUrl = tenant?.logo
    ? (tenant.logo.startsWith('http') ? tenant.logo : `${window.location.origin}${tenant.logo}`)
    : null;
  const logoB64 = logoUrl ? await urlToBase64(logoUrl) : null;

  const TIPOS_PT = {
    acao_civil: 'Ação Civil', trabalhista: 'Trabalhista', criminal: 'Criminal',
    familia: 'Família', previdenciario: 'Previdenciário', consumidor: 'Consumidor', outro: 'Outro',
  };
  const STATUS_PT = { ativo: 'Ativo', suspenso: 'Suspenso', encerrado: 'Encerrado', arquivado: 'Arquivado' };

  const subtitle = `${TIPOS_PT[processo.tipo] || processo.tipo}  ·  ${processo.numero}  ·  Emitido em ${new Date().toLocaleDateString('pt-BR')}`;
  let y = await drawHeader(doc, tenant, docLabel, subtitle, logoB64);

  // ── Informações do processo ───────────────────────────────────────────
  y = drawSection(doc, 'Identificação do Processo', [
    { label: 'Número',   value: processo.numero },
    { label: 'Título',   value: processo.titulo },
    { label: 'Tipo',     value: TIPOS_PT[processo.tipo] || processo.tipo },
    { label: 'Status',   value: STATUS_PT[processo.status] || processo.status },
    { label: 'Vara',     value: processo.vara },
    { label: 'Comarca',  value: processo.comarca },
  ], y);

  // ── Partes ───────────────────────────────────────────────────────────
  y = drawSection(doc, 'Partes', [
    { label: 'Cliente',          value: processo.clienteNome },
    { label: 'Telefone',         value: processo.clienteTel },
    { label: 'Parte contrária',  value: processo.parteContraria },
    { label: 'Advogado',         value: processo.advogado },
  ], y);

  // ── Prazos ───────────────────────────────────────────────────────────
  y = drawSection(doc, 'Datas e Prazos', [
    { label: 'Abertura',        value: processo.dataAbertura    ? fmtDate(processo.dataAbertura)    : null },
    { label: 'Próximo prazo',   value: processo.prazoProximo    ? fmtDate(processo.prazoProximo)    : null },
    { label: 'Encerramento',    value: processo.dataEncerramento ? fmtDate(processo.dataEncerramento) : null },
  ], y);

  // ── Financeiro ───────────────────────────────────────────────────────
  if (processo.valorCausa || processo.honorarios) {
    y = drawSection(doc, 'Financeiro', [
      { label: 'Valor da causa', value: processo.valorCausa ? fmtMoeda(processo.valorCausa) : null },
      { label: 'Honorários',     value: processo.honorarios ? fmtMoeda(processo.honorarios) : null },
    ], y);
  }

  // ── Observações ──────────────────────────────────────────────────────
  if (processo.observacoes) {
    y = drawSection(doc, 'Observações', [{ label: 'Obs.', value: processo.observacoes }], y);
  }

  // ── Movimentações ────────────────────────────────────────────────────
  const movs = Array.isArray(processo.movimentacoes) ? processo.movimentacoes : [];
  if (movs.length > 0) {
    if (y > PAGE_H - 50) { doc.addPage(); y = 20; }
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('MOVIMENTAÇÕES', MARGIN + 3, y + 5);
    y += 11;

    for (const m of [...movs].reverse()) {
      if (y > PAGE_H - 20) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const dataStr = new Date(m.data).toLocaleDateString('pt-BR');
      doc.text(`${dataStr}  —  ${m.tipo || 'outros'}`, MARGIN, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const linhas = doc.splitTextToSize(m.texto, CONTENT_W);
      for (const l of linhas) {
        if (y > PAGE_H - 15) { doc.addPage(); y = 20; }
        doc.text(l, MARGIN, y);
        y += 4.5;
      }
      y += 3;
    }
  }

  // ── Assinatura ────────────────────────────────────────────────────────
  drawSignature(doc, y + 4, 'Assinatura do advogado responsável');

  drawFooters(doc);
  doc.save(`processo-${processo.numero}.pdf`);
}
