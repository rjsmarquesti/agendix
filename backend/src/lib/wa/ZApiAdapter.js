/**
 * Z-API WhatsApp
 * Docs: https://developer.z-api.io/
 *
 * wa_config esperado:
 *   { instanceId, token, clientToken }
 *
 * Listas interativas: suportadas via /send-button-list
 */
const { normalizePhone } = require('./utils');

class ZApiAdapter {
  constructor(tenant, cfg) {
    this.tenant      = tenant;
    this.instanceId  = cfg.instanceId;
    this.token       = cfg.token;
    this.clientToken = cfg.clientToken;
    this.base        = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}`;
  }

  get instanceKey() { return `zapi:${this.instanceId || this.tenant.id}`; }

  _headers() {
    return {
      'Content-Type': 'application/json',
      'Client-Token': this.clientToken,
    };
  }

  async send(telefone, mensagem) {
    if (!this.instanceId || !this.token || !this.clientToken) {
      throw new Error('Z-API: instanceId, token e clientToken obrigatórios — configure na aba WhatsApp');
    }
    const phone = normalizePhone(telefone);
    const res = await fetch(`${this.base}/send-messages`, {
      method:  'POST',
      headers: this._headers(),
      body:    JSON.stringify({ phone, message: mensagem }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Z-API ${res.status}: ${txt}`);
    }
    return { ok: true };
  }

  async sendList(telefone, slots, dataLabel) {
    const phone = normalizePhone(telefone);
    const res = await fetch(`${this.base}/send-button-list`, {
      method:  'POST',
      headers: this._headers(),
      body: JSON.stringify({
        phone,
        message: `📅 Horários disponíveis para *${dataLabel}*:`,
        buttonList: {
          title:    `📅 ${dataLabel}`,
          sections: [{
            title: 'Disponíveis',
            rows:  slots.slice(0, 20).map(s => ({ rowId: s, title: s, description: '' })),
          }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Z-API sendList ${res.status}`);
    return { ok: true };
  }

  async status() {
    if (!this.instanceId || !this.token) return { connected: false, reason: 'sem credenciais' };
    try {
      const res = await fetch(`${this.base}/status`, {
        headers: this._headers(),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return { connected: false, reason: `HTTP ${res.status}` };
      const data = await res.json();
      return { connected: data.connected === true, zApiStatus: data };
    } catch (e) {
      return { connected: false, reason: e.message };
    }
  }
}

module.exports = ZApiAdapter;
