import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Phone, Mail, MapPin, Building2, CreditCard, Edit, Loader2, Package, FileText, TrendingUp, AlertTriangle, Star } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Pharmacy, Order, Invoice, Doctor } from '@shared/schema';

export default function PharmacyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    creditLimit: '',
    importance: 'Medium',
  });

  const { data: pharmacy, isLoading } = useQuery<Pharmacy>({
    queryKey: ['/api/pharmacies', id],
    queryFn: async () => {
      const res = await fetch(`/api/pharmacies/${id}`);
      if (!res.ok) throw new Error('Pharmacy not found');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Pharmacy>) => {
      const res = await apiRequest('PATCH', `/api/pharmacies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacies', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacies'] });
      toast({ title: 'Pharmacy Updated', description: 'Pharmacy details have been updated.' });
      setEditOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update pharmacy.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/pharmacies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacies'] });
      toast({ title: 'Deactivated', description: 'Pharmacy has been deactivated.' });
      navigate('/pharmacies');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to deactivate pharmacy.', variant: 'destructive' });
    },
  });

  const pharmacyOrders = orders.filter(o => o.pharmacyId === Number(id));
  const pharmacyInvoices = invoices.filter(i => i.pharmacyId === Number(id));
  const linkedDoctor = doctors.find(d => d.id === pharmacy?.doctorId);

  const handleOpenEdit = () => {
    if (pharmacy) {
      setEditForm({
        name: pharmacy.name || '',
        city: pharmacy.city || '',
        state: pharmacy.state || '',
        phone: pharmacy.phone || '',
        email: pharmacy.email || '',
        address: pharmacy.address || '',
        gstin: pharmacy.gstin || '',
        creditLimit: String(pharmacy.creditLimit || '0'),
        importance: pharmacy.importance || 'Medium',
      });
      setEditOpen(true);
    }
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      name: editForm.name,
      city: editForm.city,
      state: editForm.state || null,
      phone: editForm.phone || null,
      email: editForm.email || null,
      address: editForm.address || null,
      gstin: editForm.gstin || null,
      creditLimit: editForm.creditLimit,
      importance: editForm.importance as 'High' | 'Medium' | 'Low',
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setDeleteOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="text-not-found">
        <p className="text-muted-foreground">Pharmacy not found</p>
      </div>
    );
  }

  const totalRevenue = pharmacyOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const avgOrderValue = pharmacyOrders.length > 0 ? totalRevenue / pharmacyOrders.length : 0;
  const creditLimit = Number(pharmacy.creditLimit || 0);
  const outstanding = Number(pharmacy.outstanding || 0);
  const utilization = creditLimit > 0 ? (outstanding / creditLimit * 100) : 0;
  const availableCredit = Math.max(0, creditLimit - outstanding);

  return (
    <div className="space-y-6 animate-fade-in">
      <DetailPageHeader
        title={pharmacy.name}
        subtitle={`Code: ${pharmacy.code}`}
        status={pharmacy.isActive ? 'Active' : 'Inactive'}
        backPath="/pharmacies"
        primaryActions={
          <Button variant="outline" onClick={handleOpenEdit} data-testid="button-edit">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-display font-semibold" data-testid="stat-total-orders">{pharmacyOrders.length}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-display font-semibold" data-testid="stat-total-revenue">₹{(totalRevenue / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-display font-semibold" data-testid="stat-avg-order">₹{avgOrderValue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Avg Order Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className={`text-2xl font-display font-semibold ${utilization >= 80 ? 'text-destructive' : utilization >= 50 ? 'text-yellow-600' : ''}`} data-testid="stat-utilization">
                  {utilization.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Credit Utilization</p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-pharmacy-info">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Pharmacy Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium" data-testid="text-name">{pharmacy.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Code</p>
                  <p className="font-mono font-medium" data-testid="text-code">{pharmacy.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium flex items-center gap-1" data-testid="text-phone">
                    <Phone className="h-3 w-3" />
                    {pharmacy.phone || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-1" data-testid="text-email">
                    <Mail className="h-3 w-3" />
                    {pharmacy.email || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Linked Doctor</p>
                  <p className="font-medium" data-testid="text-linked-doctor">
                    {linkedDoctor ? (
                      <Button 
                        variant="link" 
                        className="p-0 h-auto" 
                        onClick={() => navigate(`/doctors/${linkedDoctor.id}`)}
                        data-testid="link-doctor"
                      >
                        {linkedDoctor.name}
                      </Button>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Importance</p>
                  <Badge 
                    variant={pharmacy.importance === 'High' ? 'destructive' : pharmacy.importance === 'Medium' ? 'secondary' : 'outline'} 
                    data-testid="badge-importance"
                  >
                    {pharmacy.importance || 'Medium'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium flex items-center gap-1" data-testid="text-address">
                    <MapPin className="h-3 w-3" />
                    {pharmacy.address || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">City / State</p>
                  <p className="font-medium" data-testid="text-city-state">{pharmacy.city}{pharmacy.state ? `, ${pharmacy.state}` : ''}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GSTIN</p>
                  <p className="font-mono text-sm" data-testid="text-gstin">{pharmacy.gstin || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={pharmacy.isActive ? 'default' : 'secondary'} data-testid="badge-status">
                    {pharmacy.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-orders">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Recent Orders ({pharmacyOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pharmacyOrders.length > 0 ? (
                <div className="space-y-2">
                  {pharmacyOrders.slice(0, 5).map(order => (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover-elevate cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                      data-testid={`order-row-${order.id}`}
                    >
                      <div>
                        <p className="font-mono text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold">₹{Number(order.total).toLocaleString()}</p>
                        <Badge variant="outline" className="text-xs">{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No orders yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card data-testid="card-financial">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Credit Limit</span>
                <span className="font-mono font-medium" data-testid="text-credit-limit">₹{creditLimit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Outstanding</span>
                <span className="font-mono font-medium text-yellow-600" data-testid="text-outstanding">₹{outstanding.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available Credit</span>
                <span className="font-mono font-medium text-green-600" data-testid="text-available-credit">₹{availableCredit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Utilization</span>
                <span className={`font-mono font-medium ${utilization >= 80 ? 'text-destructive' : utilization >= 50 ? 'text-yellow-600' : 'text-green-600'}`} data-testid="text-utilization-pct">
                  {utilization.toFixed(1)}%
                  {utilization >= 80 && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="font-mono font-semibold" data-testid="text-total-revenue">₹{totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Engagement Score</span>
                <span className="font-medium" data-testid="text-engagement">{pharmacy.engagementScore || 50}/100</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-additional-info">
            <CardHeader>
              <CardTitle className="text-base">Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Order</span>
                <span className="text-sm" data-testid="text-last-order">
                  {pharmacy.lastOrderDate ? new Date(pharmacy.lastOrderDate).toLocaleDateString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Payment</span>
                <span className="text-sm" data-testid="text-last-payment">
                  {pharmacy.lastPaymentDate ? new Date(pharmacy.lastPaymentDate).toLocaleDateString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Conversion Failures</span>
                <span className={`font-medium ${(pharmacy.conversionFailures || 0) >= 3 ? 'text-destructive' : ''}`} data-testid="text-conv-failures">
                  {pharmacy.conversionFailures || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Customer Since</span>
                <span className="text-sm" data-testid="text-created">{new Date(pharmacy.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-invoices">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pharmacyInvoices.length > 0 ? (
                <div className="space-y-2">
                  {pharmacyInvoices.slice(0, 3).map(inv => (
                    <div 
                      key={inv.id} 
                      className="flex items-center justify-between p-2 bg-muted/50 rounded hover-elevate cursor-pointer"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      data-testid={`invoice-row-${inv.id}`}
                    >
                      <div>
                        <span className="font-mono text-sm">{inv.invoiceNumber}</span>
                        <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm">₹{Number(inv.amount).toLocaleString()}</span>
                        <Badge variant={inv.status === 'Paid' ? 'default' : inv.status === 'Overdue' ? 'destructive' : 'outline'} className="ml-2 text-xs">{inv.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No invoices</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-lg sm:w-full" data-testid="dialog-edit-pharmacy">
          <DialogHeader>
            <DialogTitle>Edit Pharmacy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Pharmacy Name *</Label>
              <Input 
                value={editForm.name} 
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} 
                data-testid="input-edit-name" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City *</Label>
                <Input 
                  value={editForm.city} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))} 
                  data-testid="input-edit-city" 
                />
              </div>
              <div>
                <Label>State</Label>
                <Input 
                  value={editForm.state} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))} 
                  data-testid="input-edit-state" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} 
                  data-testid="input-edit-phone" 
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email" 
                  value={editForm.email} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} 
                  data-testid="input-edit-email" 
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input 
                value={editForm.address} 
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))} 
                data-testid="input-edit-address" 
              />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input 
                value={editForm.gstin} 
                onChange={(e) => setEditForm(prev => ({ ...prev, gstin: e.target.value }))} 
                placeholder="XXABC1234X1ZX" 
                data-testid="input-edit-gstin" 
              />
            </div>
            <div>
              <Label>Credit Limit (₹)</Label>
              <Input 
                type="number" 
                value={editForm.creditLimit} 
                onChange={(e) => setEditForm(prev => ({ ...prev, creditLimit: e.target.value }))} 
                data-testid="input-edit-credit" 
              />
            </div>
            <div>
              <Label>Importance</Label>
              <Select value={editForm.importance} onValueChange={(v) => setEditForm(prev => ({ ...prev, importance: v }))}>
                <SelectTrigger data-testid="select-edit-importance"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} data-testid="button-cancel-edit">Cancel</Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!editForm.name || !editForm.city || updateMutation.isPending} 
              data-testid="button-save-edit"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Pharmacy"
        description="Are you sure you want to delete this pharmacy? This action cannot be undone."
        confirmLabel="Delete"
        destructive={true}
        onConfirm={handleDelete}
      />
    </div>
  );
}
