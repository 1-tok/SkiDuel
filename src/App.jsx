import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
// Add page imports here

// Sends unauthenticated visitors of /app to the login page.
const LoginRedirect = () => {
  const { navigateToLogin } = useAuth();
  useEffect(() => { navigateToLogin(); }, [navigateToLogin]);
  return null;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // The landing page is public; the app at /app requires authentication.
  const appElement = authError?.type === 'user_not_registered'
    ? <UserNotRegisteredError />
    : authError?.type === 'auth_required'
      ? <LoginRedirect />
      : <Dashboard />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={appElement} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App