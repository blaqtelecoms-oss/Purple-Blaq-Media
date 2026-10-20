import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
// Add page imports here
import Home from '@/pages/Home';
import Services from '@/pages/Services';
import Approach from '@/pages/Approach';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import AdminEnquiries from '@/pages/AdminEnquiries';
import CrmLayout from '@/components/crm/CrmLayout';
import CrmDashboard from '@/pages/admin/Dashboard';
import CrmClients from '@/pages/admin/Clients';
import CrmProjects from '@/pages/admin/Projects';
import CrmProjectDetail from '@/pages/admin/ProjectDetail';
import CrmTeam from '@/pages/admin/Team';
import CrmFinance from '@/pages/admin/Finance';
import CrmSupport from '@/pages/admin/Support';
import CrmMarketing from '@/pages/admin/Marketing';
import NotFound from '@/pages/NotFound';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Todos from '@/pages/Todos';

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    return <p className="p-6 text-red-700" role="alert">Could not verify your sign-in status: {authError}</p>;
  }

  // Render the main app
  return (
    <Routes>
      {/* Auth routes (owner login; not linked in the public menu) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/todos" element={<Todos />} />

      {/* Public marketing site wrapped in shared layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/approach" element={<Approach />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Admin enquiries */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login?returnTo=%2Fadmin%2Fenquiries" replace />} />}>
        <Route path="/admin/enquiries" element={<AdminEnquiries />} />
      </Route>

      {/* CRM — private admin shell with sidebar, no public header/footer */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login?returnTo=%2Fadmin" replace />} />}>
        <Route element={<CrmLayout />}>
          <Route path="/admin" element={<CrmDashboard />} />
          <Route path="/admin/clients" element={<CrmClients />} />
          <Route path="/admin/projects" element={<CrmProjects />} />
          <Route path="/admin/projects/:id" element={<CrmProjectDetail />} />
          <Route path="/admin/marketing" element={<CrmMarketing />} />
          <Route path="/admin/team" element={<CrmTeam />} />
          <Route path="/admin/finance" element={<CrmFinance />} />
          <Route path="/admin/support" element={<CrmSupport />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App