import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, Truck, ArrowLeftRight, MapPin, Loader2, Phone, Mail, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/shared/PageHeader';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Warehouse, Inventory, Transfer, GRN } from '@shared/schema';

// Status options for warehouses
const warehouseStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Under Maintenance' },
];

// Indian states for dropdown
const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
];

export default function Warehouses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);

  const { data: warehouses = [], isLoading } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: inventory = [] } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
  });

  const { data: transfers = [] } = useQuery<Transfer[]>({
    queryKey: ['/api/transfers'],
  });

  const { data: grns = [] } = useQuery<GRN[]>({
    queryKey: ['/api/grns'],
  });

  // Create warehouse mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Warehouse>) => {
      const res = await apiRequest('POST', '/api/warehouses', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({ title: 'Warehouse Created', description: 'New warehouse has been added successfully' });
      setCreateDrawerOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create warehouse', variant: 'destructive' });
    },
  });

  // Dynamic form fields for creating warehouse
  const warehouseFormFields: FormField[] = useMemo(() => [
    { name: 'code', label: 'Warehouse Code', type: 'text', required: true, placeholder: 'e.g., MUM, DEL, BLR' },
    { name: 'name', label: 'Warehouse Name', type: 'text', required: true, placeholder: 'e.g., Mumbai Central WH' },
    { name: 'city', label: 'City', type: 'text', required: true, placeholder: 'e.g., Mumbai' },
    { 
      name: 'state', 
      label: 'State', 
      type: 'select', 
      required: true, 
      options: indianStates.map(s => ({ value: s, label: s }))
    },
    { name: 'pincode', label: 'Pincode', type: 'text', required: true, placeholder: '400001' },
    { name: 'address', label: 'Full Address', type: 'textarea', required: false, placeholder: 'Street address...' },
    { name: 'capacity', label: 'Capacity (units)', type: 'number', required: true, placeholder: '10000' },
    { name: 'phone', label: 'Contact Phone', type: 'tel', required: false, placeholder: '+91 98765 43210' },
    { name: 'email', label: 'Contact Email', type: 'email', required: false, placeholder: 'warehouse@monoskin.in' },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      required: true, 
      options: warehouseStatusOptions,
      defaultValue: 'active'
    },
  ], []);

  const handleCreateWarehouse = (data: Record<string, unknown>) => {
    const isActive = data.status === 'active';
    createMutation.mutate({
      code: data.code as string,
      name: data.name as string,
      city: data.city as string,
      state: data.state as string,
      pincode: data.pincode as string,
      address: data.address as string || '',
      capacity: Number(data.capacity) || 10000,
      phone: data.phone as string || null,
      email: data.email as string || null,
      isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredWarehouses = warehouses.filter(wh => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        wh.name.toLowerCase().includes(query) ||
        wh.city.toLowerCase().includes(query) ||
        wh.code.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getWarehouseStats = (warehouse: Warehouse) => {
    const whInventory = inventory.filter(inv => inv.warehouseId === warehouse.id);
    const totalStock = whInventory.reduce((sum, inv) => sum + inv.total, 0);
    const available = whInventory.reduce((sum, inv) => sum + inv.available, 0);
    const pendingGRNs = grns.filter(g => g.warehouseId === warehouse.id && g.status === 'Pending Verification').length;
    const pendingTransfers = transfers.filter(
      t => (t.fromWarehouseId === warehouse.id || t.toWarehouseId === warehouse.id) && t.status !== 'Completed'
    ).length;
    // Calculate utilization percentage
    const capacity = warehouse.capacity || 10000;
    const utilization = Math.min(Math.round((totalStock / capacity) * 100), 100);
    return { totalStock, available, pendingGRNs, pendingTransfers, batches: whInventory.length, utilization, capacity };
  };

  // Get status info for a warehouse
  const getWarehouseStatus = (warehouse: Warehouse) => {
    // Simulate maintenance status for demo (warehouse id 2 is under maintenance)
    if (warehouse.id === 2) {
      return { status: 'maintenance', label: 'Under Maintenance', variant: 'outline' as const, icon: Wrench };
    }
    if (!warehouse.isActive) {
      return { status: 'inactive', label: 'Inactive', variant: 'secondary' as const, icon: AlertTriangle };
    }
    return { status: 'active', label: 'Active', variant: 'default' as const, icon: CheckCircle };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Warehouses"
        description="Manage warehouse locations and stock"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/warehouses/grn')} className="text-sm">
              <Package className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Inward</span> GRN
            </Button>
            <Button variant="outline" onClick={() => navigate('/warehouses/transfers')} className="text-sm">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Transfers
            </Button>
            <Button className="text-sm" onClick={() => setCreateDrawerOpen(true)} data-testid="button-add-warehouse">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add</span> Warehouse
            </Button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search warehouses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Warehouse Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWarehouses.map((warehouse) => {
          const stats = getWarehouseStats(warehouse);
          const statusInfo = getWarehouseStatus(warehouse);
          const StatusIcon = statusInfo.icon;
          
          return (
            <Card
              key={warehouse.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/warehouses/${warehouse.id}`)}
              data-testid={`warehouse-card-${warehouse.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-display">{warehouse.name}</CardTitle>
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{warehouse.city}, {warehouse.state}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="secondary" className="font-mono">
                      {warehouse.code}
                    </Badge>
                    <Badge 
                      variant={statusInfo.variant} 
                      className={`text-xs ${statusInfo.status === 'maintenance' ? 'text-yellow-600 border-yellow-500' : ''}`}
                      data-testid={`status-badge-${warehouse.id}`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Utilization Progress Bar */}
                <div data-testid={`utilization-${warehouse.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">Utilization</p>
                    <span className={`text-xs font-mono font-medium ${
                      stats.utilization >= 90 ? 'text-destructive' : 
                      stats.utilization >= 70 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {stats.utilization}%
                    </span>
                  </div>
                  <Progress 
                    value={stats.utilization} 
                    className={`h-2 ${
                      stats.utilization >= 90 ? '[&>div]:bg-destructive' : 
                      stats.utilization >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
                    }`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.totalStock.toLocaleString()} / {stats.capacity.toLocaleString()} units
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Stock</p>
                    <p className="text-lg font-display font-semibold">{stats.totalStock.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="text-lg font-display font-semibold">{stats.available.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Batches</p>
                    <p className="text-lg font-mono">{stats.batches}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Capacity</p>
                    <p className="text-lg font-mono">{stats.capacity.toLocaleString()}</p>
                  </div>
                </div>

                {/* Alerts */}
                {(stats.pendingGRNs > 0 || stats.pendingTransfers > 0) && (
                  <div className="pt-3 border-t flex flex-wrap gap-2">
                    {stats.pendingGRNs > 0 && (
                      <Badge variant="outline" className="text-warning border-warning">
                        {stats.pendingGRNs} pending GRN
                      </Badge>
                    )}
                    {stats.pendingTransfers > 0 && (
                      <Badge variant="outline" className="text-accent border-accent">
                        {stats.pendingTransfers} pending transfer
                      </Badge>
                    )}
                  </div>
                )}

                {/* Contact Details */}
                <div className="pt-3 border-t space-y-2" data-testid={`contact-${warehouse.id}`}>
                  <p className="text-xs font-medium text-muted-foreground">Contact Details</p>
                  {warehouse.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{warehouse.phone}</span>
                    </div>
                  )}
                  {warehouse.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{warehouse.email}</span>
                    </div>
                  )}
                  {!warehouse.phone && !warehouse.email && (
                    <p className="text-xs text-muted-foreground italic">No contact info available</p>
                  )}
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">Manager</p>
                  <p className="text-sm font-medium">{warehouse.managerId ? `Manager #${warehouse.managerId}` : 'Not Assigned'}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Warehouse Drawer */}
      <CreateEditDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Add New Warehouse"
        fields={warehouseFormFields}
        onSubmit={handleCreateWarehouse}
        submitLabel="Create Warehouse"
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
