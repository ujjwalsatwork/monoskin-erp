import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/shared/StatusPill';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Truck, Package, CheckCircle2, AlertTriangle, Clock, MapPin,
  MessageSquare, Send, Phone, ExternalLink, RefreshCw, RotateCcw,
  TrendingUp, Navigation, Zap, ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Shipment, Return, Order, Doctor, Pharmacy, Carrier, Warehouse } from '@shared/schema';

function KPICard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-muted/50`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LogisticsDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: shipments = [], isLoading: loadingShipments } = useQuery<Shipment[]>({
    queryKey: ['/api/shipments'],
  });

  const { data: returns = [], isLoading: loadingReturns } = useQuery<Return[]>({
    queryKey: ['/api/returns'],
  });

  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ['/api/orders'] });
  const { data: doctors = [] } = useQuery<Doctor[]>({ queryKey: ['/api/doctors'] });
  const { data: pharmacies = [] } = useQuery<Pharmacy[]>({ queryKey: ['/api/pharmacies'] });
  const { data: carriers = [] } = useQuery<Carrier[]>({ queryKey: ['/api/carriers'] });
  const { data: warehouses = [] } = useQuery<Warehouse[]>({ queryKey: ['/api/warehouses'] });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeShipments = shipments.filter(s => !['Delivered', 'Failed', 'Returned', 'Cancelled'].includes(s.status));
  const inTransit = shipments.filter(s => s.status === 'In Transit');
  const outForDelivery = shipments.filter(s => s.status === 'Out for Delivery');
  const deliveredToday = shipments.filter(s => s.status === 'Delivered' && s.deliveredAt && new Date(s.deliveredAt) >= today);
  const failedOrReturned = shipments.filter(s => ['Failed', 'Returned'].includes(s.status));
  const pendingReturns = returns.filter(r => !['Approved', 'Rejected', 'Completed'].includes(r.status));

  const getCustomerName = (s: Shipment) => {
    const order = orders.find(o => o.id === s.orderId);
    if (!order) return '—';
    const doc = doctors.find(d => d.id === order.doctorId);
    if (doc) return doc.name;
    const pharm = pharmacies.find(p => p.id === order.pharmacyId);
    return pharm?.name || '—';
  };

  const getCarrierName = (s: Shipment) => carriers.find(c => c.id === s.carrierId)?.name || '—';
  const getWarehouseName = (s: Shipment) => warehouses.find(w => w.id === s.warehouseId)?.name || '—';

  const getTrackingUrl = (s: Shipment) => {
    const carrier = carriers.find(c => c.id === s.carrierId);
    if (!s.trackingId) return null;
    if (carrier?.trackingUrlTemplate) {
      return carrier.trackingUrlTemplate.replace('{tracking_id}', s.trackingId);
    }
    return `https://shiprocket.co/tracking/${s.trackingId}`;
  };

  const handleSendBulkWhatsApp = () => {
    const count = inTransit.length + outForDelivery.length;
    toast({ title: 'WhatsApp Updates Triggered', description: `Sending delivery updates to ${count} customers` });
  };

  const handleSendBulkSMS = () => {
    const count = inTransit.length + outForDelivery.length;
    toast({ title: 'Bulk SMS Sent', description: `Tracking SMS sent to ${count} customers` });
  };

  const recentShipments = [...shipments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Logistics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live tracking and delivery management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSendBulkSMS} data-testid="button-bulk-sms">
            <MessageSquare className="h-4 w-4 mr-1.5" /> Bulk Tracking SMS
          </Button>
          <Button variant="outline" size="sm" onClick={handleSendBulkWhatsApp} data-testid="button-bulk-whatsapp">
            <Send className="h-4 w-4 mr-1.5" /> Auto WhatsApp Updates
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {loadingShipments ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <KPICard title="Active Shipments" value={activeShipments.length} sub="not yet delivered" icon={Truck} color="text-primary" />
          <KPICard title="In Transit" value={inTransit.length} sub="with carrier" icon={Navigation} color="text-blue-600 dark:text-blue-400" />
          <KPICard title="Out for Delivery" value={outForDelivery.length} sub="last mile" icon={MapPin} color="text-indigo-600 dark:text-indigo-400" />
          <KPICard title="Delivered Today" value={deliveredToday.length} sub={today.toLocaleDateString()} icon={CheckCircle2} color="text-green-600 dark:text-green-400" />
          <KPICard title="Failed / Returned" value={failedOrReturned.length} sub="need action" icon={AlertTriangle} color="text-destructive" />
          <KPICard title="Pending Returns" value={pendingReturns.length} sub="awaiting processing" icon={RotateCcw} color="text-amber-600 dark:text-amber-400" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Shipments Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card data-testid="card-live-tracking">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" /> Live Shipment Tracking
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/shipments')} data-testid="button-view-all-shipments">
                  View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingShipments ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : recentShipments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No shipments found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shipment</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Carrier</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Track</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentShipments.map(s => {
                        const trackUrl = getTrackingUrl(s);
                        return (
                          <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors" data-testid={`row-shipment-${s.id}`}>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => navigate(`/shipments/${s.id}`)}
                                className="font-medium text-primary hover:underline font-mono text-xs"
                                data-testid={`link-shipment-${s.id}`}
                              >
                                SHP-{s.id}
                              </button>
                              {s.trackingId && (
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.trackingId}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium truncate max-w-[120px]">{getCustomerName(s)}</p>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{getCarrierName(s)}</td>
                            <td className="px-4 py-3">
                              <StatusPill status={s.status} />
                            </td>
                            <td className="px-4 py-3">
                              {trackUrl ? (
                                <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                  data-testid={`link-track-${s.id}`}>
                                  Track <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => toast({ title: 'SMS Sent', description: `Tracking SMS sent for SHP-${s.id}` })}
                                  className="p-1 rounded hover:bg-muted transition-colors"
                                  title="Send SMS"
                                  data-testid={`button-sms-${s.id}`}
                                >
                                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => toast({ title: 'WhatsApp Sent', description: `WhatsApp update sent for SHP-${s.id}` })}
                                  className="p-1 rounded hover:bg-muted transition-colors"
                                  title="Send WhatsApp"
                                  data-testid={`button-wa-${s.id}`}
                                >
                                  <Send className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => navigate(`/shipments/${s.id}`)}
                                  className="p-1 rounded hover:bg-muted transition-colors"
                                  title="View Detail"
                                  data-testid={`button-detail-${s.id}`}
                                >
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Communication Hub */}
          <Card data-testid="card-comms-hub">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" /> Auto Communication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                <p className="text-xs font-semibold">Customers to notify</p>
                <p className="text-2xl font-bold text-primary">{inTransit.length + outForDelivery.length}</p>
                <p className="text-xs text-muted-foreground">shipments with updates pending</p>
              </div>
              <Button className="w-full justify-start" variant="outline" size="sm" onClick={handleSendBulkWhatsApp} data-testid="button-auto-whatsapp">
                <Send className="h-3.5 w-3.5 mr-2 text-green-600" /> Auto WhatsApp Delivery Updates
              </Button>
              <Button className="w-full justify-start" variant="outline" size="sm" onClick={handleSendBulkSMS} data-testid="button-auto-sms">
                <MessageSquare className="h-3.5 w-3.5 mr-2 text-blue-600" /> Bulk Tracking SMS Blast
              </Button>
              <Button className="w-full justify-start" variant="outline" size="sm"
                onClick={() => toast({ title: 'Calling Carrier', description: 'Opening carrier contact options' })}
                data-testid="button-contact-carrier-bulk">
                <Phone className="h-3.5 w-3.5 mr-2" /> Contact Carrier for Delays
              </Button>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card data-testid="card-status-breakdown">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" /> Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Pending', count: shipments.filter(s => s.status === 'Pending').length, color: 'bg-muted' },
                { label: 'Ready for Dispatch', count: shipments.filter(s => s.status === 'Ready for Dispatch').length, color: 'bg-amber-400' },
                { label: 'Dispatched', count: shipments.filter(s => s.status === 'Dispatched').length, color: 'bg-sky-400' },
                { label: 'In Transit', count: inTransit.length, color: 'bg-blue-500' },
                { label: 'Out for Delivery', count: outForDelivery.length, color: 'bg-indigo-500' },
                { label: 'Delivered', count: shipments.filter(s => s.status === 'Delivered').length, color: 'bg-green-500' },
                { label: 'Failed', count: shipments.filter(s => s.status === 'Failed').length, color: 'bg-red-500' },
                { label: 'Returned', count: shipments.filter(s => s.status === 'Returned').length, color: 'bg-orange-400' },
              ].filter(s => s.count > 0).map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-2" data-testid={`status-row-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                  <span className="text-sm flex-1">{label}</span>
                  <Badge variant="secondary" className="text-xs tabular-nums">{count}</Badge>
                </div>
              ))}
              {shipments.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No shipments</p>}
            </CardContent>
          </Card>

          {/* Pending Returns */}
          <Card data-testid="card-pending-returns">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <RotateCcw className="h-3.5 w-3.5" /> Pending Returns
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/returns')} data-testid="button-view-all-returns">
                  All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReturns ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : pendingReturns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No pending returns</p>
              ) : (
                <div className="space-y-2">
                  {pendingReturns.slice(0, 5).map(r => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/returns/${r.id}`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      data-testid={`return-row-${r.id}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{r.returnNumber}</p>
                        <p className="text-xs text-muted-foreground">{r.reason || 'Return request'}</p>
                      </div>
                      <StatusPill status={r.status} />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warehouses Quick View */}
          <Card data-testid="card-warehouse-activity">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Package className="h-3.5 w-3.5" /> Warehouse Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {warehouses.slice(0, 4).map(w => {
                const warehouseShipments = shipments.filter(s => s.warehouseId === w.id && activeShipments.includes(s));
                return (
                  <div key={w.id} className="flex items-center justify-between py-1.5" data-testid={`warehouse-row-${w.id}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium truncate max-w-[140px]">{w.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground tabular-nums">{warehouseShipments.length} active</span>
                    </div>
                  </div>
                );
              })}
              {warehouses.length === 0 && <p className="text-sm text-muted-foreground">No warehouses</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
