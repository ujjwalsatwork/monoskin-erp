import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Order, Doctor, Pharmacy, Inventory } from '@shared/schema';

interface OrderException {
  id: number;
  orderId: string;
  orderNumber: string;
  customerName: string;
  exceptionType: 'credit_exceeded' | 'stock_shortage' | 'pending_approval';
  description: string;
  orderValue: number;
  status: 'pending' | 'resolved';
  createdAt: string;
}

const OrderExceptions = () => {
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: pharmacies = [] } = useQuery<Pharmacy[]>({
    queryKey: ['/api/pharmacies'],
  });

  const exceptions: OrderException[] = orders
    .filter(o => o.status === 'On Hold' || o.status === 'Pending Approval')
    .map(order => {
      const doctor = doctors.find(d => d.id === order.doctorId);
      const pharmacy = pharmacies.find(p => p.id === order.pharmacyId);
      const customer = doctor || pharmacy;
      
      let exceptionType: 'credit_exceeded' | 'stock_shortage' | 'pending_approval' = 'pending_approval';
      let description = 'Order pending approval';
      
      if (order.status === 'On Hold') {
        if (customer && Number(customer.outstanding) > Number(customer.creditLimit)) {
          exceptionType = 'credit_exceeded';
          description = `Credit limit exceeded. Outstanding: ₹${Number(customer.outstanding).toLocaleString()}`;
        } else {
          exceptionType = 'stock_shortage';
          description = 'Order on hold - stock or approval pending';
        }
      }

      return {
        id: order.id,
        orderId: String(order.id),
        orderNumber: order.orderNumber,
        customerName: customer?.name || 'Unknown',
        exceptionType,
        description,
        orderValue: Number(order.total),
        status: 'pending' as const,
        createdAt: new Date(order.createdAt).toLocaleString(),
      };
    });

  const getExceptionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit_exceeded: 'Credit Exceeded',
      stock_shortage: 'Stock Shortage',
      pending_approval: 'Pending Approval',
    };
    return labels[type] || type;
  };

  const columns: Column<OrderException>[] = [
    { key: 'orderNumber', header: 'Order ID', sortable: true, render: (item) => <span className="font-mono font-medium">{item.orderNumber}</span> },
    { key: 'customerName', header: 'Customer', sortable: true },
    { key: 'exceptionType', header: 'Exception Type', render: (item) => (
      <span className={`text-sm ${item.exceptionType === 'credit_exceeded' ? 'text-red-600' : item.exceptionType === 'stock_shortage' ? 'text-yellow-600' : 'text-blue-600'}`}>
        {getExceptionTypeLabel(item.exceptionType)}
      </span>
    )},
    { key: 'description', header: 'Description' },
    { key: 'orderValue', header: 'Order Value', render: (item) => <span className="font-mono">₹{item.orderValue.toLocaleString()}</span> },
    { key: 'createdAt', header: 'Raised At', sortable: true },
    { key: 'status', header: 'Status', render: (item) => <StatusPill status={item.status} /> },
  ];

  const pendingCount = exceptions.filter(e => e.status === 'pending').length;
  const creditExceeded = exceptions.filter(e => e.exceptionType === 'credit_exceeded').length;
  const stockShortage = exceptions.filter(e => e.exceptionType === 'stock_shortage').length;
  const totalValue = exceptions.reduce((sum, e) => sum + e.orderValue, 0);

  const stats = [
    { title: 'Total Exceptions', value: exceptions.length.toString(), subtitle: 'Active', color: 'blue' as const },
    { title: 'Credit Issues', value: creditExceeded.toString(), subtitle: 'Limit exceeded', color: 'pink' as const },
    { title: 'Stock Issues', value: stockShortage.toString(), subtitle: 'Shortages', color: 'yellow' as const },
    { title: 'Value Blocked', value: `₹${(totalValue / 100000).toFixed(1)}L`, subtitle: 'Orders on hold', color: 'purple' as const },
  ];

  const handleResolve = (exception: OrderException) => {
    toast({ title: 'Resolution', description: `Exception for ${exception.orderNumber} marked for review` });
  };

  const rowActions = [
    { label: 'Resolve', onClick: handleResolve },
    { label: 'View Order', onClick: (e: OrderException) => window.location.href = `/orders/${e.id}` },
  ];

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
        title="Order Exceptions"
        description="Manage orders with exceptions requiring attention"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <DataTable
        columns={columns}
        data={exceptions}
        rowActions={rowActions}
        emptyMessage="No order exceptions found"
      />
    </div>
  );
};

export default OrderExceptions;
