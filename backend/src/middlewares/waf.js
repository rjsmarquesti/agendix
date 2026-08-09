const { blockEscalation } = require('../lib/ipBlocker');

// Patterns de ataque detectados em URL + body + headers
const PATTERNS = [
  {
    name: 'sqli',
    score: 30,
    regex: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.{0,30}\b(from|into|table|where|values)\b)/i,
  },
  {
    name: 'xss',
    score: 25,
    regex: /<script[\s>]|javascript\s*:|onerror\s*=|onload\s*=|eval\s*\(|document\.cookie/i,
  },
  {
    name: 'traversal',
    score: 30,
    regex: /\.\.[/\\]/,
  },
  {
    name: 'ssrf',
    score: 40,
    regex: /169\.254\.|192\.168\.|10\.\d+\.\d+\.|172\.(1[6-9]|2\d|3[01])\.|localhost|127\.0\.0/i,
  },
  {
    name: 'null_byte',
    score: 20,
    regex: /\x00/,
  },
];

function scanString(str) {
  if (!str || typeof str !== 'string') return 0;
  let score = 0;
  for (const { regex, score: s } of PATTERNS) {
    if (regex.test(str)) score += s;
  }
  return score;
}

function scanObject(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return 0;
  let score = 0;
  for (const val of Object.values(obj)) {
    if (typeof val === 'string') score += scanString(val);
    else if (typeof val === 'object') score += scanObject(val, depth + 1);
  }
  return score;
}

async function waf(req, res, next) {
  // Pagamentos: body raw — não escanear
  if (req.path === '/api/payments/webhook') return next();

  let score = 0;

  // Escaneia URL
  score += scanString(decodeURIComponent(req.url));

  // Escaneia body (já parseado pelo express.json)
  // Exclui campos base64 (logo, imagens) — conteúdo binário codificado dispara falsos positivos
  if (req.body && typeof req.body === 'object') {
    const bodyParaScan = { ...req.body };
    if (typeof bodyParaScan.logo === 'string' && bodyParaScan.logo.startsWith('data:')) {
      delete bodyParaScan.logo;
    }
    score += scanObject(bodyParaScan);
  }

  // Escaneia headers suspeitos
  const suspiciousHeaders = ['x-forwarded-for', 'referer', 'user-agent'];
  for (const h of suspiciousHeaders) {
    if (req.headers[h]) score += scanString(req.headers[h]);
  }

  if (score >= 30) {
    await blockEscalation(req.ip).catch(() => {});

    // Lazy require para evitar circular dep
    try {
      const audit = require('../lib/audit');
      audit.log(audit.EVENTS.WAF_BLOCK, {
        ip: req.ip,
        detalhes: { url: req.url, method: req.method, score },
      });
    } catch { /* ignora */ }

    return res.status(400).json({ error: 'Requisição bloqueada' });
  }

  next();
}

module.exports = waf;
