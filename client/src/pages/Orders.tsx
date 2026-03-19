import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Eye, Edit, XCircle, Loader2, AlertTriangle, Truck, CheckCircle, Calendar, Filter, X, User, Building2, Map, MapPin, List, DollarSign, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportModal } from '@/components/shared/ExportModal';
import { EntityDetailDrawer } from '@/components/shared/EntityDetailDrawer';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Pharmacy, User as UserType } from '@shared/schema';

interface Order {
  id: number;
  orderNumber: string;
  doctorId: number | null;
  pharmacyId: number | null;
  warehouseId: number;
  mrId: number | null;
  status: string;
  subtotal: string;
  total: string;
  createdAt: string;
  deliveredAt: string | null;
}

interface Doctor {
  id: number;
  name: string;
  clinic: string;
  city: string;
  state?: string;
  latitude?: string | null;
  longitude?: string | null;
}

interface Warehouse {
  id: number;
  name: string;
  code: string;
  city: string;
}

const exportColumns = [
  { key: 'id', label: 'Order ID' },
  { key: 'doctorName', label: 'Doctor' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'items', label: 'Items' },
  { key: 'total', label: 'Total' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
];

export default function Orders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [mrFilter, setMrFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'map'>('list');

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: pharmacies = [] } = useQuery<Pharmacy[]>({
    queryKey: ['/api/pharmacies'],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });

  const mrUsers = users.filter((u: UserType) => u.role === 'Medical Representative' || u.role === 'Sales Manager');

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PATCH', `/api/orders/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/kpis'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update order status.', variant: 'destructive' });
    },
  });

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (warehouseFilter !== 'all' && order.warehouseId.toString() !== warehouseFilter) return false;
      if (mrFilter !== 'all' && order.mrId?.toString() !== mrFilter) return false;
      
      if (customerFilter !== 'all') {
        const [type, id] = customerFilter.split('-');
        if (type === 'doctor' && order.doctorId?.toString() !== id) return false;
        if (type === 'pharmacy' && order.pharmacyId?.toString() !== id) return false;
      }
      
      if (dateFrom) {
        const orderDate = new Date(order.createdAt);
        const fromDate = new Date(dateFrom);
        if (orderDate < fromDate) return false;
      }
      
      if (dateTo) {
        const orderDate = new Date(order.createdAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59);
        if (orderDate > toDate) return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const doctor = doctors.find((d: Doctor) => d.id === order.doctorId);
        const pharmacy = pharmacies.find((p: Pharmacy) => p.id === order.pharmacyId);
        return (
          order.orderNumber.toLowerCase().includes(query) ||
          doctor?.name.toLowerCase().includes(query) ||
          pharmacy?.name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [orders, statusFilter, warehouseFilter, mrFilter, customerFilter, dateFrom, dateTo, searchQuery, doctors, pharmacies]);

  const orderStats = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const ordersWithExceptions = orders.filter((o: Order) => 
      ['Failed', 'Cancelled', 'Pending Approval'].includes(o.status)
    ).length;
    
    const deliveredThisMonth = orders.filter((o: Order) => {
      if (o.status !== 'Delivered' || !o.deliveredAt) return false;
      return new Date(o.deliveredAt) >= thisMonth;
    }).length;
    
    const currentlyDelivering = orders.filter((o: Order) => 
      o.status === 'Dispatched' || o.status === 'In Transit'
    ).length;
    
    const totalValue = orders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
    const pendingOrders = orders.filter((o: Order) => o.status === 'Pending Approval').length;
    const inProgressOrders = orders.filter((o: Order) => ['Picking', 'Packed', 'Dispatched'].includes(o.status)).length;
    
    return {
      ordersWithExceptions,
      deliveredThisMonth,
      currentlyDelivering,
      totalValue,
      pendingOrders,
      inProgressOrders,
    };
  }, [orders]);

  // Compute orders with geographic data for map view
  const ordersWithCoords = useMemo(() => {
    return filteredOrders.map(order => {
      let lat: number | null = null;
      let lng: number | null = null;
      let locationName = '';
      let locationType: 'doctor' | 'pharmacy' | 'unknown' = 'unknown';
      let city = '';
      let state = '';

      if (order.doctorId) {
        const doctor = doctors.find(d => d.id === order.doctorId);
        if (doctor) {
          lat = doctor.latitude ? parseFloat(doctor.latitude) : null;
          lng = doctor.longitude ? parseFloat(doctor.longitude) : null;
          locationName = doctor.name;
          locationType = 'doctor';
          city = doctor.city || '';
          state = doctor.state || '';
        }
      } else if (order.pharmacyId) {
        const pharmacy = pharmacies.find(p => p.id === order.pharmacyId);
        if (pharmacy) {
          lat = pharmacy.latitude ? parseFloat(String(pharmacy.latitude)) : null;
          lng = pharmacy.longitude ? parseFloat(String(pharmacy.longitude)) : null;
          locationName = pharmacy.name;
          locationType = 'pharmacy';
          city = pharmacy.city || '';
          state = pharmacy.state || '';
        }
      }

      return {
        ...order,
        lat,
        lng,
        locationName,
        locationType,
        city,
        state,
        hasCoords: lat !== null && lng !== null,
      };
    });
  }, [filteredOrders, doctors, pharmacies]);

  const ordersWithValidCoords = ordersWithCoords.filter(o => o.hasCoords);
  
  // Group orders by city for map visualization
  const ordersByCity = useMemo(() => {
    const cityMap: Record<string, { 
      city: string; 
      state: string;
      orders: typeof ordersWithCoords;
      totalValue: number;
      orderCount: number;
    }> = {};
    
    ordersWithCoords.forEach(order => {
      if (!order.city) return;
      
      if (!cityMap[order.city]) {
        cityMap[order.city] = {
          city: order.city,
          state: order.state,
          orders: [],
          totalValue: 0,
          orderCount: 0,
        };
      }
      cityMap[order.city].orders.push(order);
      cityMap[order.city].totalValue += parseFloat(order.total || '0');
      cityMap[order.city].orderCount++;
    });
    
    return Object.values(cityMap).sort((a, b) => b.totalValue - a.totalValue);
  }, [ordersWithCoords]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (warehouseFilter !== 'all') count++;
    if (customerFilter !== 'all') count++;
    if (mrFilter !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [statusFilter, warehouseFilter, customerFilter, mrFilter, dateFrom, dateTo]);

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const clearAllFilters = () => {
    setStatusFilter('all');
    setWarehouseFilter('all');
    setCustomerFilter('all');
    setMrFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const statuses = ['Draft', 'Pending Approval', 'Approved', 'Picking', 'Packed', 'Dispatched', 'In Transit', 'Delivered', 'Cancelled', 'On Hold'];

  const handleCancelOrder = (reason?: string) => {
    if (cancellingOrder) {
      updateStatusMutation.mutate({ id: cancellingOrder.id, status: 'Cancelled' });
      toast({ title: 'Order Cancelled', description: `Order ${cancellingOrder.orderNumber} has been cancelled.` });
      setCancelDialogOpen(false);
      setCancellingOrder(null);
    }
  };

  const handleStatusChange = (order: Order, newStatus: string) => {
    updateStatusMutation.mutate({ id: order.id, status: newStatus });
    toast({ title: 'Status Updated', description: `Order ${order.id} status changed to ${newStatus}.` });
  };

  const columns = [
    {
      key: 'id',
      header: 'Order ID',
      render: (item: any) => (
        <span className="font-mono text-sm font-medium">{item.id}</span>
      ),
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (item: any) => {
        const doctor = doctors.find(d => d.id === item.doctorId);
        return (
          <div>
            <p className="font-medium">{doctor?.name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{doctor?.city}</p>
          </div>
        );
      },
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (item: any) => {
        const warehouse = warehouses.find(w => w.id === item.warehouseId);
        return <span className="text-sm">{warehouse?.name || 'Unknown'}</span>;
      },
    },
    {
      key: 'items',
      header: 'Items',
      render: (item: any) => (
        <span className="text-sm">{item.items}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: any) => (
        <span className="font-mono font-medium">{formatCurrency(item.total)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => <StatusPill status={item.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (item: any) => (
        <span className="text-sm text-muted-foreground">{item.createdAt}</span>
      ),
    },
  ];

  const rowActions = [
    {
      label: 'View Details',
      onClick: (item: any) => {
        setSelectedOrder(item);
        setDetailDrawerOpen(true);
      },
    },
    {
      label: 'Track Shipment',
      onClick: (item: any) => navigate(`/shipments?order=${item.id}`),
    },
    {
      label: 'View Invoice',
      onClick: (item: any) => navigate(`/finance/invoices?order=${item.id}`),
    },
    {
      label: 'Mark as Picking',
      onClick: (item: any) => handleStatusChange(item, 'Picking'),
    },
    {
      label: 'Mark as Packed',
      onClick: (item: any) => handleStatusChange(item, 'Packed'),
    },
    {
      label: 'Cancel Order',
      onClick: (item: any) => {
        setCancellingOrder(item);
        setCancelDialogOpen(true);
      },
      destructive: true,
    },
  ];

  const selectedDoctor = selectedOrder ? doctors.find((d: Doctor) => d.id === selectedOrder.doctorId) : null;
  const selectedPharmacy = selectedOrder ? pharmacies.find((p: Pharmacy) => p.id === selectedOrder.pharmacyId) : null;
  const selectedWarehouse = selectedOrder ? warehouses.find((w: Warehouse) => w.id === selectedOrder.warehouseId) : null;
  
  const getCustomerName = (order: Order) => {
    if (order.doctorId) {
      const doc = doctors.find((d: Doctor) => d.id === order.doctorId);
      return { name: doc?.name || 'Unknown', type: 'doctor' };
    }
    if (order.pharmacyId) {
      const ph = pharmacies.find((p: Pharmacy) => p.id === order.pharmacyId);
      return { name: ph?.name || 'Unknown', type: 'pharmacy' };
    }
    return { name: 'Unknown', type: 'unknown' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Orders"
        description="View and manage customer orders"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExportModalOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => navigate('/orders/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Orders"
          value={orders.length}
          icon={<CheckCircle className="h-5 w-5" />}
          data-testid="stat-total-orders"
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(orderStats.totalValue)}
          icon={<Download className="h-5 w-5" />}
          data-testid="stat-total-value"
        />
        <StatCard
          title="Exceptions"
          value={orderStats.ordersWithExceptions}
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          subtitle="Requires attention"
          data-testid="stat-exceptions"
        />
        <StatCard
          title="Delivered This Month"
          value={orderStats.deliveredThisMonth}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          data-testid="stat-delivered-month"
        />
        <StatCard
          title="Currently Delivering"
          value={orderStats.currentlyDelivering}
          icon={<Truck className="h-5 w-5 text-blue-600" />}
          subtitle="In transit"
          data-testid="stat-delivering"
        />
        <StatCard
          title="Pending Approval"
          value={orderStats.pendingOrders}
          icon={<Calendar className="h-5 w-5 text-amber-600" />}
          data-testid="stat-pending"
        />
      </div>

      {/* View Toggle */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'list' | 'map')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" data-testid="tab-list-view">
            <List className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="map" data-testid="tab-map-view">
            <Map className="h-4 w-4 mr-2" />
            Map View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders, customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-orders"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-status">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-warehouse">
                      <SelectValue placeholder="All Warehouses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Warehouses</SelectItem>
                      {warehouses.map((wh: Warehouse) => (
                        <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="flex items-center gap-2"
                    data-testid="button-advanced-filters"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-1">{activeFiltersCount}</Badge>
                    )}
                  </Button>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} data-testid="button-clear-filters">
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>

                {showAdvancedFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Customer</Label>
                      <Select value={customerFilter} onValueChange={setCustomerFilter}>
                        <SelectTrigger data-testid="select-customer-filter">
                          <SelectValue placeholder="All Customers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Customers</SelectItem>
                          {doctors.map((d: Doctor) => (
                            <SelectItem key={`doctor-${d.id}`} value={`doctor-${d.id}`}>
                              <span className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                {d.name}
                              </span>
                            </SelectItem>
                          ))}
                          {pharmacies.map((p: Pharmacy) => (
                            <SelectItem key={`pharmacy-${p.id}`} value={`pharmacy-${p.id}`}>
                              <span className="flex items-center gap-2">
                                <Building2 className="h-3 w-3" />
                                {p.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">MR Assigned</Label>
                      <Select value={mrFilter} onValueChange={setMrFilter}>
                        <SelectTrigger data-testid="select-mr-filter">
                          <SelectValue placeholder="All MRs" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All MRs</SelectItem>
                          {mrUsers.map((u: UserType) => (
                            <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">From Date</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        data-testid="input-date-from"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">To Date</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        data-testid="input-date-to"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <DataTable
            data={filteredOrders}
            columns={columns}
            rowActions={rowActions}
            onRowClick={(item) => navigate(`/orders/${item.id}`)}
            emptyMessage="No orders found"
          />
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          {/* Map View Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Geographic Order Distribution
                  </CardTitle>
                  <CardDescription>
                    Visualize orders by delivery location to understand concentration and exposure
                  </CardDescription>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">Doctor Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">Pharmacy Orders</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Map Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold" data-testid="map-stat-total">{filteredOrders.length}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold" data-testid="map-stat-cities">{ordersByCity.length}</p>
                  <p className="text-xs text-muted-foreground">Cities</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold" data-testid="map-stat-with-coords">{ordersWithValidCoords.length}</p>
                  <p className="text-xs text-muted-foreground">With Coordinates</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold" data-testid="map-stat-value">{formatCurrency(filteredOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0))}</p>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed mb-6">
                <div className="text-center space-y-4">
                  <Map className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Google Maps Integration Ready</p>
                    <p className="text-sm text-muted-foreground">
                      {ordersWithValidCoords.length} orders have coordinates configured
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      To enable the interactive map, add Google Maps API key
                    </p>
                  </div>
                </div>
              </div>

              {/* City-based Order Distribution */}
              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Order Distribution by City
                </h3>
                {ordersByCity.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ordersByCity.slice(0, 12).map((cityData) => (
                      <Card 
                        key={cityData.city} 
                        className="hover-elevate cursor-pointer"
                        onClick={() => {
                          setSearchQuery(cityData.city);
                          setActiveView('list');
                        }}
                        data-testid={`map-city-${cityData.city.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{cityData.city}</p>
                              <p className="text-xs text-muted-foreground">{cityData.state}</p>
                            </div>
                            <Badge variant="secondary">{cityData.orderCount} orders</Badge>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              <span>{formatCurrency(cityData.totalValue)}</span>
                            </div>
                            <div className="flex gap-1">
                              {cityData.orders.slice(0, 3).map((o, i) => (
                                <div 
                                  key={o.id}
                                  className={`h-2 w-2 rounded-full ${o.locationType === 'doctor' ? 'bg-blue-500' : 'bg-green-500'}`}
                                  title={o.locationName}
                                />
                              ))}
                              {cityData.orders.length > 3 && (
                                <span className="text-xs text-muted-foreground ml-1">+{cityData.orders.length - 3}</span>
                              )}
                            </div>
                          </div>
                          {/* Status breakdown */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {['Pending Approval', 'Dispatched', 'Delivered'].map(status => {
                              const count = cityData.orders.filter(o => o.status === status).length;
                              if (count === 0) return null;
                              return (
                                <Badge key={status} variant="outline" className="text-xs">
                                  {status.split(' ')[0]}: {count}
                                </Badge>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No orders with location data</p>
                    <p className="text-sm">Orders will appear here when they have associated customer locations</p>
                  </div>
                )}
                {ordersByCity.length > 12 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={() => setActiveView('list')} data-testid="button-view-all-cities">
                      View All {ordersByCity.length} Cities
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Orders with Coordinates List */}
          {ordersWithValidCoords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Orders with Coordinates ({ordersWithValidCoords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {ordersWithValidCoords.slice(0, 20).map((order) => (
                    <div 
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                      data-testid={`map-order-${order.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${order.locationType === 'doctor' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                          {order.locationType === 'doctor' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{order.locationName}</p>
                          <p className="text-xs text-muted-foreground">{order.city}, {order.state}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-medium">{formatCurrency(order.total)}</p>
                        <StatusPill status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Order"
        description={`Are you sure you want to cancel order "${cancellingOrder?.id}"? This action cannot be undone.`}
        requireReason
        reasonLabel="Reason for cancellation"
        confirmLabel="Cancel Order"
        destructive
        onConfirm={handleCancelOrder}
      />

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityName="Orders"
        columns={exportColumns}
        totalRecords={filteredOrders.length}
      />

      {/* Order Detail Drawer */}
      <EntityDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOrder(null);
        }}
        title={selectedDoctor?.name || 'Order Details'}
        entityId={String(selectedOrder?.id || '')}
        status={selectedOrder?.status}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/orders/${selectedOrder?.id}`)}>
              <Edit className="h-4 w-4 mr-1" />
              View / Edit
            </Button>
          </div>
        }
        timeline={[
          { id: '1', type: 'status', title: 'Order Created', description: 'Order placed by admin', user: 'admin@monoskin.in', timestamp: selectedOrder?.createdAt || '' },
          { id: '2', type: 'action', title: 'Status Updated', description: `Status: ${selectedOrder?.status}`, user: 'system', timestamp: new Date().toISOString() },
        ]}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Doctor</p>
              <p className="font-medium">{selectedDoctor?.name}</p>
              <p className="text-xs text-muted-foreground">{selectedDoctor?.clinic}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Warehouse</p>
              <p className="font-medium">{selectedWarehouse?.name}</p>
              <p className="text-xs text-muted-foreground">{selectedWarehouse?.city}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-mono font-medium text-lg">{formatCurrency(selectedOrder?.total || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{selectedOrder?.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{selectedOrder?.createdAt}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivered</p>
              <p className="font-medium">{selectedOrder?.deliveredAt || '—'}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/shipments?order=${selectedOrder?.id}`)}>
                Track Shipment
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/finance/invoices?order=${selectedOrder?.id}`)}>
                View Invoice
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setCancellingOrder(selectedOrder);
                  setCancelDialogOpen(true);
                }}
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </EntityDetailDrawer>
    </div>
  );
}
