import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { SalesChart } from '@/components/shared/SalesChart';
import { QuickActionsCard, QuickAction } from '@/components/shared/QuickActionsCard';
import { ActivityTimeline, ActivityItem } from '@/components/shared/ActivityTimeline';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Phone, Mail, MapPin, Building2, User, Edit, Loader2, Package, FileText, CreditCard,
  TrendingUp, MessageCircle, Globe, Linkedin, Facebook, Twitter, Instagram, Image,
  Store, Navigation, Plus, Upload, X, Camera, Star, Tag, Brain, Clock, Repeat,
  Sparkles, BarChart2, CheckCircle, ArrowUpRight, Save, BookOpen, Hash, Calendar,
  AlertCircle, UserCheck, Layers, MessageSquare,
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Doctor, Order, Invoice, MR, Pharmacy, Lead } from '@shared/schema';

type OrderItemWithMeta = {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  total: string;
  orderDate: string;
  orderNumber: string;
  productName?: string;
};

type FavProduct = {
  productId: number;
  productName: string;
  totalQty: number;
  totalRevenue: number;
  orderCount: number;
  lastOrdered: string;
};

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', specialization: '', clinic: '', city: '', state: '',
    phone: '', email: '', address: '', creditLimit: '', importance: 'Medium',
    whatsappNumber: '', receptionistName: '', receptionistPhone: '',
  });
  const [linkChemistOpen, setLinkChemistOpen] = useState(false);
  const [chemistForm, setChemistForm] = useState({ name: '', phone: '', address: '' });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  // Intelligence / metadata state
  const [nextVisitNotes, setNextVisitNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [editingTier, setEditingTier] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [localTier, setLocalTier] = useState<number | null>(null);

  const { data: doctor, isLoading } = useQuery<Doctor>({
    queryKey: ['/api/doctors', id],
    queryFn: async () => {
      const res = await fetch(`/api/doctors/${id}`);
      if (!res.ok) throw new Error('Doctor not found');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ['/api/orders'] });
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ['/api/invoices'] });
  const { data: mrs = [] } = useQuery<MR[]>({ queryKey: ['/api/mrs'] });
  const { data: pharmacies = [] } = useQuery<Pharmacy[]>({ queryKey: ['/api/pharmacies'] });

  const { data: originLead } = useQuery<Lead | null>({
    queryKey: ['/api/doctors', id, 'origin-lead'],
    queryFn: async () => {
      const res = await fetch(`/api/doctors/${id}/origin-lead`);
      return res.json();
    },
    enabled: !!id,
  });

  const { data: orderItems = [] } = useQuery<OrderItemWithMeta[]>({
    queryKey: ['/api/doctors', id, 'order-items'],
    queryFn: async () => {
      const res = await fetch(`/api/doctors/${id}/order-items`);
      return res.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (doctor) {
      setNextVisitNotes(doctor.nextVisitNotes || '');
      setLocalTags(doctor.tags || []);
      setLocalTier(doctor.tier ?? null);
    }
  }, [doctor]);

  const updateDoctorMutation = useMutation({
    mutationFn: async (data: Partial<Doctor>) => {
      const res = await apiRequest('PATCH', `/api/doctors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/doctors', id] });
      toast({ title: 'Updated', description: 'Doctor details have been updated.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update doctor.', variant: 'destructive' });
    },
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: async () => { await apiRequest('DELETE', `/api/doctors/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/doctors'] });
      toast({ title: 'Deactivated', description: 'Doctor has been deactivated.' });
      navigate('/doctors');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to deactivate doctor.', variant: 'destructive' });
    },
  });

  const doctorOrders = orders.filter(o => o.doctorId === Number(id));
  const doctorInvoices = invoices.filter(i => i.doctorId === Number(id));
  const assignedMR = mrs.find(m => m.id === doctor?.assignedMRId);
  const nearbyPharmacies = pharmacies.filter(p => p.city === doctor?.city).slice(0, 5);

  // ── Favorite Products (computed from order items) ─────────────────
  const favoriteProducts: FavProduct[] = useMemo(() => {
    const map = new Map<number, FavProduct>();
    for (const item of orderItems) {
      const key = item.productId;
      const existing = map.get(key);
      const rev = Number(item.total || 0);
      const qty = Number(item.quantity || 0);
      if (existing) {
        existing.totalQty += qty;
        existing.totalRevenue += rev;
        existing.orderCount += 1;
        if (item.orderDate > existing.lastOrdered) existing.lastOrdered = item.orderDate;
      } else {
        map.set(key, {
          productId: key,
          productName: (item as any).productName || `Product #${key}`,
          totalQty: qty,
          totalRevenue: rev,
          orderCount: 1,
          lastOrdered: item.orderDate || '',
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
  }, [orderItems]);

  // ── Order Behaviour (derived) ─────────────────────────────────────
  const orderBehavior = useMemo(() => {
    if (!doctorOrders.length) return null;
    const avg = doctorOrders.reduce((s, o) => s + Number(o.total || 0), 0) / doctorOrders.length;
    if (avg > 8000) return { label: 'Bulk Buyer', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', icon: '📦' };
    if (avg < 1500) return { label: 'Small Buyer', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', icon: '🧪' };
    return { label: 'Regular Buyer', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', icon: '✅' };
  }, [doctorOrders]);

  // ── Visit Frequency (derived) ─────────────────────────────────────
  const visitFrequency = useMemo(() => {
    if (doctorOrders.length < 2) return null;
    const sorted = [...doctorOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const first = new Date(sorted[0].createdAt).getTime();
    const last = new Date(sorted[sorted.length - 1].createdAt).getTime();
    const days = Math.round((last - first) / (1000 * 60 * 60 * 24));
    const avg = Math.round(days / (doctorOrders.length - 1));
    return avg;
  }, [doctorOrders]);

  // ── MR Visit timeline for Notes tab ──────────────────────────────
  const mrVisitTimeline: ActivityItem[] = useMemo(() => {
    return doctorOrders.slice(0, 8).map(o => ({
      id: `visit-${o.id}`,
      type: 'task' as const,
      title: `Order ${o.orderNumber} placed`,
      description: `₹${Number(o.total).toLocaleString()} — ${o.status}`,
      user: assignedMR?.name || 'MR',
      timestamp: new Date(o.createdAt).toISOString(),
      outcome: o.status === 'Delivered' ? 'positive' as const : 'neutral' as const,
    }));
  }, [doctorOrders, assignedMR]);

  const activities: ActivityItem[] = useMemo(() => {
    const orderActivities: ActivityItem[] = doctorOrders.slice(0, 5).map(order => ({
      id: `order-${order.id}`,
      type: 'task' as const,
      title: `Order ${order.orderNumber} - ${order.status}`,
      description: `₹${Number(order.total).toLocaleString()}`,
      user: 'System',
      timestamp: new Date(order.createdAt).toISOString(),
      outcome: order.status === 'Delivered' ? 'positive' as const : 'neutral' as const,
    }));
    const invoiceActivities: ActivityItem[] = doctorInvoices.slice(0, 3).map(inv => ({
      id: `invoice-${inv.id}`,
      type: 'note' as const,
      title: `Invoice ${inv.invoiceNumber}`,
      description: `₹${Number(inv.amount).toLocaleString()} - ${inv.status}`,
      user: 'System',
      timestamp: new Date(inv.createdAt).toISOString(),
      outcome: inv.status === 'Paid' ? 'positive' as const : 'neutral' as const,
    }));
    return [...orderActivities, ...invoiceActivities].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [doctorOrders, doctorInvoices]);

  const salesData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    return months.slice(0, currentMonth + 1).map((month, index) => {
      const monthOrders = doctorOrders.filter(o => new Date(o.createdAt).getMonth() === index);
      return { month, revenue: monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0), orders: monthOrders.length };
    });
  }, [doctorOrders]);

  const handleLinkChemist = () => {
    if (!chemistForm.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter chemist name.', variant: 'destructive' });
      return;
    }
    updateDoctorMutation.mutate({
      nearbyChemistName: chemistForm.name,
      nearbyChemistPhone: chemistForm.phone || null,
      nearbyChemistAddress: chemistForm.address || null,
    });
    setLinkChemistOpen(false);
    setChemistForm({ name: '', phone: '', address: '' });
  };

  const handleLinkPharmacy = (pharmacy: Pharmacy) => {
    updateDoctorMutation.mutate({
      nearbyChemistName: pharmacy.name,
      nearbyChemistPhone: pharmacy.phone || null,
      nearbyChemistAddress: pharmacy.address || null,
    });
    setLinkChemistOpen(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const uploadedUrls: string[] = [...(doctor?.clinicImages || [])];
      for (const file of Array.from(files)) {
        const response = await fetch('/api/uploads/request-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });
        if (!response.ok) throw new Error('Failed to get upload URL');
        const { uploadURL, objectPath } = await response.json();
        await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        uploadedUrls.push(objectPath as string);
      }
      await updateDoctorMutation.mutateAsync({ clinicImages: uploadedUrls });
      toast({ title: 'Photos Uploaded', description: `${files.length} photo(s) uploaded successfully.` });
    } catch {
      toast({ title: 'Upload Failed', description: 'Failed to upload photos. Please try again.', variant: 'destructive' });
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async (index: number) => {
    const updatedImages = [...(doctor?.clinicImages || [])];
    updatedImages.splice(index, 1);
    updateDoctorMutation.mutate({ clinicImages: updatedImages });
  };

  const handleBusinessCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCard(true);
    try {
      const res = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadURL, objectPath } = await res.json();
      await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      await updateDoctorMutation.mutateAsync({ businessCardUrl: objectPath as string });
      toast({ title: 'Business Card Saved', description: "Doctor's business card has been uploaded." });
    } catch {
      toast({ title: 'Upload Failed', description: 'Could not upload business card.', variant: 'destructive' });
    } finally {
      setUploadingCard(false);
      if (cardInputRef.current) cardInputRef.current.value = '';
    }
  };

  const handleOpenEdit = () => {
    if (doctor) {
      setEditForm({
        name: doctor.name || '',
        specialization: doctor.specialization || '',
        clinic: doctor.clinic || '',
        city: doctor.city || '',
        state: doctor.state || '',
        phone: doctor.phone || '',
        email: doctor.email || '',
        address: doctor.address || '',
        creditLimit: String(doctor.creditLimit || '0'),
        importance: doctor.importance || 'Medium',
        whatsappNumber: doctor.whatsappNumber || '',
        receptionistName: doctor.receptionistName || '',
        receptionistPhone: doctor.receptionistPhone || '',
      });
      setEditOpen(true);
    }
  };

  const handleSaveEdit = () => {
    updateDoctorMutation.mutate({
      name: editForm.name,
      specialization: editForm.specialization || null,
      clinic: editForm.clinic || null,
      city: editForm.city,
      state: editForm.state || null,
      phone: editForm.phone || null,
      email: editForm.email || null,
      address: editForm.address || null,
      creditLimit: editForm.creditLimit,
      importance: editForm.importance as 'High' | 'Medium' | 'Low',
      whatsappNumber: editForm.whatsappNumber || null,
      receptionistName: editForm.receptionistName || null,
      receptionistPhone: editForm.receptionistPhone || null,
    });
    setEditOpen(false);
  };

  const handleDelete = () => {
    deleteDoctorMutation.mutate();
    setDeleteOpen(false);
  };

  const handleSaveNextVisitNotes = async () => {
    setSavingNotes(true);
    await updateDoctorMutation.mutateAsync({ nextVisitNotes });
    setSavingNotes(false);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTags = [...localTags, tagInput.trim()];
      setLocalTags(newTags);
      setTagInput('');
      updateDoctorMutation.mutate({ tags: newTags });
    }
  };

  const handleRemoveTag = (idx: number) => {
    const newTags = localTags.filter((_, i) => i !== idx);
    setLocalTags(newTags);
    updateDoctorMutation.mutate({ tags: newTags });
  };

  const handleSetTier = (t: number) => {
    const newTier = localTier === t ? null : t;
    setLocalTier(newTier);
    updateDoctorMutation.mutate({ tier: newTier ?? undefined });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Doctor not found</p>
      </div>
    );
  }

  const totalRevenue = doctorOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const avgOrderValue = doctorOrders.length > 0 ? totalRevenue / doctorOrders.length : 0;

  const sourceColorMap: Record<string, string> = {
    'Direct': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    'Referral': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    'Cold Call': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    'Conference': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    'Social Media': 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  };

  const quickActions: QuickAction[] = [
    {
      id: 'call', label: 'Call', icon: 'phone',
      onClick: () => { if (doctor.phone) window.open(`tel:${doctor.phone}`); else toast({ title: 'No phone number available' }); },
    },
    {
      id: 'whatsapp', label: 'WhatsApp', icon: 'message',
      onClick: () => { const n = doctor.whatsappNumber || doctor.phone; if (n) window.open(`https://wa.me/${n.replace(/\D/g, '')}`); else toast({ title: 'No WhatsApp number available' }); },
    },
    {
      id: 'email', label: 'Email', icon: 'email',
      onClick: () => { if (doctor.email) window.open(`mailto:${doctor.email}`); else toast({ title: 'No email available' }); },
    },
    { id: 'create-order', label: 'Create Order', icon: 'package', onClick: () => navigate(`/orders/create?doctorId=${doctor.id}`) },
    { id: 'view-statement', label: 'View Statement', icon: 'document', onClick: () => navigate(`/customer-statements?doctorId=${doctor.id}`) },
    { id: 'credit-limit', label: 'Credit Limit', icon: 'payment', onClick: () => toast({ title: 'Credit Limit', description: `Current limit: ₹${Number(doctor.creditLimit || 0).toLocaleString()}` }) },
    { id: 'generate-quote', label: 'Generate Quote', icon: 'document', onClick: () => toast({ title: 'Quote Generated', description: 'A new quote has been created for this doctor' }) },
    { id: 'send-samples', label: 'Send Samples', icon: 'package', onClick: () => toast({ title: 'Sample Request Created', description: 'Sample dispatch request has been submitted' }) },
    { id: 'share-brochure', label: 'Share Brochure', icon: 'download', onClick: () => toast({ title: 'Brochure Shared', description: 'Product brochure has been sent via email/WhatsApp' }) },
  ];

  const tierLabels: Record<number, { label: string; desc: string; color: string }> = {
    1: { label: 'Tier 1', desc: 'Premium', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300' },
    2: { label: 'Tier 2', desc: 'Standard', color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300' },
    3: { label: 'Tier 3', desc: 'Basic', color: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <DetailPageHeader
        title={doctor.name}
        subtitle={`Code: ${doctor.code}`}
        status={doctor.isActive ? 'Active' : 'Inactive'}
        backPath="/doctors"
        primaryActions={
          <Button variant="outline" onClick={handleOpenEdit} data-testid="button-edit">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── MAIN COLUMN ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Business Card + Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BusinessCard
              name={doctor.name}
              title={doctor.specialization || undefined}
              organization={doctor.clinic || undefined}
              phone={doctor.phone || undefined}
              email={doctor.email || undefined}
              address={doctor.address || undefined}
              city={doctor.city || undefined}
              state={doctor.state || undefined}
              importance={doctor.importance as 'High' | 'Medium' | 'Low' | undefined}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-display font-semibold" data-testid="stat-orders">{doctorOrders.length}</p>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-display font-semibold" data-testid="stat-revenue">₹{(totalRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-display font-semibold" data-testid="stat-aov">₹{avgOrderValue.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Avg Order Value</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg" data-testid="stat-outstanding">
                    <p className="text-2xl font-display font-semibold text-warning">
                      ₹{(Number(doctor.outstanding || 0) / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Chart */}
          <SalesChart data={salesData} title="Sales Performance" chartType="area" />

          {/* ── FAVORITE PRODUCTS ─────────────────────────────────── */}
          <Card data-testid="card-favorite-products">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Favourite Products
                <span className="ml-auto text-xs text-muted-foreground font-normal">Auto-generated from orders</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {favoriteProducts.length > 0 ? (
                <div className="space-y-2">
                  {favoriteProducts.map((fp, idx) => (
                    <div
                      key={fp.productId}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                      data-testid={`row-fav-product-${fp.productId}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-white' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-muted text-muted-foreground'}`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" data-testid={`text-fav-product-name-${fp.productId}`}>{fp.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {fp.orderCount} order{fp.orderCount !== 1 ? 's' : ''} · {fp.totalQty} units
                          {fp.lastOrdered && ` · Last: ${new Date(fp.lastOrdered).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-semibold" data-testid={`text-fav-product-revenue-${fp.productId}`}>₹{fp.totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No order history yet</p>
                  <p className="text-xs mt-1">Product preferences will appear after orders are placed</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card data-testid="card-contact-info">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted"><Phone className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Primary Phone</p>
                      <p className="font-medium" data-testid="text-phone">{doctor.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10"><MessageCircle className="h-4 w-4 text-success" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">WhatsApp</p>
                      <p className="font-medium" data-testid="text-whatsapp">{doctor.whatsappNumber || doctor.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted"><Mail className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium" data-testid="text-email">{doctor.email || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10"><User className="h-4 w-4 text-accent" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Receptionist</p>
                      <p className="font-medium" data-testid="text-receptionist-name">{doctor.receptionistName || 'Not provided'}</p>
                      {doctor.receptionistPhone && (
                        <p className="text-sm text-muted-foreground" data-testid="text-receptionist-phone">{doctor.receptionistPhone}</p>
                      )}
                    </div>
                  </div>
                  {doctor.website && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted"><Globe className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Website</p>
                        <a href={doctor.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline" data-testid="link-website">
                          {doctor.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          {(doctor.socialLinkedIn || doctor.socialFacebook || doctor.socialTwitter || doctor.socialInstagram) && (
            <Card data-testid="card-social-links">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />Social Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {doctor.socialLinkedIn && (
                    <a href={doctor.socialLinkedIn} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80" data-testid="link-linkedin">
                      <Linkedin className="h-4 w-4 text-[#0077b5]" /><span className="text-sm">LinkedIn</span>
                    </a>
                  )}
                  {doctor.socialFacebook && (
                    <a href={doctor.socialFacebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80" data-testid="link-facebook">
                      <Facebook className="h-4 w-4 text-[#1877f2]" /><span className="text-sm">Facebook</span>
                    </a>
                  )}
                  {doctor.socialTwitter && (
                    <a href={doctor.socialTwitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80" data-testid="link-twitter">
                      <Twitter className="h-4 w-4 text-[#1da1f2]" /><span className="text-sm">Twitter</span>
                    </a>
                  )}
                  {doctor.socialInstagram && (
                    <a href={doctor.socialInstagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80" data-testid="link-instagram">
                      <Instagram className="h-4 w-4 text-[#e4405f]" /><span className="text-sm">Instagram</span>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clinic Photos */}
          <Card data-testid="card-clinic-images">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4" />Clinic Photos</CardTitle>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" data-testid="input-photo-upload" />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhotos} data-testid="button-upload-photos">
                  {uploadingPhotos ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="h-4 w-4 mr-2" />Upload Photos</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {doctor.clinicImages && doctor.clinicImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {doctor.clinicImages.map((img, index) => (
                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-muted group" data-testid={`img-clinic-${index}`}>
                      <img src={img} alt={`Clinic ${index + 1}`} className="w-full h-full object-cover" />
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemovePhoto(index)} data-testid={`button-remove-photo-${index}`}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No clinic photos uploaded yet</p>
                  <p className="text-sm mt-1">Upload exterior and interior photos of the clinic</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Google Maps */}
          {(doctor.googleMapsUrl || doctor.address) && (
            <Card data-testid="card-location">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctor.address && (
                  <div className="flex items-start gap-3">
                    <Navigation className="h-4 w-4 mt-1 text-muted-foreground" />
                    <p className="text-sm" data-testid="text-address">{doctor.address}, {doctor.city}, {doctor.state}</p>
                  </div>
                )}
                {doctor.googleMapsUrl && (
                  <div className="rounded-lg overflow-hidden border h-48">
                    <iframe
                      src={doctor.googleMapsUrl.includes('embed') ? doctor.googleMapsUrl : `https://www.google.com/maps/embed?pb=${encodeURIComponent(doctor.googleMapsUrl)}`}
                      width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade" title="Location Map" data-testid="iframe-map"
                    />
                  </div>
                )}
                {doctor.googleMapsUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={doctor.googleMapsUrl} target="_blank" rel="noopener noreferrer" data-testid="link-google-maps">
                      <MapPin className="h-4 w-4 mr-2" />Open in Google Maps
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Nearby Chemist */}
          <Card data-testid="card-nearby-chemist">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" />Linked Chemist / Micro-pharmacy</CardTitle>
              {!doctor.nearbyChemistName && (
                <Button variant="outline" size="sm" onClick={() => setLinkChemistOpen(true)} data-testid="button-link-chemist">
                  <Plus className="h-4 w-4 mr-2" />Link Chemist
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {doctor.nearbyChemistName ? (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium" data-testid="text-chemist-name">{doctor.nearbyChemistName}</p>
                    <Button variant="ghost" size="sm" onClick={() => { setChemistForm({ name: doctor.nearbyChemistName || '', phone: doctor.nearbyChemistPhone || '', address: doctor.nearbyChemistAddress || '' }); setLinkChemistOpen(true); }} data-testid="button-edit-chemist">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                  {doctor.nearbyChemistPhone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" /><span data-testid="text-chemist-phone">{doctor.nearbyChemistPhone}</span>
                    </div>
                  )}
                  {doctor.nearbyChemistAddress && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" /><span data-testid="text-chemist-address">{doctor.nearbyChemistAddress}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No chemist linked yet</p>
                  <p className="text-sm mt-1">Link a nearby chemist or micro-pharmacy</p>
                  {nearbyPharmacies.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Pharmacies in {doctor.city}:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {nearbyPharmacies.map(p => (
                          <Button key={p.id} variant="outline" size="sm" onClick={() => handleLinkPharmacy(p)} data-testid={`button-link-pharmacy-${p.id}`}>{p.name}</Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── TABS: Orders / Invoices / MR Notes / Activity ─────── */}
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="orders" className="flex items-center gap-1 text-xs sm:text-sm">
                <Package className="h-4 w-4" />
                Orders ({doctorOrders.length})
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-1 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                Invoices ({doctorInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="mr-notes" className="flex items-center gap-1 text-xs sm:text-sm" data-testid="tab-mr-notes">
                <MessageSquare className="h-4 w-4" />
                MR Notes
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-1 text-xs sm:text-sm">
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Orders tab */}
            <TabsContent value="orders" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  {doctorOrders.length > 0 ? (
                    <div className="space-y-2">
                      {doctorOrders.slice(0, 10).map(order => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover-elevate cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
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
                    <p className="text-center text-muted-foreground py-8">No orders yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices tab */}
            <TabsContent value="invoices" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  {doctorInvoices.length > 0 ? (
                    <div className="space-y-2">
                      {doctorInvoices.slice(0, 10).map(inv => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover-elevate cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <div>
                            <p className="font-mono text-sm font-medium">{inv.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-semibold">₹{Number(inv.amount).toLocaleString()}</p>
                            <Badge variant={inv.status === 'Paid' ? 'default' : inv.status === 'Overdue' ? 'destructive' : 'outline'} className="text-xs">{inv.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No invoices</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── MR Notes & History tab ──────────────────────────── */}
            <TabsContent value="mr-notes" className="mt-4 space-y-4">

              {/* Next Visit Notes */}
              <Card data-testid="card-next-visit-notes">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Next Visit — Planning Notes
                    {assignedMR && (
                      <span className="ml-auto text-xs font-normal text-muted-foreground flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />{assignedMR.name}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={nextVisitNotes}
                    onChange={e => setNextVisitNotes(e.target.value)}
                    placeholder="Write notes for the next MR visit — key talking points, samples to carry, follow-up from last visit, doctor's preferences..."
                    className="min-h-[120px] resize-none"
                    data-testid="textarea-next-visit-notes"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {doctor.nextVisitNotes
                        ? `Last saved · ${new Date(doctor.updatedAt).toLocaleDateString()}`
                        : 'Not saved yet'}
                    </p>
                    <Button
                      size="sm"
                      onClick={handleSaveNextVisitNotes}
                      disabled={savingNotes || updateDoctorMutation.isPending}
                      data-testid="button-save-visit-notes"
                    >
                      {savingNotes ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                      Save Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Key Stats strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center" data-testid="stat-mr-total-visits">
                  <p className="text-lg font-semibold">{doctorOrders.length}</p>
                  <p className="text-xs text-muted-foreground">Total Visits</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center" data-testid="stat-mr-visit-freq">
                  <p className="text-lg font-semibold">{visitFrequency ? `${visitFrequency}d` : '—'}</p>
                  <p className="text-xs text-muted-foreground">Avg Frequency</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center" data-testid="stat-mr-last-contact">
                  <p className="text-lg font-semibold">
                    {doctor.lastContactedAt ? `${Math.floor((Date.now() - new Date(doctor.lastContactedAt).getTime()) / 86400000)}d` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Since Last Visit</p>
                </div>
              </div>

              {/* MR Visit timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    MR Interaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mrVisitTimeline.length > 0 ? (
                    <ActivityTimeline activities={mrVisitTimeline} showAddForm={false} entityType="doctor" />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Repeat className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No visit history yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lead origin notes (if exists) */}
              {originLead?.notes && (
                <Card className="border-l-4 border-l-amber-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-amber-500" />
                      Lead Acquisition Notes
                      <span className="text-xs font-normal text-muted-foreground">— carried forward from lead stage</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-lead-notes">{originLead.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Activity tab */}
            <TabsContent value="activity" className="mt-4">
              <ActivityTimeline activities={activities} showAddForm={false} entityType="doctor" />
            </TabsContent>
          </Tabs>
        </div>

        {/* ── SIDEBAR ───────────────────────────────────────────────── */}
        <div className="space-y-6">
          <QuickActionsCard actions={quickActions} layout="grid" />

          {/* Business Card Photo */}
          <input ref={cardInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleBusinessCardUpload} data-testid="input-business-card-file" />
          <Card data-testid="card-business-card-photo">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-violet-500" />
                Business Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {doctor.businessCardUrl ? (
                <>
                  <a href={doctor.businessCardUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={doctor.businessCardUrl}
                      alt="Doctor's Business Card"
                      className="w-full rounded-lg border object-contain max-h-48 bg-muted/20 hover:opacity-90 transition-opacity cursor-zoom-in"
                      data-testid="img-business-card"
                    />
                  </a>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => cardInputRef.current?.click()} disabled={uploadingCard} data-testid="button-replace-business-card">
                      {uploadingCard ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Uploading...</> : <><Upload className="h-3 w-3 mr-1" />Replace</>}
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => updateDoctorMutation.mutate({ businessCardUrl: undefined })} data-testid="button-remove-business-card">
                      Remove
                    </Button>
                  </div>
                </>
              ) : (
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all"
                  onClick={() => cardInputRef.current?.click()}
                  data-testid="area-upload-business-card"
                >
                  {uploadingCard ? (
                    <><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><p className="text-xs text-muted-foreground">Uploading...</p></>
                  ) : (
                    <><Upload className="h-5 w-5 text-muted-foreground/50" /><p className="text-xs text-muted-foreground font-medium">Upload Business Card</p><p className="text-[10px] text-muted-foreground/60">Tap to take a photo or upload</p></>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Credit Limit</span>
                <span className="font-mono font-medium">₹{Number(doctor.creditLimit || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Outstanding</span>
                <span className="font-mono font-medium text-yellow-600">₹{Number(doctor.outstanding || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available Credit</span>
                <span className="font-mono font-medium text-green-600">
                  ₹{Math.max(0, Number(doctor.creditLimit || 0) - Number(doctor.outstanding || 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pricing Slab</span>
                <Badge variant="secondary">{doctor.pricingSlabId ? `Slab ${doctor.pricingSlabId}` : 'Default'}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Assigned MR</span>
                <span className="font-medium">{assignedMR?.name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">GSTIN</span>
                <span className="font-mono text-sm">{doctor.gstin || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Importance</span>
                <Badge variant="secondary">{doctor.importance || 'Medium'}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Customer Since</span>
                <span className="text-sm">{new Date(doctor.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* ── INTELLIGENCE & METADATA ──────────────────────────── */}
          <Card data-testid="card-intelligence">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-500" />
                Intelligence & Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Order Behaviour */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <BarChart2 className="h-3 w-3" /> AI Order Behaviour
                  <span className="ml-auto text-[10px] italic">auto</span>
                </p>
                {orderBehavior ? (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${orderBehavior.color}`} data-testid="badge-order-behavior">
                    <span>{orderBehavior.icon}</span>
                    {orderBehavior.label}
                    <span className="text-[10px] opacity-70 ml-1">avg ₹{avgOrderValue.toFixed(0)}/order</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No order data yet</span>
                )}
              </div>

              {/* Manual Pricing Tier */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Pricing Tier
                  <span className="ml-auto text-[10px] italic">manual</span>
                </p>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => handleSetTier(t)}
                      data-testid={`button-tier-${t}`}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${localTier === t ? tierLabels[t].color + ' ring-2 ring-offset-1 ring-violet-400' : 'border-border text-muted-foreground hover:border-violet-300 hover:text-violet-600'}`}
                    >
                      {tierLabels[t].label}
                      <span className="block text-[9px] font-normal opacity-70">{tierLabels[t].desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visit Frequency */}
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Repeat className="h-3 w-3" /> Auto Visit Frequency
                  <span className="ml-auto text-[10px] italic">auto</span>
                </p>
                <p className="text-sm font-medium" data-testid="text-visit-frequency">
                  {visitFrequency ? `Every ~${visitFrequency} days` : doctorOrders.length === 1 ? 'Only 1 order placed' : 'No data'}
                </p>
              </div>

              {/* Manual Tags */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Tags
                  <span className="ml-auto text-[10px] italic">manual</span>
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {localTags.map((tag, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 text-xs rounded-full" data-testid={`tag-${i}`}>
                      {tag}
                      <button onClick={() => handleRemoveTag(i)} className="ml-0.5 hover:text-red-500" data-testid={`button-remove-tag-${i}`}><X className="h-2.5 w-2.5" /></button>
                    </div>
                  ))}
                </div>
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type tag + Enter"
                  className="h-7 text-xs"
                  data-testid="input-tag"
                />
              </div>

              {/* Timestamp metadata */}
              <div className="pt-2 border-t space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Created</span>
                  <span data-testid="text-created-at">{new Date(doctor.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Modified</span>
                  <span data-testid="text-updated-at">{new Date(doctor.updatedAt).toLocaleDateString()}</span>
                </div>
                {doctor.lastContactedAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3" />Last Activity</span>
                    <span data-testid="text-last-activity">{new Date(doctor.lastContactedAt).toLocaleDateString()}</span>
                  </div>
                )}
                {assignedMR && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1"><UserCheck className="h-3 w-3" />MR Assigned</span>
                    <span data-testid="text-assigned-mr">{assignedMR.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── LEAD ORIGIN ──────────────────────────────────────── */}
          {originLead && (
            <Card className="border-l-4 border-l-violet-400" data-testid="card-lead-origin">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-violet-500" />
                  Lead Origin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Business Card Image */}
                {originLead.businessCardUrl && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Business Card</p>
                    <a href={originLead.businessCardUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={originLead.businessCardUrl}
                        alt="Doctor's Business Card"
                        className="w-full rounded-lg border object-cover max-h-32 hover:opacity-80 transition-opacity"
                        data-testid="img-origin-business-card"
                      />
                    </a>
                  </div>
                )}

                {/* Lead Metadata */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Lead Code</span>
                    <span className="font-mono text-xs" data-testid="text-origin-lead-code">{originLead.code}</span>
                  </div>
                  {originLead.source && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Source</span>
                      <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceColorMap[originLead.source] || 'bg-muted text-muted-foreground'}`} data-testid="badge-lead-source">
                        {originLead.source}
                      </div>
                    </div>
                  )}
                  {originLead.priority && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Priority</span>
                      <Badge variant={originLead.priority === 'High' ? 'destructive' : originLead.priority === 'Low' ? 'outline' : 'secondary'} className="text-xs" data-testid="badge-lead-priority">
                        {originLead.priority}
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Stage at Conversion</span>
                    <Badge variant="outline" className="text-xs" data-testid="badge-lead-stage">{originLead.stage}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Lead Created</span>
                    <span className="text-xs" data-testid="text-lead-created">{new Date(originLead.createdAt).toLocaleDateString()}</span>
                  </div>
                  {originLead.nextFollowUp && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Last Follow-up</span>
                      <span className="text-xs" data-testid="text-lead-followup">{new Date(originLead.nextFollowUp).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Contact Details from Lead */}
                {(originLead.email || originLead.whatsappNumber || originLead.website) && (
                  <div className="pt-2 border-t space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Contact (from lead)</p>
                    {originLead.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">Email</span>
                        <a href={`mailto:${originLead.email}`} className="text-xs text-blue-500 hover:underline truncate" data-testid="link-origin-email">{originLead.email}</a>
                      </div>
                    )}
                    {originLead.whatsappNumber && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">WhatsApp</span>
                        <a href={`https://wa.me/${originLead.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline" data-testid="link-origin-whatsapp">{originLead.whatsappNumber}</a>
                      </div>
                    )}
                    {originLead.website && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">Website</span>
                        <a href={originLead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate" data-testid="link-origin-website">{originLead.website}</a>
                      </div>
                    )}
                  </div>
                )}

                {/* Social Links from Lead */}
                {(originLead.socialLinkedIn || originLead.socialFacebook || originLead.socialTwitter || originLead.socialInstagram) && (
                  <div className="pt-2 border-t space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Social (from lead)</p>
                    <div className="flex flex-wrap gap-2">
                      {originLead.socialLinkedIn && (
                        <a href={originLead.socialLinkedIn} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline" data-testid="link-origin-linkedin">LinkedIn</a>
                      )}
                      {originLead.socialFacebook && (
                        <a href={originLead.socialFacebook} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline" data-testid="link-origin-facebook">Facebook</a>
                      )}
                      {originLead.socialTwitter && (
                        <a href={originLead.socialTwitter} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-500 hover:underline" data-testid="link-origin-twitter">Twitter</a>
                      )}
                      {originLead.socialInstagram && (
                        <a href={originLead.socialInstagram} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-500 hover:underline" data-testid="link-origin-instagram">Instagram</a>
                      )}
                    </div>
                  </div>
                )}

                {/* Clinic Images from Lead */}
                {originLead.clinicImages && originLead.clinicImages.length > 0 && (
                  <div className="pt-2 border-t space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Clinic Photos (from lead)</p>
                    <div className="grid grid-cols-3 gap-1">
                      {originLead.clinicImages.slice(0, 6).map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                          <img src={img} alt={`Clinic ${i + 1}`} className="w-full h-14 object-cover rounded border hover:opacity-80 transition-opacity" data-testid={`img-origin-clinic-${i}`} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes from Lead */}
                {originLead.notes && (
                  <div className="pt-2 border-t space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Lead Notes</p>
                    <p className="text-xs text-foreground/80 italic leading-relaxed" data-testid="text-origin-notes">{originLead.notes}</p>
                  </div>
                )}

                {/* Navigate to Lead */}
                <div className="pt-1 border-t">
                  <a href={`/leads/${originLead.id}`} className="text-xs text-violet-500 hover:underline flex items-center gap-1" data-testid="link-origin-lead">
                    <ArrowUpRight className="h-3 w-3" /> View original lead record
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── DIALOGS ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Doctor"
        description="Are you sure you want to delete this doctor? This action cannot be undone."
        confirmLabel="Delete"
        destructive={true}
        onConfirm={handleDelete}
      />

      <Dialog open={linkChemistOpen} onOpenChange={setLinkChemistOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader><DialogTitle>Link Chemist / Micro-pharmacy</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chemist-name">Chemist Name *</Label>
              <Input id="chemist-name" value={chemistForm.name} onChange={e => setChemistForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter chemist/pharmacy name" data-testid="input-chemist-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chemist-phone">Phone</Label>
              <Input id="chemist-phone" value={chemistForm.phone} onChange={e => setChemistForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" data-testid="input-chemist-phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chemist-address">Address</Label>
              <Input id="chemist-address" value={chemistForm.address} onChange={e => setChemistForm(p => ({ ...p, address: e.target.value }))} placeholder="Address" data-testid="input-chemist-address" />
            </div>
            {nearbyPharmacies.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Or select from existing pharmacies in {doctor.city}:</p>
                <div className="flex flex-wrap gap-2">
                  {nearbyPharmacies.map(p => (
                    <Button key={p.id} variant="outline" size="sm" onClick={() => handleLinkPharmacy(p)} data-testid={`dialog-link-pharmacy-${p.id}`}>{p.name}</Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkChemistOpen(false)}>Cancel</Button>
            <Button onClick={handleLinkChemist} disabled={updateDoctorMutation.isPending} data-testid="button-save-chemist">
              {updateDoctorMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-lg sm:w-full" data-testid="dialog-edit-doctor">
          <DialogHeader><DialogTitle>Edit Doctor</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Doctor Name *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} data-testid="input-edit-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Specialization</Label>
                <Input value={editForm.specialization} onChange={e => setEditForm(p => ({ ...p, specialization: e.target.value }))} data-testid="input-edit-specialization" />
              </div>
              <div>
                <Label>Clinic</Label>
                <Input value={editForm.clinic} onChange={e => setEditForm(p => ({ ...p, clinic: e.target.value }))} data-testid="input-edit-clinic" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City *</Label>
                <Input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} data-testid="input-edit-city" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={editForm.state} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} data-testid="input-edit-state" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} data-testid="input-edit-phone" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} data-testid="input-edit-email" />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} data-testid="input-edit-address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>WhatsApp Number</Label>
                <Input value={editForm.whatsappNumber} onChange={e => setEditForm(p => ({ ...p, whatsappNumber: e.target.value }))} data-testid="input-edit-whatsapp" />
              </div>
              <div>
                <Label>Credit Limit (₹)</Label>
                <Input type="number" value={editForm.creditLimit} onChange={e => setEditForm(p => ({ ...p, creditLimit: e.target.value }))} data-testid="input-edit-credit" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Receptionist Name</Label>
                <Input value={editForm.receptionistName} onChange={e => setEditForm(p => ({ ...p, receptionistName: e.target.value }))} data-testid="input-edit-receptionist-name" />
              </div>
              <div>
                <Label>Receptionist Phone</Label>
                <Input value={editForm.receptionistPhone} onChange={e => setEditForm(p => ({ ...p, receptionistPhone: e.target.value }))} data-testid="input-edit-receptionist-phone" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} data-testid="button-cancel-edit">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.name || !editForm.city || updateDoctorMutation.isPending} data-testid="button-save-edit">
              {updateDoctorMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
