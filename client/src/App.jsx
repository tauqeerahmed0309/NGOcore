import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import AppRoutes from './routes/AppRoutes';
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function App() {
  const appContent = (
    <AppShell>
      <AppRoutes />
    </AppShell>
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
