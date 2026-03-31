import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin, isPortalUser } from '@/lib/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading, profileLoading } = useAuth();

  // 1. Wait for BOTH session AND profile to resolve — no redirects while loading
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // 2. No session → login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 3. Super Admin / Admin → always allowed, never check institution
  if (isAdmin(profile?.role)) {
    return <>{children}</>;
  }

  // 4. Regular users without an institution → pending approval
  if (!profile?.institution_uuid) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}
