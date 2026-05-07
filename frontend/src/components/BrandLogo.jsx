const SIZE_CLS = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };

export default function BrandLogo({ logo, nome = 'Agendix', size = 'md', dark = false }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={nome}
        className={`${SIZE_CLS[size]} object-contain rounded-xl ${dark ? 'bg-white/10 p-1' : 'bg-gray-50 border border-gray-100 p-0.5'}`}
      />
    );
  }

  return (
    <div
      className={`${SIZE_CLS[size]} rounded-xl flex items-center justify-center flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg,#5B3DF5,#2F80ED)' }}
    >
      <img src="/logo-agendix-dark.png" alt="Agendix" className="w-3/4 h-3/4 object-contain" />
    </div>
  );
}
