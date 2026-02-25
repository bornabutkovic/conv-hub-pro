import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Admins always pass through
  if (isAdmin(profile?.role)) {
    return <>{children}</>;
  }

  // Non-admin users without an institution are pending approval
  if (!profile?.institution_uuid) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}
