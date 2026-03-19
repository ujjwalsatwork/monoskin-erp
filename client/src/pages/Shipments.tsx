import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Truck, Package, Clock, CheckCircle, XCircle, MessageSquare, Phone, FileText, Plus, Send, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { ExportModal } from '@/components/shared/ExportModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Shipment, Order, Doctor, Warehouse, Carrier } from '@shared/schema';

export default function Shipments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery<Shipment[]>({
    queryKey: ['/api/shipments'],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: carriers = [] } = useQuery<Carrier[]>({
    queryKey: ['/api/carriers'],
  });

  const updateShipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Shipment> }) => {
      return apiRequest('PATCH', `/api/shipments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
    },
  });

  const filteredShipments = shipments.filter(shipment => {
    if (statusFilter !== 'all' && shipment.status !== statusFilter) return false;
    if (carrierFilter !== 'all') {
      const carrier = carriers.find(c => c.id === shipment.carrierId);
      if (!carrier || carrier.name !== carrierFilter) return false;
    }
    if (warehouseFilter !== 'all' && String(shipment.warehouseId) !== warehouseFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const order = orders.find(o => o.id === shipment.orderId);
      const doctor = order?.doctorId ? doctors.find(d => d.id === order.doctorId) : null;
      return (
        String(shipment.id).includes(query) ||
        order?.orderNumber?.toLowerCase().includes(query) ||
        shipment.trackingId?.toLowerCase().includes(query) ||
        doctor?.name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const statuses = ['Pending', 'Ready for Dispatch', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed', 'Returned'];
  const uniqueCarriers = [...new Set(carriers.filter(c => c.isActive).map(c => c.name))];

  const exportColumns = [
    { key: 'id', label: 'Shipment ID', defaultSelected: true },
    { key: 'orderId', label: 'Order ID', defaultSelected: true },
    { key: 'status', label: 'Status', defaultSelected: true },
    { key: 'carrier', label: 'Carrier', defaultSelected: true },
    { key: 'trackingId', label: 'Tracking ID' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'dispatchedAt', label: 'Dispatched At' },
    { key: 'deliveredAt', label: 'Delivered At' },
  ];

  const handleResendSMS = () => {
    if (!selectedShipment) return;
    toast({ title: 'SMS Sent', description: `Tracking SMS sent for shipment ${selectedShipment.id}` });
    setSmsDialogOpen(false);
  };

  const handleSendWhatsApp = () => {
    if (!selectedShipment) return;
    toast({ title: 'WhatsApp Sent', description: `Tracking message sent via WhatsApp for shipment ${selectedShipment.id}` });
    setWhatsappDialogOpen(false);
  };

  const handleGenerateLabel = (shipment: Shipment) => {
    toast({ title: 'Label Generated', description: `Shipping label for shipment ${shipment.id} is ready` });
  };

  const handleContactCarrier = (shipment: Shipment) => {
    const carrier = carriers.find(c => c.id === shipment.carrierId);
    if (carrier) {
      toast({ 
        title: `Contact ${carrier.name}`, 
        description: `Phone: ${carrier.phone || 'N/A'} | Email: ${carrier.email || 'N/A'}` 
      });
    } else {
      toast({ title: 'No carrier assigned', variant: 'destructive' });
    }
  };

  const columns = [
    {
      key: 'id',
      header: 'Shipment ID',
      sortable: true,
      render: (item: Shipment) => (
        <span className="font-mono text-sm font-medium" data-testid={`text-shipment-id-${item.id}`}>SHP{String(item.id).padStart(3, '0')}</span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      render: (item: Shipment) => {
        const order = orders.find(o => o.id === item.orderId);
        const doctor = order?.doctorId ? doctors.find(d => d.id === order.doctorId) : null;
        return (
          <div>
            <p className="font-mono text-sm">{order?.orderNumber || `ORD${String(item.orderId).padStart(3, '0')}`}</p>
            <p className="text-xs text-muted-foreground">{doctor?.name || 'N/A'}</p>
          </div>
        );
      },
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (item: Shipment) => {
        const wh = warehouses.find(w => w.id === item.warehouseId);
        return <span className="text-sm">{wh?.name || '—'}</span>;
      },
    },
    {
      key: 'carrier',
      header: 'Carrier',
      render: (item: Shipment) => {
        const carrier = carriers.find(c => c.id === item.carrierId);
        return carrier ? (
          <Badge variant="outline">{carrier.name}</Badge>
        ) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: 'trackingId',
      header: 'Tracking ID',
      render: (item: Shipment) => (
        <span className="font-mono text-xs">{item.trackingId || '—'}</span>
      ),
    },
    {
      key: 'packages',
      header: 'Packages',
      render: (item: Shipment) => (
        <span className="text-sm">{item.packages || 1}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item: Shipment) => <StatusPill status={item.status} />,
    },
    {
      key: 'dispatchedAt',
      header: 'Dispatched',
      render: (item: Shipment) => (
        <span className="text-sm">{item.dispatchedAt ? new Date(item.dispatchedAt).toLocaleDateString() : '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: Shipment) => (
        <RowActionsMenu actions={[
          { label: 'View Details', onClick: () => navigate(`/shipments/${item.id}`) },
          { label: 'View Order', onClick: () => navigate(`/orders/${item.orderId}`) },
          { separator: true, label: '', onClick: () => {} },
          { label: 'Generate Label', icon: <FileText className="h-4 w-4" />, onClick: () => handleGenerateLabel(item) },
          { label: 'Resend Tracking SMS', icon: <MessageSquare className="h-4 w-4" />, onClick: () => { setSelectedShipment(item); setSmsDialogOpen(true); } },
          { label: 'Send WhatsApp Update', icon: <Send className="h-4 w-4" />, onClick: () => { setSelectedShipment(item); setWhatsappDialogOpen(true); } },
          { separator: true, label: '', onClick: () => {} },
          { label: 'Contact Carrier', icon: <Phone className="h-4 w-4" />, onClick: () => handleContactCarrier(item) },
        ]} />
      ),
    },
  ];

  const stats = {
    total: shipments.length,
    pending: shipments.filter(s => s.status === 'Pending' || s.status === 'Ready for Dispatch').length,
    inTransit: shipments.filter(s => s.status === 'In Transit' || s.status === 'Dispatched').length,
    delivered: shipments.filter(s => s.status === 'Delivered').length,
    failed: shipments.filter(s => s.status === 'Failed' || s.status === 'Returned').length,
  };

  if (shipmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Shipments"
        description="Track and manage order shipments with full workflow visibility"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => navigate('/orders')} data-testid="button-new-order">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Shipments" value={stats.total} icon={<Package className="h-5 w-5" />} />
        <StatCard title="Pending / Ready" value={stats.pending} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="In Transit" value={stats.inTransit} icon={<Truck className="h-5 w-5" />} />
        <StatCard title="Delivered" value={stats.delivered} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard title="Failed / Returned" value={stats.failed} icon={<XCircle className="h-5 w-5" />} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, order, tracking, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
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
        <Select value={carrierFilter} onValueChange={setCarrierFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-carrier">
            <SelectValue placeholder="All Carriers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Carriers</SelectItem>
            {uniqueCarriers.map((carrier) => carrier && (
              <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-warehouse">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filteredShipments}
        columns={columns}
        onRowClick={(item) => navigate(`/shipments/${item.id}`)}
        emptyMessage="No shipments found"
      />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityName="Shipments"
        columns={exportColumns}
        totalRecords={filteredShipments.length}
      />

      <ConfirmDialog
        open={smsDialogOpen}
        onOpenChange={setSmsDialogOpen}
        title="Resend Tracking SMS"
        description={`Send tracking SMS for shipment ${selectedShipment?.id} to the customer?`}
        confirmLabel="Send SMS"
        onConfirm={handleResendSMS}
      />

      <ConfirmDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        title="Send WhatsApp Update"
        description={`Send tracking update via WhatsApp for shipment ${selectedShipment?.id}?`}
        confirmLabel="Send WhatsApp"
        onConfirm={handleSendWhatsApp}
      />
    </div>
  );
}
