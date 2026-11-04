import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';

export default function GoogleSignInButton({ onSuccess, onError, role }) {
  const { loginWithGoogle } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return <p className="google-signin-unavailable">Google sign-in is not configured yet.</p>;
  }

  const handleSuccess = async (response) => {
    if (!response.credential) {
      onError('Google did not return a sign-in credential. Please try again.');
      return;
    }
    try {
      const user = await loginWithGoogle(response.credential, role);
      onSuccess(user);
    } catch (error) {
      onError(error.message || 'Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="google-signin-button">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => onError('Google sign-in could not be completed. Please try again.')}
        text="signin_with"
        shape="rectangular"
        size="large"
        width="320"
        useOneTap={false}
      />
    </div>
  );
}
