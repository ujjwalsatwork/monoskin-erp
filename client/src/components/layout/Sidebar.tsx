import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { canAccessNavItem, canAccessRoute } from '@/lib/permissions';
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
  ChevronDown,
  ChevronRight,
  Boxes,
  UserCog,
  Database,
  Link as LinkIcon,
  Briefcase,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import monoskinLogo from '@/assets/monoskin-logo.png';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: { label: string; href: string }[];
  permission?: string;
}

interface SidebarProps {
  onClose?: () => void;
}

const navigation: NavItem[] = [
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
      { label: 'Dashboard', href: '/logistics' },
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
      { label: 'Employee Lifecycle', href: '/hr/lifecycle' },
      { label: 'Payroll', href: '/hr/payroll' },
      { label: 'Holiday Calendar', href: '/hr/holiday-calendar' },
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

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Leads & CRM', 'Orders']);

  const userRole = user?.role || 'Analytics Viewer';
  
  const filteredNavigation = useMemo(() => {
    return navigation.filter(item => canAccessNavItem(userRole, item.label));
  }, [userRole]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isChildActive = (children?: { href: string }[]) =>
    children?.some(child => location.pathname === child.href);

  return (
    <aside className="h-screen w-64 bg-sidebar border-r border-sidebar-border overflow-hidden flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between h-20 px-6 border-b border-sidebar-border">
        <img src={monoskinLogo} alt="Monoskin" className="h-10 w-auto" />
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => (
            <li key={item.label}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted transition-all duration-200',
                      isChildActive(item.children) && 'text-sidebar-primary-foreground bg-sidebar-primary font-medium shadow-primary'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </span>
                    {expandedItems.includes(item.label) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedItems.includes(item.label) && (
                    <ul className="mt-1 ml-4 space-y-0.5 border-l-2 border-sidebar-border pl-3">
                      {item.children
                        .filter(child => canAccessRoute(userRole, child.href))
                        .map((child) => (
                        <li key={child.href}>
                          <NavLink
                            to={child.href}
                            onClick={onClose}
                            className={cn(
                              'block py-2 px-3 text-sm rounded-lg transition-all duration-200',
                              'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted',
                              isActive(child.href) && 'text-sidebar-primary-foreground font-medium bg-sidebar-primary shadow-primary'
                            )}
                          >
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <NavLink
                  to={item.href!}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted transition-all duration-200',
                    isActive(item.href!) && 'text-sidebar-primary-foreground font-medium bg-sidebar-primary shadow-primary'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/50 text-center">
          © 2026 Monoskin
        </p>
      </div>
    </aside>
  );
}
