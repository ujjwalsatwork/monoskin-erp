import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, User, Download, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { NotificationsDrawer } from '@/components/shared/NotificationsDrawer';
import { ExportCenter } from '@/components/shared/ExportCenter';

const breadcrumbMap: Record<string, string> = {
  '/': 'Dashboard',
  '/leads': 'Leads',
  '/doctors': 'Doctors',
  '/pharmacies': 'Pharmacies',
  '/orders': 'Orders',
  '/inventory': 'Inventory',
  '/warehouses': 'Warehouses',
  '/logistics': 'Logistics Dashboard',
  '/shipments': 'Shipments',
  '/finance': 'Finance',
  '/approvals': 'Approvals',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [exportCenterOpen, setExportCenterOpen] = useState(false);

  const getBreadcrumb = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length === 0) return ['Dashboard'];
    
    return segments.map((segment, index) => {
      const fullPath = '/' + segments.slice(0, index + 1).join('/');
      return breadcrumbMap[fullPath] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    });
  };

  const breadcrumbs = getBreadcrumb();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b bg-card px-4 md:px-6">
        {/* Left side - Menu button and Breadcrumbs */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumbs - hidden on mobile */}
          <nav className="hidden sm:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <span className="text-muted-foreground">/</span>}
                <span className={index === breadcrumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>

          {/* Mobile title */}
          <span className="sm:hidden font-medium text-foreground truncate max-w-[120px]">
            {breadcrumbs[breadcrumbs.length - 1]}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Global Search - full on desktop, icon on mobile */}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex w-64 justify-start text-muted-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Export Center */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExportCenterOpen(true)}
            className="hidden sm:flex"
          >
            <Download className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          </Button>

          {/* User Role Badge */}
          {isAuthenticated && user && (
            <Badge variant="secondary" className="hidden lg:flex font-mono text-xs">
              {user.role}
            </Badge>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.name?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-item-profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-item-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive" 
                    onClick={logout}
                    data-testid="button-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem 
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-login"
                >
                  <User className="mr-2 h-4 w-4" />
                  Sign in
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <NotificationsDrawer open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <ExportCenter open={exportCenterOpen} onOpenChange={setExportCenterOpen} />
    </>
  );
}
