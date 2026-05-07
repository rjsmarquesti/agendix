import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Leads        from './pages/Leads';
import Agendamentos from './pages/Agendamentos';
import Servicos     from './pages/Servicos';
import Users        from './pages/Users';
import Settings     from './pages/Settings';
import Financeiro   from './pages/Financeiro';
import AgendaHoje     from './pages/AgendaHoje';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import Register       from './pages/Register';
import Ativar         from './pages/Ativar';
import AdminLogin      from './pages/admin/AdminLogin';
import AdminDashboard  from './pages/admin/AdminDashboard';
import AdminClientes   from './pages/admin/AdminClientes';
import AdminPerfil     from './pages/admin/AdminPerfil';

function PrivateRoute({ children, roles }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/admin/login" replace />;
  if (user?.role !== 'super_admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login"           element={<Login />} />
        <Route path="/cadastro"        element={<Register />} />
        <Route path="/ativar"          element={<Ativar />} />
        <Route path="/esqueci-senha"   element={<ForgotPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/admin/login"     element={<AdminLogin />} />

        {/* Rotas do tenant */}
        <Route path="/"             element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/leads"        element={<PrivateRoute><Leads /></PrivateRoute>} />
        <Route path="/agendamentos" element={<PrivateRoute><Agendamentos /></PrivateRoute>} />
        <Route path="/servicos"     element={<PrivateRoute roles={['admin','super_admin']}><Servicos /></PrivateRoute>} />
        <Route path="/usuarios"     element={<PrivateRoute roles={['admin','super_admin']}><Users /></PrivateRoute>} />
        <Route path="/configuracoes"element={<PrivateRoute roles={['admin','super_admin']}><Settings /></PrivateRoute>} />
        <Route path="/agenda-hoje"  element={<PrivateRoute><AgendaHoje /></PrivateRoute>} />
        <Route path="/financeiro"   element={<PrivateRoute roles={['admin','super_admin']}><Financeiro /></PrivateRoute>} />

        {/* Rotas super admin */}
        <Route path="/admin"          element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/clientes" element={<AdminRoute><AdminClientes /></AdminRoute>} />
        <Route path="/admin/perfil"   element={<AdminRoute><AdminPerfil /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  );
}
