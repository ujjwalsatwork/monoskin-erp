import { Request, Response, NextFunction } from 'express';

type UserRole = 
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

type FeatureGroup = 
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

function hasPermission(role: UserRole, feature: FeatureGroup): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(feature);
}

const API_FEATURE_MAP: Record<string, FeatureGroup> = {
  '/api/leads': 'leads',
  '/api/mrs': 'mr_management',
  '/api/mr-visits': 'mr_management',
  '/api/mr-targets': 'mr_management',
  '/api/mr-attendance': 'mr_management',
  '/api/doctors': 'doctors_pharmacies',
  '/api/pharmacies': 'doctors_pharmacies',
  '/api/orders': 'orders',
  '/api/inventory': 'inventory',
  '/api/warehouses': 'warehouses',
  '/api/grns': 'warehouses',
  '/api/transfers': 'warehouses',
  '/api/picking-tasks': 'warehouses',
  '/api/packing-tasks': 'warehouses',
  '/api/dispatch-tasks': 'warehouses',
  '/api/products': 'products',
  '/api/pricing-slabs': 'products',
  '/api/schemes': 'products',
  '/api/promo-codes': 'products',
  '/api/clinic-codes': 'products',
  '/api/shipments': 'logistics',
  '/api/returns': 'logistics',
  '/api/invoices': 'finance',
  '/api/credit-notes': 'finance',
  '/api/receipts': 'finance',
  '/api/ar-ageing': 'finance',
  '/api/gst-reports': 'finance',
  '/api/employees': 'hr_compliance',
  '/api/hr-attendance': 'hr_compliance',
  '/api/compliance-items': 'hr_compliance',
  '/api/licenses': 'hr_compliance',
  '/api/audit-logs': 'security',
  '/api/access-logs': 'security',
  '/api/data-masking-rules': 'security',
  '/api/export-controls': 'security',
  '/api/users': 'master_data',
  '/api/territories-list': 'master_data',
  '/api/tax-hsn-codes': 'master_data',
  '/api/integrations': 'master_data',
  '/api/import-jobs': 'master_data',
  '/api/export-templates': 'master_data',
  '/api/settings': 'master_data',
  '/api/approvals': 'approvals',
  '/api/dashboard': 'dashboard',
  '/api/kpis': 'dashboard',
  '/api/report-templates': 'reports',
  '/api/saved-reports': 'reports',
  '/api/sales-analytics': 'reports',
  '/api/export-jobs': 'reports',
};

export function requireFeature(feature: FeatureGroup) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userRole = user.role as UserRole;
    
    if (!hasPermission(userRole, feature)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `Your role (${userRole}) does not have access to this feature`
      });
    }
    
    next();
  };
}

export function authorizeByPath(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  if (!user) {
    return next();
  }
  
  const userRole = user.role as UserRole;
  
  if (userRole === 'Super Admin') {
    return next();
  }
  
  const path = req.path;
  
  for (const [apiPath, feature] of Object.entries(API_FEATURE_MAP)) {
    if (path.startsWith(apiPath)) {
      if (!hasPermission(userRole, feature)) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `Your role (${userRole}) does not have access to this feature`
        });
      }
      break;
    }
  }
  
  next();
}
