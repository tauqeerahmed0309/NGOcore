import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import AppRoutes from './routes/AppRoutes';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ErrorBoundary from './components/common/ErrorBoundary';

export default function App() {
  const appContent = (
    <ErrorBoundary>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </ErrorBoundary>
  );

  return (
    <AuthProvider>
      {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          {appContent}
        </GoogleOAuthProvider>
      ) : appContent}
    </AuthProvider>
  );
}
