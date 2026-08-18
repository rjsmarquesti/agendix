const { lookup } = require('dns/promises');
const { isIP } = require('net');

// Bloqueia URLs configuráveis pelo tenant (ex: n8nWebhookUrl) que resolvem
// para rede interna — protege contra SSRF (padrão AP-016 do CLAUDE.md).
function ehIpPrivado(ip) {
  const versao = isIP(ip);
  if (versao === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata cloud
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  if (versao === 6) {
    const low = ip.toLowerCase();
    if (low === '::1' || low === '::') return true;
    if (low.startsWith('fc') || low.startsWith('fd')) return true; // unique local
    if (low.startsWith('fe80')) return true; // link-local
    return false;
  }
  return true; // não resolveu para IP válido → trata como suspeito
}

async function validarHostPublico(urlStr) {
  let host;
  try {
    host = new URL(urlStr).hostname;
  } catch {
    return false;
  }
  if (isIP(host)) return !ehIpPrivado(host);
  try {
    const { address } = await lookup(host);
    return !ehIpPrivado(address);
  } catch {
    return false;
  }
}

module.exports = { validarHostPublico };
