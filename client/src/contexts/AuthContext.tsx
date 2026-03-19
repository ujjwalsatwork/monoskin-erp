import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type Role = 'Super Admin' | 'Admin Ops' | 'Warehouse Manager' | 'Warehouse Staff' | 'Logistics Manager' | 'Finance Manager' | 'Finance Staff' | 'Sales Manager' | 'Medical Representative' | 'HR/Compliance' | 'Analytics Viewer';

export const roles: Role[] = [
  'Super Admin',
  'Admin Ops',
  'Warehouse Manager',
  'Warehouse Staff',
  'Logistics Manager',
  'Finance Manager',
  'Finance Staff',
  'Sales Manager',
  'Medical Representative',
  'HR/Compliance',
  'Analytics Viewer'
];

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rolePermissions: Record<Role, string[]> = {
  'Super Admin': ['*'],
  'Admin Ops': ['leads', 'doctors', 'pharmacies', 'orders', 'inventory', 'approvals', 'reports', 'settings'],
  'Warehouse Manager': ['inventory', 'warehouses', 'transfers', 'grn', 'shipments', 'approvals.warehouse'],
  'Warehouse Staff': ['inventory.view', 'warehouses.view', 'grn', 'picking', 'packing', 'dispatch'],
  'Logistics Manager': ['shipments', 'returns', 'logistics.dashboard'],
  'Finance Manager': ['invoices', 'payments', 'ar', 'reports.finance', 'approvals.finance'],
  'Finance Staff': ['invoices.view', 'payments', 'ar.view'],
  'Sales Manager': ['leads', 'doctors', 'orders', 'reports.sales'],
  'Medical Representative': ['leads.assigned', 'doctors.assigned', 'orders.create'],
  'HR/Compliance': ['employees', 'compliance', 'attendance'],
  'Analytics Viewer': ['reports', 'analytics', 'dashboards'],
};

async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const isAuthenticated = !!user;

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const permissions = rolePermissions[user.role] || [];
    if (permissions.includes('*')) return true;
    return permissions.some(p => permission.startsWith(p) || p.startsWith(permission));
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
    }
    queryClient.setQueryData(['/api/auth/me'], null);
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
  };

  return (
    <AuthContext.Provider value={{ 
      user: user || null, 
      isLoading,
      isAuthenticated,
      hasPermission,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
