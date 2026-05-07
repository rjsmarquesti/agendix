import { useState, useEffect } from 'react';

const DEFAULT = { logo: null, nome: 'Agendix', corPrimaria: '#5B3DF5', loading: false };

export function useBrand(slugArg) {
  const [brand, setBrand] = useState(DEFAULT);

  useEffect(() => {
    const slug = slugArg
      || new URLSearchParams(window.location.search).get('slug')
      || localStorage.getItem('crm_slug')
      || '';

    if (!slug) { setBrand(DEFAULT); return; }

    let cancelled = false;
    const timer = setTimeout(() => {
      setBrand(b => ({ ...b, loading: true }));
      fetch(`/api/public/brand?slug=${encodeURIComponent(slug)}`)
        .then(r => r.json())
        .then(data => { if (!cancelled) setBrand({ ...data, loading: false }); })
        .catch(() => { if (!cancelled) setBrand({ ...DEFAULT, loading: false }); });
    }, slugArg ? 400 : 0); // debounce only when slug comes from user input

    return () => { cancelled = true; clearTimeout(timer); };
  }, [slugArg]);

  return brand;
}
