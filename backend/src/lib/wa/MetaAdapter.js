/**
 * Meta WhatsApp Cloud API (Business API oficial)
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 *
 * wa_config esperado:
 *   { phoneNumberId, accessToken, webhookVerifyToken }
 *
 * Listas interativas: suportadas via type:"interactive"
 * Limite de rows por seção: 10 (Meta impõe)
 */
const { normalizePhone } = require('./utils');

const META_BASE = 'https://graph.facebook.com/v19.0';

class MetaAdapter {
  constructor(tenant, cfg) {
    this.tenant        = tenant;
    this.phoneNumberId = cfg.phoneNumberId;
    this.accessToken   = cfg.accessToken;
  }

  get instanceKey() { return `meta:${this.phoneNumberId || this.tenant.id}`; }

  _headers() {
    return {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
    };
  }

  async send(telefone, mensagem) {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('Meta: phoneNumberId e accessToken obrigatórios — configure na aba WhatsApp');
    }
    const to = normalizePhone(telefone);
    const res = await fetch(`${META_BASE}/${this.phoneNumberId}/messages`, {
      method:  'POST',
      headers: this._headers(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: mensagem },
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Meta Cloud API ${res.status}: ${txt}`);
    }
    return { ok: true };
  }

  async sendList(telefone, slots, dataLabel) {
    // Meta limita 10 rows — se exceder, usa texto simples para não omitir horários
    if (slots.length > 10) {
      const lista = slots.map((s, i) => `${i + 1}. ${s}`).join('\n');
      return this.send(telefone,
        `📅 Horários disponíveis para *${dataLabel}*:\n\n${lista}\n\nDigite o número ou o horário desejado.`
      );
    }
    const to = normalizePhone(telefone);
    const rows = slots.map(s => ({ id: s, title: s }));
    const res = await fetch(`${META_BASE}/${this.phoneNumberId}/messages`, {
      method:  'POST',
      headers: this._headers(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: `📅 ${dataLabel}` },
          body:   { text: 'Toque em um horário para selecioná-lo:' },
          footer: { text: 'AgendaBot' },
          action: {
            button:   'Ver horários',
            sections: [{ title: 'Disponíveis', rows }],
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Meta sendList ${res.status}`);
    return { ok: true };
  }

  async status() {
    if (!this.accessToken || !this.phoneNumberId) return { connected: false, reason: 'sem credenciais' };
    try {
      const res = await fetch(
        `${META_BASE}/${this.phoneNumberId}?fields=display_phone_number,name_status`,
        { headers: this._headers(), signal: AbortSignal.timeout(8_000) }
      );
      if (!res.ok) return { connected: false, reason: `HTTP ${res.status}` };
      const data = await res.json();
      return { connected: true, displayPhone: data.display_phone_number, nameStatus: data.name_status };
    } catch (e) {
      return { connected: false, reason: e.message };
    }
  }
}

module.exports = MetaAdapter;
