import {
  LayoutDashboard,
  Users,
  UserCheck,
  ShoppingCart,
  Package,
  Warehouse,
  Truck,
  Receipt,
  BarChart3,
  Shield,
  Settings,
  CheckSquare,
  Boxes,
  UserCog,
  Database,
  Link as LinkIcon,
  Briefcase,
  Target,
  FileText,
  LucideIcon,
} from 'lucide-react';

export interface RouteConfig {
  path: string;
  label: string;
  icon?: LucideIcon;
  parent?: string;
  permission?: string;
  component?: string;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: { label: string; href: string }[];
  permission?: string;
}

// Single source of truth for all routes
export const routes: RouteConfig[] = [
  // Dashboard
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, component: 'Dashboard' },
  
  // Approvals
  { path: '/approvals', label: 'Approvals', icon: CheckSquare, component: 'Approvals' },
  
  // Leads & CRM
  { path: '/leads', label: 'Leads List', parent: 'Leads & CRM', component: 'Leads' },
  { path: '/leads/dedupe', label: 'Dedupe Queue', parent: 'Leads & CRM', component: 'LeadsDedupe' },
  { path: '/leads/:id', label: 'Lead Detail', parent: 'Leads & CRM', component: 'LeadDetail' },
  
  // MR Management
  { path: '/mr', label: 'MR Directory', parent: 'MR Management', component: 'MRDirectory' },
  { path: '/mr/:id', label: 'MR Profile', parent: 'MR Management', component: 'MRProfile' },
  { path: '/mr/reports', label: 'Work Reports', parent: 'MR Management', component: 'MRWorkReports' },
  { path: '/mr/targets', label: 'Targets & Incentives', parent: 'MR Management', component: 'MRTargets' },
  
  // Doctors & Pharmacies
  { path: '/doctors', label: 'Doctors', parent: 'Doctors & Pharmacies', component: 'Doctors' },
  { path: '/doctors/:id', label: 'Doctor Detail', parent: 'Doctors & Pharmacies', component: 'DoctorDetail' },
  { path: '/pharmacies', label: 'Pharmacies', parent: 'Doctors & Pharmacies', component: 'Pharmacies' },
  { path: '/pharmacies/:id', label: 'Pharmacy Detail', parent: 'Doctors & Pharmacies', component: 'PharmacyDetail' },
  
  // Orders
  { path: '/orders', label: 'Orders List', parent: 'Orders', component: 'Orders' },
  { path: '/orders/create', label: 'Create Order', parent: 'Orders', component: 'OrderCreate' },
  { path: '/orders/exceptions', label: 'Exceptions', parent: 'Orders', component: 'OrderExceptions' },
  { path: '/orders/statements', label: 'Customer Statements', parent: 'Orders', component: 'CustomerStatements' },
  { path: '/orders/:id', label: 'Order Detail', parent: 'Orders', component: 'OrderDetail' },
  
  // Inventory
  { path: '/inventory', label: 'Inventory Master', parent: 'Inventory', component: 'Inventory' },
  { path: '/inventory/near-expiry', label: 'Near-Expiry', parent: 'Inventory', component: 'NearExpiry' },
  { path: '/inventory/movements', label: 'Stock Movements', parent: 'Inventory', component: 'StockMovements' },
  
  // Warehouses
  { path: '/warehouses', label: 'Warehouses List', parent: 'Warehouses', component: 'Warehouses' },
  { path: '/warehouses/grn', label: 'Inward (GRN)', parent: 'Warehouses', component: 'GRN' },
  { path: '/warehouses/transfers', label: 'Transfers', parent: 'Warehouses', component: 'Transfers' },
  { path: '/warehouses/ops', label: 'Warehouse Ops', parent: 'Warehouses', component: 'WarehouseOps' },
  
  // Products & Pricing
  { path: '/products', label: 'Products', parent: 'Products & Pricing', component: 'Products' },
  { path: '/products/pricing', label: 'Pricing Slabs', parent: 'Products & Pricing', component: 'PricingSlabs' },
  { path: '/products/schemes', label: 'Schemes', parent: 'Products & Pricing', component: 'Schemes' },
  { path: '/products/promo-codes', label: 'Promo Codes', parent: 'Products & Pricing', component: 'PromoCodes' },
  { path: '/products/clinic-codes', label: 'Clinic Codes', parent: 'Products & Pricing', component: 'ClinicCodes' },
  
  // Logistics
  { path: '/shipments', label: 'Shipments', parent: 'Logistics', component: 'Shipments' },
  { path: '/shipments/:id', label: 'Shipment Detail', parent: 'Logistics', component: 'ShipmentDetail' },
  { path: '/returns', label: 'Returns', parent: 'Logistics', component: 'Returns' },
  
  // Finance
  { path: '/finance', label: 'Dashboard', parent: 'Finance', component: 'Finance' },
  { path: '/finance/invoices', label: 'Invoices', parent: 'Finance', component: 'Invoices' },
  { path: '/finance/invoices/:id', label: 'Invoice Detail', parent: 'Finance', component: 'InvoiceDetail' },
  { path: '/finance/credit-notes', label: 'Credit Notes', parent: 'Finance', component: 'CreditNotes' },
  { path: '/finance/ar-ageing', label: 'AR Ageing', parent: 'Finance', component: 'ARAgeing' },
  { path: '/finance/receipts', label: 'Receipts', parent: 'Finance', component: 'Receipts' },
  { path: '/finance/gst', label: 'GST Reports', parent: 'Finance', component: 'GSTReports' },
  
  // HR & Compliance
  { path: '/hr/employees', label: 'Employees', parent: 'HR & Compliance', component: 'Employees' },
  { path: '/hr/attendance', label: 'Attendance', parent: 'HR & Compliance', component: 'Attendance' },
  { path: '/hr/leave', label: 'Leave Management', parent: 'HR & Compliance', component: 'LeaveManagement' },
  { path: '/hr/compliance', label: 'Compliance Vault', parent: 'HR & Compliance', component: 'Compliance' },
  
  // Reports & Analytics
  { path: '/reports', label: 'Reports Library', parent: 'Reports & Analytics', component: 'Reports' },
  { path: '/reports/custom', label: 'Custom Reports', parent: 'Reports & Analytics', component: 'CustomReports' },
  { path: '/reports/analytics', label: 'Sales Analytics', parent: 'Reports & Analytics', component: 'SalesAnalytics' },
  
  // Security
  { path: '/security/audit-logs', label: 'Audit Logs', parent: 'Security', component: 'AuditLogs' },
  { path: '/security/access-logs', label: 'Access Logs', parent: 'Security', component: 'AccessLogs' },
  { path: '/security/data-masking', label: 'Data Masking', parent: 'Security', component: 'DataMasking' },
  { path: '/security/export-controls', label: 'Export Controls', parent: 'Security', component: 'ExportControls' },
  
  // Master Data
  { path: '/master/users', label: 'Users & Roles', parent: 'Master Data', component: 'UsersRoles' },
  { path: '/master/territories', label: 'Territories', parent: 'Master Data', component: 'Territories' },
  { path: '/master/tax', label: 'Tax & HSN', parent: 'Master Data', component: 'TaxHSN' },
  { path: '/master/import-export', label: 'Import/Export', parent: 'Master Data', component: 'ImportExport' },
  
  // Other
  { path: '/integrations', label: 'Integrations', icon: LinkIcon, component: 'Integrations' },
  { path: '/settings', label: 'Settings', icon: Settings, component: 'Settings' },
];

// Navigation structure for sidebar
export const navigation: NavGroup[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Approvals', icon: CheckSquare, href: '/approvals' },
  {
    label: 'Leads & CRM',
    icon: Users,
    children: [
      { label: 'Leads List', href: '/leads' },
      { label: 'Dedupe Queue', href: '/leads/dedupe' },
    ],
  },
  {
    label: 'MR Management',
    icon: Briefcase,
    children: [
      { label: 'MR Directory', href: '/mr' },
      { label: 'Work Reports', href: '/mr/reports' },
      { label: 'Targets & Incentives', href: '/mr/targets' },
    ],
  },
  {
    label: 'Doctors & Pharmacies',
    icon: UserCheck,
    children: [
      { label: 'Doctors', href: '/doctors' },
      { label: 'Pharmacies', href: '/pharmacies' },
    ],
  },
  {
    label: 'Orders',
    icon: ShoppingCart,
    children: [
      { label: 'Orders List', href: '/orders' },
      { label: 'Create Order', href: '/orders/create' },
      { label: 'Exceptions', href: '/orders/exceptions' },
      { label: 'Customer Statements', href: '/orders/statements' },
    ],
  },
  {
    label: 'Inventory',
    icon: Package,
    children: [
      { label: 'Inventory Master', href: '/inventory' },
      { label: 'Near-Expiry', href: '/inventory/near-expiry' },
      { label: 'Stock Movements', href: '/inventory/movements' },
    ],
  },
  {
    label: 'Warehouses',
    icon: Warehouse,
    children: [
      { label: 'Warehouses List', href: '/warehouses' },
      { label: 'Inward (GRN)', href: '/warehouses/grn' },
      { label: 'Transfers', href: '/warehouses/transfers' },
      { label: 'Warehouse Ops', href: '/warehouses/ops' },
    ],
  },
  {
    label: 'Products & Pricing',
    icon: Boxes,
    children: [
      { label: 'Products', href: '/products' },
      { label: 'Pricing Slabs', href: '/products/pricing' },
      { label: 'Schemes', href: '/products/schemes' },
      { label: 'Promo Codes', href: '/products/promo-codes' },
      { label: 'Clinic Codes', href: '/products/clinic-codes' },
    ],
  },
  {
    label: 'Logistics',
    icon: Truck,
    children: [
      { label: 'Shipments', href: '/shipments' },
      { label: 'Returns', href: '/returns' },
    ],
  },
  {
    label: 'Finance',
    icon: Receipt,
    children: [
      { label: 'Dashboard', href: '/finance' },
      { label: 'Invoices', href: '/finance/invoices' },
      { label: 'Credit Notes', href: '/finance/credit-notes' },
      { label: 'AR Ageing', href: '/finance/ar-ageing' },
      { label: 'Receipts', href: '/finance/receipts' },
      { label: 'GST Reports', href: '/finance/gst' },
    ],
  },
  {
    label: 'HR & Compliance',
    icon: UserCog,
    children: [
      { label: 'Employees', href: '/hr/employees' },
      { label: 'Attendance', href: '/hr/attendance' },
      { label: 'Leave Management', href: '/hr/leave' },
      { label: 'Compliance Vault', href: '/hr/compliance' },
    ],
  },
  {
    label: 'Reports & Analytics',
    icon: BarChart3,
    children: [
      { label: 'Reports Library', href: '/reports' },
      { label: 'Custom Reports', href: '/reports/custom' },
      { label: 'Sales Analytics', href: '/reports/analytics' },
    ],
  },
  {
    label: 'Security',
    icon: Shield,
    children: [
      { label: 'Audit Logs', href: '/security/audit-logs' },
      { label: 'Access Logs', href: '/security/access-logs' },
      { label: 'Data Masking', href: '/security/data-masking' },
      { label: 'Export Controls', href: '/security/export-controls' },
    ],
  },
  {
    label: 'Master Data',
    icon: Database,
    children: [
      { label: 'Users & Roles', href: '/master/users' },
      { label: 'Territories', href: '/master/territories' },
      { label: 'Tax & HSN', href: '/master/tax' },
      { label: 'Import/Export', href: '/master/import-export' },
    ],
  },
  { label: 'Integrations', icon: LinkIcon, href: '/integrations' },
  { label: 'Settings', icon: Settings, href: '/settings' },
];

// Helper to get all paths for nav audit
export function getAllNavPaths(): string[] {
  const paths: string[] = [];
  navigation.forEach(item => {
    if (item.href) {
      paths.push(item.href);
    }
    if (item.children) {
      item.children.forEach(child => paths.push(child.href));
    }
  });
  return paths;
}

// Get route config by path
export function getRouteByPath(path: string): RouteConfig | undefined {
  return routes.find(r => r.path === path);
}

// Get breadcrumb trail for a path
export function getBreadcrumbs(path: string): { label: string; path: string }[] {
  const route = routes.find(r => r.path === path || r.path.replace(':id', '') === path.replace(/\/[^/]+$/, '/'));
  if (!route) return [];
  
  const breadcrumbs: { label: string; path: string }[] = [];
  
  if (route.parent) {
    const parentNav = navigation.find(n => n.label === route.parent);
    if (parentNav?.children?.[0]) {
      breadcrumbs.push({ label: route.parent, path: parentNav.children[0].href });
    }
  }
  
  breadcrumbs.push({ label: route.label, path: route.path });
  
  return breadcrumbs;
}
