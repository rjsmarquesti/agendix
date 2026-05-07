import BrandLogo from './BrandLogo';

const DEFAULT_FEATURES = [
  {
    text: 'Agendamentos automáticos 24h pelo WhatsApp ou link público',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    text: 'CRM de clientes com kanban, histórico e lembretes automáticos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    text: 'Módulo financeiro com receitas, despesas e dashboard em tempo real',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
];

export default function AuthLeft({ title = 'Agende.\nOrganize.\nCresça.', subtitle = 'Sistema completo de agendamentos para profissionais e pequenos negócios.', features = DEFAULT_FEATURES, brand = {} }) {
  const { logo = null, nome = 'Agendix' } = brand;
  return (
    <div
      className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1a0d3d 100%)' }}
    >
      {/* Glow radial */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 30% 50%, #5B3DF5 0%, transparent 60%), radial-gradient(circle at 80% 20%, #2F80ED 0%, transparent 40%)',
        opacity: 0.18,
      }} />

      {/* Logo */}
      <div className="relative z-10">
        {logo
          ? (
            <div className="flex items-center gap-3">
              <BrandLogo logo={logo} nome={nome} size="lg" dark />
              <span className="text-white font-bold text-xl">{nome}</span>
            </div>
          )
          : (
            <img
              src="/logo-agendix-dark.png"
              alt="Agendix"
              className="h-14 w-auto object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
          )
        }
      </div>

      {/* Conteúdo central */}
      <div className="relative z-10 space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight whitespace-pre-line">{title}</h1>
          <p className="mt-4 text-lg" style={{ color: 'rgba(167,139,250,0.85)' }}>{subtitle}</p>
        </div>
        <div className="space-y-4">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(91,61,245,0.25)', color: '#a78bfa' }}>
                {f.icon}
              </div>
              <span className="text-sm" style={{ color: 'rgba(221,214,254,0.85)' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <p className="relative z-10 text-xs" style={{ color: 'rgba(139,92,246,0.5)' }}>
        © 2026 Agendix · DivulgaBR
      </p>
    </div>
  );
}
