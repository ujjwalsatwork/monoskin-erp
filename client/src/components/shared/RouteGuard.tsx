import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute, type FeatureGroup } from '@/lib/permissions';

interface RouteGuardProps {
  children: React.ReactNode;
  feature?: FeatureGroup;
}

export function RouteGuard({ children, feature }: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const userRole = user.role || 'Analytics Viewer';
  
  // Check either specific feature or route-based access
  const canAccess = feature 
    ? canAccessRoute(userRole, location.pathname) 
    : canAccessRoute(userRole, location.pathname);

  if (!canAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Higher-order component for protected routes
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  feature?: FeatureGroup
) {
  return function ProtectedRoute(props: P) {
    return (
      <RouteGuard feature={feature}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}
