const multer = require('multer');

// Magic bytes aceitos para upload de logo
const ALLOWED_MAGIC = [
  { bytes: [0x89, 0x50, 0x4E, 0x47], label: 'PNG' },
  { bytes: [0xFF, 0xD8, 0xFF],        label: 'JPEG' },
  { bytes: [0x47, 0x49, 0x46, 0x38], label: 'GIF' },
  // WebP: RIFF????WEBP
  { bytes: null, label: 'WEBP', check: (buf) => buf.length >= 12 && buf.slice(0,4).toString('ascii') === 'RIFF' && buf.slice(8,12).toString('ascii') === 'WEBP' },
];

function isMagicValid(buffer) {
  for (const { bytes, check } of ALLOWED_MAGIC) {
    if (check) {
      if (check(buffer)) return true;
    } else {
      if (buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b)) return true;
    }
  }
  return false;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    // Validação de MIME type na entrada (complementar aos magic bytes abaixo)
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não permitido'));
    }
    cb(null, true);
  },
});

// Middleware pós-multer: valida magic bytes do buffer em memória
function validateMagicBytes(req, res, next) {
  if (!req.file) return next();
  if (!isMagicValid(req.file.buffer)) {
    return res.status(422).json({ error: 'Arquivo inválido: conteúdo não corresponde ao tipo declarado' });
  }
  next();
}

module.exports = upload;
module.exports.validateMagicBytes = validateMagicBytes;
