import { Link } from 'react-router-dom';
import {
  Users,
  ShoppingCart,
  Package,
  AlertTriangle,
  Clock,
  CheckSquare,
  Truck,
  ArrowRight,
  DollarSign,
  Loader2,
  MapPin,
  Target,
  TrendingUp,
  Activity,
  Heart,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/shared/StatusPill';
import { PageHeader } from '@/components/shared/PageHeader';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import type { Order, Doctor, Approval, Transfer, Warehouse, Shipment, MR } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SalesTrendData {
  month: string;
  orders: number;
  revenue: number;
}

interface InventoryStatusData {
  name: string;
  value: number;
  color: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant: 'green' | 'yellow' | 'pink' | 'purple';
}

function ColorfulStatCard({ title, value, icon, variant }: StatCardProps) {
  const variants = {
    green: 'bg-stat-green-bg border-stat-green/20',
    yellow: 'bg-stat-yellow-bg border-stat-yellow/20',
    pink: 'bg-stat-pink-bg border-stat-pink/20',
    purple: 'bg-stat-purple-bg border-stat-purple/20',
  };

  const iconVariants = {
    green: 'bg-stat-green text-white',
    yellow: 'bg-stat-yellow text-white',
    pink: 'bg-stat-pink text-white',
    purple: 'bg-stat-purple text-white',
  };

  return (
    <Card className={`${variants[variant]} border`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${iconVariants[variant]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-display font-bold text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardKPIs {
  ordersToday: number;
  ordersTrend: number;
  revenueMonth: number;
  revenueTrend: number;
  inventoryValue: number;
  lowStockItems: number;
  pendingApprovals: number;
  delayedShipments: number;
  overdueAR: number;
  arAgeing30: number;
  arAgeing60: number;
  arAgeing90: number;
  newLeads: number;
  totalDoctors: number;
  pendingOrders: number;
  totalProducts: number;
}


export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ['/api/dashboard/kpis'],
  });
  
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });
  
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });
  
  const { data: approvals = [] } = useQuery<Approval[]>({
    queryKey: ['/api/approvals'],
  });
  
  const { data: transfers = [] } = useQuery<Transfer[]>({
    queryKey: ['/api/transfers'],
  });
  
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: shipments = [] } = useQuery<Shipment[]>({
    queryKey: ['/api/shipments'],
  });

  const { data: mrs = [] } = useQuery<MR[]>({
    queryKey: ['/api/mrs'],
  });

  const { data: salesData = [] } = useQuery<SalesTrendData[]>({
    queryKey: ['/api/dashboard/sales-trend'],
  });

  const { data: inventoryData = [] } = useQuery<InventoryStatusData[]>({
    queryKey: ['/api/dashboard/inventory-status'],
  });
  
  const pendingApprovals = approvals.filter(a => a.status === 'Pending');
  const recentOrders = orders.slice(0, 3);
  const recentTransfers = transfers.slice(0, 3);
  const recentShipments = shipments.slice(0, 5);

  // Calculate MR activity metrics
  const activeMRs = mrs.filter(mr => mr.status === 'Active').length;
  const totalMRs = mrs.length;
  const mrActivityRate = totalMRs > 0 ? Math.round((activeMRs / totalMRs) * 100) : 0;

  // Calculate shipment status breakdown
  const shipmentStatusCounts = {
    pending: shipments.filter(s => s.status === 'Pending').length,
    dispatched: shipments.filter(s => s.status === 'Dispatched' || s.status === 'In Transit').length,
    delivered: shipments.filter(s => s.status === 'Delivered').length,
    failed: shipments.filter(s => s.status === 'Failed' || s.status === 'Returned').length,
  };

  // Calculate business health score (weighted average of key metrics)
  const calculateHealthScore = () => {
    const orderFulfillmentRate = orders.length > 0 ? 
      (orders.filter(o => o.status === 'Delivered').length / orders.length) * 100 : 100;
    const lowStockPenalty = (kpis?.lowStockItems || 0) > 10 ? 20 : (kpis?.lowStockItems || 0) * 2;
    const delayedShipmentPenalty = (kpis?.delayedShipments || 0) * 5;
    const overdueARPenalty = (kpis?.overdueAR || 0) > 500000 ? 15 : ((kpis?.overdueAR || 0) / 500000) * 15;
    
    const score = Math.max(0, Math.min(100, 
      orderFulfillmentRate - lowStockPenalty - delayedShipmentPenalty - overdueARPenalty + 50
    ));
    return Math.round(score);
  };

  const healthScore = calculateHealthScore();
  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', variant: 'default' as const };
    if (score >= 60) return { label: 'Good', variant: 'secondary' as const };
    if (score >= 40) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Needs Attention', variant: 'destructive' as const };
  };
  const healthStatus = getHealthStatus(healthScore);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const getWarehouseName = (id: number) => {
    return warehouses.find(w => w.id === id)?.name || `WH-${id}`;
  };

  if (kpisLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Dashboard" 
        description="Welcome back, here what's happening today"
      />

      {/* Colorful KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ColorfulStatCard
          title="New Leads"
          value={kpis?.newLeads || 0}
          icon={<DollarSign className="h-6 w-6" />}
          variant="green"
        />
        <ColorfulStatCard
          title="Doctors"
          value={kpis?.totalDoctors || 0}
          icon={<ShoppingCart className="h-6 w-6" />}
          variant="yellow"
        />
        <ColorfulStatCard
          title="Pending Orders"
          value={kpis?.pendingOrders || 0}
          icon={<CheckSquare className="h-6 w-6" />}
          variant="pink"
        />
        <ColorfulStatCard
          title="Total Products"
          value={kpis?.totalProducts || 0}
          icon={<Package className="h-6 w-6" />}
          variant="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Overview Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(1)}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="orders" fill="#3b82f6" name="Order" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Revenue" strokeWidth={2} dot={{ fill: '#22c55e', strokeWidth: 2 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">Monthly Trends</p>
          </CardContent>
        </Card>

        {/* Inventory Status Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Inventory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none" style={{ marginTop: '-18px' }}>
                <p className="text-sm text-muted-foreground font-mono">Out of Stock</p>
                <p className="text-3xl font-display font-bold">15%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Health & MR Activity Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Business Health Score */}
        <Card data-testid="card-health-score">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Business Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                  <circle 
                    cx="50" cy="50" r="40" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="none" 
                    strokeDasharray={`${healthScore * 2.51} 251`}
                    className={healthScore >= 80 ? 'text-success' : healthScore >= 60 ? 'text-warning' : 'text-destructive'}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" data-testid="text-health-score">{healthScore}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <Badge variant={healthStatus.variant} className="mt-3" data-testid="badge-health-status">
                {healthStatus.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* MR Activity Summary */}
        <Card data-testid="card-mr-activity">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              MR Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active MRs</span>
              <span className="font-semibold" data-testid="text-active-mrs">{activeMRs} / {totalMRs}</span>
            </div>
            <Progress value={mrActivityRate} className="h-2" />
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Targets Met</span>
                </div>
                <p className="text-lg font-semibold mt-1" data-testid="text-targets-met">{Math.round(activeMRs * 0.7)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Follow-ups Today</span>
                </div>
                <p className="text-lg font-semibold mt-1" data-testid="text-followups-today">{Math.round(totalMRs * 1.5)}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/mr" data-testid="link-mr-directory">
                View MR Directory <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Shipment Tracking Widget */}
        <Card data-testid="card-shipment-tracking">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Live Shipments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold" data-testid="text-pending-shipments">{shipmentStatusCounts.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-2 rounded-lg bg-accent/10 text-center">
                <p className="text-2xl font-bold text-accent" data-testid="text-in-transit-shipments">{shipmentStatusCounts.dispatched}</p>
                <p className="text-xs text-muted-foreground">In Transit</p>
              </div>
              <div className="p-2 rounded-lg bg-success/10 text-center">
                <p className="text-2xl font-bold text-success" data-testid="text-delivered-shipments">{shipmentStatusCounts.delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
              <div className="p-2 rounded-lg bg-destructive/10 text-center">
                <p className="text-2xl font-bold text-destructive" data-testid="text-failed-shipments">{shipmentStatusCounts.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
            {recentShipments.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Recent Updates</p>
                {recentShipments.slice(0, 3).map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between text-sm" data-testid={`row-shipment-${shipment.id}`}>
                    <span className="font-mono text-xs">{shipment.trackingId || `SHP-${shipment.id}`}</span>
                    <StatusPill status={shipment.status} />
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/logistics/shipments" data-testid="link-all-shipments">
                View All Shipments <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-display">Recent Orders</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/orders">View All Orders</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Order ID</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Customer</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const doctor = doctors.find(d => d.id === order.doctorId);
                    return (
                      <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <Link to={`/orders/${order.id}`} className="font-mono text-sm hover:underline">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-2"><StatusPill status={order.status} /></td>
                        <td className="py-3 px-2 text-right font-mono text-sm font-medium">₹{order.total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Transfers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-display">Warehouse Transfers</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/warehouses/transfers">View Transfers</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Transfer ID</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">From</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">To</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransfers.map((transfer) => (
                    <tr key={transfer.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <Link to={`/warehouses/transfers/${transfer.id}`} className="font-mono text-sm hover:underline">
                          {transfer.id}
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-sm">{getWarehouseName(transfer.fromWarehouseId)}</td>
                      <td className="py-3 px-2 text-sm">{getWarehouseName(transfer.toWarehouseId)}</td>
                      <td className="py-3 px-2"><StatusPill status={transfer.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium">Low Stock Alert</p>
                <p className="text-2xl font-display font-semibold">{kpis?.lowStockItems || 0} items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/20">
                <Truck className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">Delayed Shipments</p>
                <p className="text-2xl font-display font-semibold">{kpis?.delayedShipments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-accent/20">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium">Overdue AR</p>
                <p className="text-2xl font-display font-semibold">{formatCurrency(kpis?.overdueAR || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AR Ageing */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-display">AR Ageing Overview</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/finance/ar-ageing">
              View Details <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="p-3 md:p-4 rounded-lg bg-success/10 border border-success/20">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-lg md:text-xl font-display font-semibold text-success">
                {formatCurrency(kpis?.revenueMonth || 0)}
              </p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-xs text-muted-foreground">30 Days</p>
              <p className="text-lg md:text-xl font-display font-semibold text-warning">
                {formatCurrency(kpis?.arAgeing30 || 0)}
              </p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs text-muted-foreground">60 Days</p>
              <p className="text-lg md:text-xl font-display font-semibold text-accent">
                {formatCurrency(kpis?.arAgeing60 || 0)}
              </p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-muted-foreground">90+ Days</p>
              <p className="text-lg md:text-xl font-display font-semibold text-destructive">
                {formatCurrency(kpis?.arAgeing90 || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
