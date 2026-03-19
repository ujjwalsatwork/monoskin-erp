export type UserRole = 
  | 'Super Admin'
  | 'Admin Ops'
  | 'Warehouse Manager'
  | 'Warehouse Staff'
  | 'Logistics Manager'
  | 'Finance Manager'
  | 'Finance Staff'
  | 'Sales Manager'
  | 'Medical Representative'
  | 'HR/Compliance'
  | 'Analytics Viewer';

export type FeatureGroup = 
  | 'dashboard'
  | 'approvals'
  | 'leads'
  | 'mr_management'
  | 'doctors_pharmacies'
  | 'orders'
  | 'inventory'
  | 'warehouses'
  | 'products'
  | 'logistics'
  | 'finance'
  | 'hr_compliance'
  | 'reports'
  | 'security'
  | 'master_data';

const ROLE_PERMISSIONS: Record<UserRole, FeatureGroup[]> = {
  'Super Admin': [
    'dashboard', 'approvals', 'leads', 'mr_management', 'doctors_pharmacies',
    'orders', 'inventory', 'warehouses', 'products', 'logistics',
    'finance', 'hr_compliance', 'reports', 'security', 'master_data'
  ],
  'Admin Ops': [
    'dashboard', 'approvals', 'leads', 'doctors_pharmacies', 'orders',
    'inventory', 'warehouses', 'products', 'logistics', 'finance',
    'reports', 'security', 'master_data'
  ],
  'Sales Manager': [
    'dashboard', 'approvals', 'leads', 'mr_management', 'doctors_pharmacies',
    'orders', 'products', 'reports'
  ],
  'Medical Representative': [
    'dashboard', 'leads', 'doctors_pharmacies', 'orders'
  ],
  'Warehouse Manager': [
    'dashboard', 'approvals', 'inventory', 'warehouses', 'logistics', 'reports'
  ],
  'Warehouse Staff': [
    'dashboard', 'inventory', 'warehouses'
  ],
  'Logistics Manager': [
    'dashboard', 'logistics', 'warehouses', 'orders', 'reports'
  ],
  'Finance Manager': [
    'dashboard', 'approvals', 'finance', 'orders', 'reports'
  ],
  'Finance Staff': [
    'dashboard', 'finance', 'orders'
  ],
  'HR/Compliance': [
    'dashboard', 'hr_compliance', 'security', 'reports'
  ],
  'Analytics Viewer': [
    'dashboard', 'reports'
  ]
};

export function hasPermission(role: UserRole | string, feature: FeatureGroup): boolean {
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  if (!permissions) return false;
  return permissions.includes(feature);
}

export function getPermittedFeatures(role: UserRole | string): FeatureGroup[] {
  return ROLE_PERMISSIONS[role as UserRole] || [];
}

export const ROUTE_FEATURE_MAP: Record<string, FeatureGroup> = {
  '/': 'dashboard',
  '/approvals': 'approvals',
  '/leads': 'leads',
  '/leads/dedupe': 'leads',
  '/mr': 'mr_management',
  '/mr/reports': 'mr_management',
  '/mr/targets': 'mr_management',
  '/doctors': 'doctors_pharmacies',
  '/pharmacies': 'doctors_pharmacies',
  '/orders': 'orders',
  '/orders/create': 'orders',
  '/orders/exceptions': 'orders',
  '/orders/statements': 'orders',
  '/inventory': 'inventory',
  '/inventory/near-expiry': 'inventory',
  '/inventory/movements': 'inventory',
  '/warehouses': 'warehouses',
  '/warehouses/grn': 'warehouses',
  '/warehouses/transfers': 'warehouses',
  '/warehouses/ops': 'warehouses',
  '/products': 'products',
  '/products/pricing': 'products',
  '/products/schemes': 'products',
  '/products/promo-codes': 'products',
  '/products/clinic-codes': 'products',
  '/logistics': 'logistics',
  '/shipments': 'logistics',
  '/returns': 'logistics',
  '/finance': 'finance',
  '/finance/invoices': 'finance',
  '/finance/credit-notes': 'finance',
  '/finance/ar-ageing': 'finance',
  '/finance/receipts': 'finance',
  '/finance/gst': 'finance',
  '/hr': 'hr_compliance',
  '/hr/employees': 'hr_compliance',
  '/hr/attendance': 'hr_compliance',
  '/hr/leave': 'hr_compliance',
  '/hr/compliance': 'hr_compliance',
  '/reports': 'reports',
  '/reports/custom': 'reports',
  '/reports/analytics': 'reports',
  '/security': 'security',
  '/security/audit-logs': 'security',
  '/security/access-logs': 'security',
  '/security/data-masking': 'security',
  '/security/export-controls': 'security',
  '/master': 'master_data',
  '/master/users': 'master_data',
  '/master/territories': 'master_data',
  '/master/tax': 'master_data',
  '/master/import-export': 'master_data',
  '/integrations': 'master_data',
  '/settings': 'master_data',
};

export function canAccessRoute(role: UserRole | string, path: string): boolean {
  // Check exact path first
  let feature = ROUTE_FEATURE_MAP[path];
  
  // Then try base path (for detail pages like /leads/123)
  if (!feature) {
    const basePath = path.split('/').slice(0, 2).join('/');
    feature = ROUTE_FEATURE_MAP[basePath];
  }
  
  // Try with prefix for nested paths like /finance/invoices/123
  if (!feature) {
    const prefix = '/' + path.split('/')[1];
    feature = ROUTE_FEATURE_MAP[prefix];
  }
  
  // Dashboard and special routes are accessible to all authenticated users
  if (!feature) {
    if (path === '/' || path === '/unauthorized') return true;
    // Deny access to unmapped routes by default
    return false;
  }
  
  return hasPermission(role, feature);
}

export const NAV_FEATURE_MAP: Record<string, FeatureGroup> = {
  'Dashboard': 'dashboard',
  'Approvals': 'approvals',
  'Leads & CRM': 'leads',
  'MR Management': 'mr_management',
  'Doctors & Pharmacies': 'doctors_pharmacies',
  'Orders': 'orders',
  'Inventory': 'inventory',
  'Warehouses': 'warehouses',
  'Products & Pricing': 'products',
  'Logistics': 'logistics',
  'Finance': 'finance',
  'HR & Compliance': 'hr_compliance',
  'Reports & Analytics': 'reports',
  'Security': 'security',
  'Master Data': 'master_data',
  'Settings': 'master_data',
};

export function canAccessNavItem(role: UserRole | string, navLabel: string): boolean {
  const feature = NAV_FEATURE_MAP[navLabel];
  if (!feature) return true;
  return hasPermission(role, feature);
}
