const { decrypt } = require('../encrypt');
const { normalizePhone } = require('./utils');

class EvolutionAdapter {
  constructor(tenant) {
    this.tenant   = tenant;
    this.instance = tenant.evolutionInstance;
    this.base     = tenant.evolutionBaseUrl || process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
    const raw     = tenant.evolutionApiKey;
    const dec     = decrypt(raw);
    this.apikey   = dec || (raw && !raw.startsWith('enc:') ? raw : null) || process.env.EVOLUTION_GLOBAL_API_KEY;
  }

  get instanceKey() { return this.instance || `evolution:${this.tenant.id}`; }

  _headers() {
    return { 'Content-Type': 'application/json', apikey: this.apikey };
  }

  async send(telefone, mensagem) {
    const number = normalizePhone(telefone);
    const res = await fetch(`${this.base}/message/sendText/${this.instance}`, {
      method:  'POST',
      headers: this._headers(),
      body:    JSON.stringify({ number, text: mensagem }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Evolution API ${res.status}: ${txt}`);
    }
    return { ok: true };
  }

  async sendList(telefone, slots, dataLabel) {
    const number = normalizePhone(telefone);
    const res = await fetch(`${this.base}/message/sendList/${this.instance}`, {
      method:  'POST',
      headers: this._headers(),
      body: JSON.stringify({
        number,
        title:       `📅 Horários — ${dataLabel}`,
        description: 'Toque em um horário para selecioná-lo:',
        buttonText:  'Ver horários',
        footerText:  'AgendaBot',
        sections: [{ title: 'Disponíveis', rows: slots.map(s => ({ title: s, rowId: s })) }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Evolution sendList ${res.status}`);
    return { ok: true };
  }

  async status() {
    if (!this.apikey) return { connected: false, reason: 'sem apikey' };
    try {
      const res = await fetch(`${this.base}/instance/fetchInstances`, {
        headers: { apikey: this.apikey },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return { connected: false, reason: `HTTP ${res.status}` };
      const data = await res.json();
      const inst = (Array.isArray(data) ? data : [data]).find(i => i.instance?.instanceName === this.instance);
      const state = inst?.instance?.state;
      return { connected: state === 'open', state };
    } catch (e) {
      return { connected: false, reason: e.message };
    }
  }
}

module.exports = EvolutionAdapter;
