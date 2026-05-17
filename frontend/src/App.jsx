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
import Fichas       from './pages/Fichas';
import Prontuarios  from './pages/Prontuarios';
import Anamnese     from './pages/Anamnese';
import Processos    from './pages/Processos';
import Orcamentos   from './pages/Orcamentos';
import Documentos   from './pages/Documentos';
import AgendaHoje              from './pages/AgendaHoje';
import CalendarioAgendamentos from './pages/CalendarioAgendamentos';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import Register       from './pages/Register';
import Ativar               from './pages/Ativar';
import TrialExpirado        from './pages/TrialExpirado';
import PagamentoRetorno     from './pages/PagamentoRetorno';
import AgendamentoPublico   from './pages/AgendamentoPublico';
import Termos               from './pages/Termos';
import Privacidade          from './pages/Privacidade';
import AdminLogin                  from './pages/admin/AdminLogin';
import AdminDashboard              from './pages/admin/AdminDashboard';
import AdminClientes               from './pages/admin/AdminClientes';
import AdminPerfil                 from './pages/admin/AdminPerfil';
import AdminDashboardFinanceiro    from './pages/admin/AdminDashboardFinanceiro';
import AdminFinanceiro             from './pages/admin/AdminFinanceiro';
import AdminFluxoCaixa             from './pages/admin/AdminFluxoCaixa';
import AdminBackups                from './pages/admin/AdminBackups';
import AdminConsumo                from './pages/admin/AdminConsumo';
import AdminLogs                   from './pages/admin/AdminLogs';
import AdminUsuarios               from './pages/admin/AdminUsuarios';
import AdminForgotPassword         from './pages/admin/AdminForgotPassword';

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
        <Route path="/admin/login"         element={<AdminLogin />} />
        <Route path="/admin/esqueci-senha" element={<AdminForgotPassword />} />
        <Route path="/trial-expirado"      element={<TrialExpirado />} />
        <Route path="/pagamento/retorno"   element={<PagamentoRetorno />} />
        <Route path="/agendar/:slug"       element={<AgendamentoPublico />} />
        <Route path="/termos"              element={<Termos />} />
        <Route path="/privacidade"         element={<Privacidade />} />

        {/* Rotas do tenant */}
        <Route path="/"             element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/leads"        element={<PrivateRoute><Leads /></PrivateRoute>} />
        <Route path="/agendamentos" element={<PrivateRoute><Agendamentos /></PrivateRoute>} />
        <Route path="/servicos"     element={<PrivateRoute roles={['admin','super_admin']}><Servicos /></PrivateRoute>} />
        <Route path="/usuarios"     element={<PrivateRoute roles={['admin','super_admin']}><Users /></PrivateRoute>} />
        <Route path="/configuracoes"element={<PrivateRoute roles={['admin','super_admin']}><Settings /></PrivateRoute>} />
        <Route path="/agenda-hoje"      element={<PrivateRoute><AgendaHoje /></PrivateRoute>} />
        <Route path="/calendario"       element={<PrivateRoute><CalendarioAgendamentos /></PrivateRoute>} />
        <Route path="/financeiro"   element={<PrivateRoute roles={['admin','super_admin']}><Financeiro /></PrivateRoute>} />
        <Route path="/fichas"       element={<PrivateRoute><Fichas /></PrivateRoute>} />
        <Route path="/prontuarios"  element={<PrivateRoute><Prontuarios /></PrivateRoute>} />
        <Route path="/anamnese"     element={<PrivateRoute><Anamnese /></PrivateRoute>} />
        <Route path="/processos"    element={<PrivateRoute><Processos /></PrivateRoute>} />
        <Route path="/orcamentos"   element={<PrivateRoute><Orcamentos /></PrivateRoute>} />
        <Route path="/documentos"   element={<PrivateRoute><Documentos /></PrivateRoute>} />

        {/* Rotas super admin */}
        <Route path="/admin"                        element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/clientes"               element={<AdminRoute><AdminClientes /></AdminRoute>} />
        <Route path="/admin/perfil"                 element={<AdminRoute><AdminPerfil /></AdminRoute>} />
        <Route path="/admin/financeiro"             element={<AdminRoute><AdminDashboardFinanceiro /></AdminRoute>} />
        <Route path="/admin/financeiro/lancamentos" element={<AdminRoute><AdminFinanceiro /></AdminRoute>} />
        <Route path="/admin/financeiro/fluxo-caixa" element={<AdminRoute><AdminFluxoCaixa /></AdminRoute>} />
        <Route path="/admin/backups" element={<AdminRoute><AdminBackups /></AdminRoute>} />
        <Route path="/admin/consumo" element={<AdminRoute><AdminConsumo /></AdminRoute>} />
        <Route path="/admin/logs"      element={<AdminRoute><AdminLogs /></AdminRoute>} />
        <Route path="/admin/usuarios"  element={<AdminRoute><AdminUsuarios /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  );
}
