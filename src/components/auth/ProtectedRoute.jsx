import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePharmacy } from '../../context/PharmacyContext';

export const ProtectedRoute = ({ children }) => {
  const { user, profile, loading, isAuthenticated, isEmailVerified, isSetupComplete } = usePharmacy();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-mono">Verifying Pharmacist Session...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated user -> must redirect to /pharmacist/login
  if (!isAuthenticated && !user && !profile) {
    return <Navigate to="/pharmacist/login" state={{ from: location }} replace />;
  }

  // 2. Authenticated but email NOT verified -> keep user on existing Login interface with resend option
  if (!isEmailVerified) {
    return <Navigate to="/pharmacist/login?unverified=true" replace />;
  }

  // 3. Authenticated + email verified + setup incomplete -> must redirect to /pharmacist/setup
  if (!isSetupComplete && location.pathname !== '/pharmacist/setup') {
    return <Navigate to="/pharmacist/setup" replace />;
  }

  // 4. Authenticated + email verified + setup completed -> if attempting to re-visit setup, redirect to dashboard
  if (isSetupComplete && location.pathname === '/pharmacist/setup') {
    return <Navigate to="/pharmacist/dashboard" replace />;
  }

  return children;
};
