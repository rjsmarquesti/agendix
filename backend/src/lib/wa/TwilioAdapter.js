/**
 * Twilio WhatsApp API
 * Docs: https://www.twilio.com/docs/whatsapp/api
 *
 * wa_config esperado:
 *   { accountSid, authToken, fromNumber }
 *   fromNumber: número Twilio com prefixo "whatsapp:+55..." OU só os dígitos
 *
 * Listas interativas: NÃO suportadas — fallback automático para texto
 */
const { normalizePhone } = require('./utils');

class TwilioAdapter {
  constructor(tenant, cfg) {
    this.tenant      = tenant;
    this.accountSid  = cfg.accountSid;
    this.authToken   = cfg.authToken;
    this.fromNumber  = cfg.fromNumber;
  }

  get instanceKey() { return `twilio:${this.accountSid || this.tenant.id}`; }

  _auth() {
    return 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
  }

  _fromWa() {
    const f = (this.fromNumber || '').replace(/\D/g, '');
    return `whatsapp:+${f.startsWith('55') ? f : '55' + f}`;
  }

  async send(telefone, mensagem) {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error('Twilio: accountSid, authToken e fromNumber obrigatórios — configure na aba WhatsApp');
    }
    const to = `whatsapp:+${normalizePhone(telefone)}`;
    const body = new URLSearchParams({
      From: this._fromWa(),
      To:   to,
      Body: mensagem,
    });
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: this._auth() },
      body:    body.toString(),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Twilio API ${res.status}: ${txt}`);
    }
    return { ok: true };
  }

  // Twilio não suporta listas interativas — fallback para texto numerado
  async sendList(telefone, slots, dataLabel) {
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const lista  = slots.map((s, i) => `${emojis[i] || `${i + 1}.`} ${s}`).join('\n');
    return this.send(telefone, `📅 Horários disponíveis para *${dataLabel}*:\n\n${lista}\n\nDigite o número ou o horário desejado.`);
  }

  async status() {
    if (!this.accountSid || !this.authToken) return { connected: false, reason: 'sem credenciais' };
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`,
        { headers: { Authorization: this._auth() }, signal: AbortSignal.timeout(8_000) }
      );
      if (!res.ok) return { connected: false, reason: `HTTP ${res.status}` };
      const data = await res.json();
      return { connected: data.status === 'active', twilioStatus: data.status };
    } catch (e) {
      return { connected: false, reason: e.message };
    }
  }
}

module.exports = TwilioAdapter;
