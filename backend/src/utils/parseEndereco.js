// Extrai campos de endereço de uma string do Google Maps
// Ex: "R. Nome, 96 - Sala 604 - Bonsucesso, Rio de Janeiro - RJ, 21032-000, Brasil"
function parseEndereco(endereco) {
  if (!endereco) return {};
  const s = endereco.replace(/,?\s*Brasil\s*$/i, '').trim();
  const partes = s.split(',').map(p => p.trim());
  let estado = '', cidade = '', bairro = '', cep = '', logradouro = '';
  for (let i = partes.length - 1; i >= 0; i--) {
    if (/^\d{5}-?\d{3}$/.test(partes[i])) { cep = partes[i]; continue; }
    const m = partes[i].match(/^(.+?)\s*-\s*([A-Z]{2})$/);
    if (m) {
      cidade = m[1].trim();
      estado = m[2];
      if (i > 0) {
        const segs = partes[i - 1].split(/\s*[-–]\s*/);
        bairro = segs[segs.length - 1].trim();
        logradouro = i > 1
          ? partes.slice(0, i - 1).join(', ')
          : segs.slice(0, -1).join(' - ') || partes[0] || '';
      }
      break;
    }
  }
  return { cidade, estado, bairro, cep, logradouro };
}

module.exports = parseEndereco;
