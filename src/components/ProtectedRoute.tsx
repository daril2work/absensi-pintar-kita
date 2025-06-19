
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'admin' | 'user';
}

export const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (requireRole && profile?.role !== requireRole) {
    return <Navigate to={profile?.role === 'admin' ? '/admin' : '/dashboard'} />;
  }

  return <>{children}</>;
};
