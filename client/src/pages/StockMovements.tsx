import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Package, Loader2, Tag, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { GRN, Transfer, Order, Warehouse, GRNItem, TransferItem, OrderItem } from '@shared/schema';

const REASON_TAGS = ['Doctor Request', 'Clearance', 'Restock', 'Disposal', 'Adjustment', 'Return', 'Sample'] as const;
type ReasonTag = typeof REASON_TAGS[number] | string;

const REASON_TAG_STYLES: Record<string, string> = {
  'Doctor Request': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'Clearance':      'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  'Restock':        'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
  'Disposal':       'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  'Adjustment':     'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'Return':         'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  'Sample':         'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
};

const tagStyle = (tag: string | null | undefined) =>
  tag && REASON_TAG_STYLES[tag]
    ? REASON_TAG_STYLES[tag]
    : 'bg-muted text-muted-foreground border-border';

interface StockMovement {
  id: number;
  sourceId: number;
  movementId: string;
  movementType: 'inward' | 'outward' | 'transfer';
  productName: string;
  sku: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  referenceType: 'GRN' | 'Transfer' | 'Order';
  referenceId: string;
  reasonTag: string | null;
  timestamp: string;
}

function ReasonTagCell({ movement }: { movement: StockMovement }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const endpoint =
    movement.referenceType === 'GRN' ? `/api/grns/${movement.sourceId}` :
    movement.referenceType === 'Transfer' ? `/api/transfers/${movement.sourceId}` :
    `/api/orders/${movement.sourceId}`;

  const queryKey =
    movement.referenceType === 'GRN' ? ['/api/grns'] :
    movement.referenceType === 'Transfer' ? ['/api/transfers'] :
    ['/api/orders'];

  const mutation = useMutation({
    mutationFn: (tag: string) => apiRequest('PATCH', endpoint, { reasonTag: tag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Reason Tag Updated' });
      setOpen(false);
    },
    onError: () => toast({ title: 'Update Failed', variant: 'destructive' }),
  });

  const currentTag = movement.reasonTag;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${tagStyle(currentTag)}`}
          data-testid={`badge-reason-tag-${movement.movementId}`}
        >
          {currentTag ? (
            <>{currentTag}<ChevronDown className="h-2.5 w-2.5 opacity-60" /></>
          ) : (
            <><Tag className="h-2.5 w-2.5 opacity-50" /><span className="opacity-60">Set tag</span><ChevronDown className="h-2.5 w-2.5 opacity-40" /></>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <div className="space-y-0.5">
          {REASON_TAGS.map(tag => (
            <button
              key={tag}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors hover:opacity-90 ${
                tag === currentTag ? tagStyle(tag) + ' ring-1 ring-inset ring-current/30' : 'hover:bg-muted'
              }`}
              onClick={() => mutation.mutate(tag)}
              disabled={mutation.isPending}
              data-testid={`option-reason-tag-${tag.replace(/\s+/g, '-').toLowerCase()}`}
            >
              {mutation.isPending && tag === currentTag ? (
                <span className="flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" />{tag}</span>
              ) : tag}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const StockMovements = () => {
  const { toast } = useToast();

  const { data: grns = [], isLoading: grnsLoading } = useQuery<GRN[]>({ queryKey: ['/api/grns'] });
  const { data: transfers = [], isLoading: transfersLoading } = useQuery<Transfer[]>({ queryKey: ['/api/transfers'] });
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({ queryKey: ['/api/orders'] });
  const { data: warehouses = [] } = useQuery<Warehouse[]>({ queryKey: ['/api/warehouses'] });
  const { data: grnItems = [] } = useQuery<GRNItem[]>({ queryKey: ['/api/grn-items'] });
  const { data: transferItems = [] } = useQuery<TransferItem[]>({ queryKey: ['/api/transfer-items'] });
  const { data: orderItems = [] } = useQuery<OrderItem[]>({ queryKey: ['/api/order-items'] });

  const isLoading = grnsLoading || transfersLoading || ordersLoading;

  const grnQtyMap = grnItems.reduce<Record<number, number>>((acc, item) => {
    acc[item.grnId] = (acc[item.grnId] || 0) + item.receivedQty;
    return acc;
  }, {});

  const transferQtyMap = transferItems.reduce<Record<number, number>>((acc, item) => {
    acc[item.transferId] = (acc[item.transferId] || 0) + item.quantity;
    return acc;
  }, {});

  const orderQtyMap = orderItems.reduce<Record<number, number>>((acc, item) => {
    acc[item.orderId] = (acc[item.orderId] || 0) + item.quantity;
    return acc;
  }, {});

  const movements: StockMovement[] = [
    ...grns.map((grn) => {
      const warehouse = warehouses.find(w => w.id === grn.warehouseId);
      return {
        id: grn.id,
        sourceId: grn.id,
        movementId: grn.grnNumber,
        movementType: 'inward' as const,
        productName: grnItems.filter(i => i.grnId === grn.id).length === 1
          ? (grnItems.find(i => i.grnId === grn.id) ? 'Product #' + grnItems.find(i => i.grnId === grn.id)!.productId : 'Product')
          : `${grnItems.filter(i => i.grnId === grn.id).length || 'Multiple'} Products`,
        sku: '-',
        fromLocation: grn.supplier || 'Supplier',
        toLocation: warehouse?.name || 'Warehouse',
        quantity: grnQtyMap[grn.id] || 0,
        referenceType: 'GRN' as const,
        referenceId: grn.grnNumber,
        reasonTag: grn.reasonTag ?? 'Restock',
        timestamp: new Date(grn.receivedAt).toLocaleString(),
      };
    }),
    ...transfers.map((transfer) => {
      const fromWh = warehouses.find(w => w.id === transfer.fromWarehouseId);
      const toWh = warehouses.find(w => w.id === transfer.toWarehouseId);
      return {
        id: transfer.id + 10000,
        sourceId: transfer.id,
        movementId: transfer.transferNumber,
        movementType: 'transfer' as const,
        productName: `${transferItems.filter(i => i.transferId === transfer.id).length || 'Multiple'} Items`,
        sku: '-',
        fromLocation: fromWh?.name || 'Source',
        toLocation: toWh?.name || 'Destination',
        quantity: transferQtyMap[transfer.id] || 0,
        referenceType: 'Transfer' as const,
        referenceId: transfer.transferNumber,
        reasonTag: transfer.reasonTag ?? null,
        timestamp: new Date(transfer.createdAt).toLocaleString(),
      };
    }),
    ...orders.filter(o => o.status === 'Delivered' || o.status === 'Dispatched').map((order) => {
      const warehouse = warehouses.find(w => w.id === order.warehouseId);
      return {
        id: order.id + 20000,
        sourceId: order.id,
        movementId: `MOV-${order.orderNumber}`,
        movementType: 'outward' as const,
        productName: `${orderItems.filter(i => i.orderId === order.id).length || 'Multiple'} Products`,
        sku: '-',
        fromLocation: warehouse?.name || 'Warehouse',
        toLocation: 'Customer',
        quantity: orderQtyMap[order.id] || 0,
        referenceType: 'Order' as const,
        referenceId: order.orderNumber,
        reasonTag: order.reasonTag ?? 'Doctor Request',
        timestamp: new Date(order.createdAt).toLocaleString(),
      };
    }),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'inward':   return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'outward':  return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'transfer': return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
      default:         return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const columns: Column<StockMovement>[] = [
    {
      key: 'movementId', header: 'Movement ID', sortable: true,
      render: (item) => <span className="font-mono text-sm" data-testid={`text-movement-id-${item.movementId}`}>{item.movementId}</span>,
    },
    {
      key: 'movementType', header: 'Type',
      render: (item) => (
        <div className="flex items-center gap-2" data-testid={`badge-movement-type-${item.movementId}`}>
          {getMovementIcon(item.movementType)}
          <span className="capitalize text-sm">{item.movementType}</span>
        </div>
      ),
    },
    { key: 'productName', header: 'Product' },
    { key: 'fromLocation', header: 'From' },
    { key: 'toLocation', header: 'To' },
    {
      key: 'quantity', header: 'Qty',
      render: (item) => item.quantity > 0
        ? <span className="font-mono">{item.quantity.toLocaleString()}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'reasonTag', header: 'Reason Tag',
      render: (item) => <ReasonTagCell movement={item} />,
    },
    {
      key: 'referenceType', header: 'Reference',
      render: (item) => <span className="text-sm text-muted-foreground">{item.referenceType}: {item.referenceId}</span>,
    },
    { key: 'timestamp', header: 'Timestamp', sortable: true },
  ];

  const inwardCount   = movements.filter(m => m.movementType === 'inward').length;
  const outwardCount  = movements.filter(m => m.movementType === 'outward').length;
  const transferCount = movements.filter(m => m.movementType === 'transfer').length;
  const noTagCount    = movements.filter(m => !m.reasonTag).length;

  const stats = [
    { title: 'Total Movements', value: movements.length.toString(), subtitle: 'All time',           color: 'blue'  as const },
    { title: 'Inward',          value: inwardCount.toString(),       subtitle: 'GRN receipts',       color: 'green' as const },
    { title: 'Outward',         value: outwardCount.toString(),      subtitle: 'Order dispatch',     color: 'pink'  as const },
    { title: 'Transfers',       value: transferCount.toString(),     subtitle: 'Inter-warehouse',    color: 'yellow' as const },
  ];

  const handleExport = () => {
    toast({ title: 'Export Started', description: 'Generating stock movements report...' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Stock Movements"
        description="Track all inventory movements across warehouses"
        actions={
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {noTagCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300" data-testid="alert-untagged-movements">
          <Tag className="h-4 w-4 flex-shrink-0" />
          <span><strong>{noTagCount}</strong> movement{noTagCount !== 1 ? 's' : ''} without a reason tag. Click the tag badge in any row to assign one.</span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={movements}
        emptyMessage="No stock movements found"
      />
    </div>
  );
};

export default StockMovements;
