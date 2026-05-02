import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('crm_token'));
  const [user, setUser]   = useState(() => { try { return JSON.parse(localStorage.getItem('crm_user')); } catch { return null; } });
  const [tenant, setTenant] = useState(() => { try { return JSON.parse(localStorage.getItem('crm_tenant')); } catch { return null; } });

  // Aplica tema do tenant via CSS variables
  useEffect(() => {
    if (tenant?.corPrimaria) {
      document.documentElement.style.setProperty('--cor-primaria', tenant.corPrimaria);
    }
  }, [tenant]);

  function login(data) {
    localStorage.setItem('crm_token', data.token);
    localStorage.setItem('crm_user', JSON.stringify(data.user));
    localStorage.setItem('crm_tenant', JSON.stringify(data.tenant));
    setToken(data.token);
    setUser(data.user);
    setTenant(data.tenant);
  }

  function logout() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_tenant');
    setToken(null);
    setUser(null);
    setTenant(null);
  }

  function updateTenant(t) {
    localStorage.setItem('crm_tenant', JSON.stringify(t));
    setTenant(t);
  }

  return (
    <AuthContext.Provider value={{ token, user, tenant, login, logout, updateTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
