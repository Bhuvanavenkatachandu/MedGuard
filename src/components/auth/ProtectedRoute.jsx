import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePharmacy } from '../../context/PharmacyContext';

export const ProtectedRoute = ({ children }) => {
  const { user, profile, pharmacy, loading, isSetupComplete } = usePharmacy();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-mono">Verifying Supabase Session...</p>
        </div>
      </div>
    );
  }

  // If no authenticated user, redirect to login
  if (!user && !profile) {
    return <Navigate to="/pharmacist/login" state={{ from: location }} replace />;
  }

  // If authenticated but pharmacy setup is incomplete, redirect to pharmacy setup
  if (!isSetupComplete && location.pathname !== '/pharmacist/setup') {
    return <Navigate to="/pharmacist/setup" replace />;
  }

  return children;
};
