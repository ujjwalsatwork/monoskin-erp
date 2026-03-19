import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { RowActionsMenu } from '@/components/shared/RowActionsMenu';
import { ExportModal } from '@/components/shared/ExportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Eye, EyeOff, Edit, Plus, Search, Filter, DollarSign, MapPin, AlertTriangle, TrendingUp, CreditCard, Calendar, FileText, Star, Map, Users, ShoppingCart, Clock, Download, ArrowUpDown, Bell, Send, FileVideo, BookOpen, PhoneCall } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Pharmacy, Doctor, PricingSlab } from '@shared/schema';

interface DashboardMetrics {
  totalPharmacies: number;
  newPharmacies: number;
  highImportancePharmacies: number;
  pharmaciesAtRisk: number;
  ordersLast30Days: number;
  invoicesDueThisWeek: number;
  pharmaciesWithCoords: Array<{
    id: number;
    name: string;
    city: string;
    latitude: number;
    longitude: number;
    outstanding: number;
    creditLimit: number;
    importance: string;
  }>;
}

export default function Pharmacies() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [importanceFilter, setImportanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastOrderDate' | 'updatedAt' | 'outstanding' | 'creditLimit'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [revealedPhoneId, setRevealedPhoneId] = useState<number | null>(null);
  const [sendMaterialDialog, setSendMaterialDialog] = useState(false);
  const [materialPharmacy, setMaterialPharmacy] = useState<Pharmacy | null>(null);
  const [newPharmacy, setNewPharmacy] = useState({ 
    name: '', 
    city: '', 
    state: '', 
    phone: '', 
    email: '',
    doctorId: 0, 
    pricingSlabId: 0, 
    creditLimit: 30000,
    importance: 'Medium',
    latitude: '',
    longitude: '',
  });

  const { data: pharmacies = [], isLoading } = useQuery<Pharmacy[]>({
    queryKey: ['/api/pharmacies'],
  });

  const { data: dashboardMetrics } = useQuery<DashboardMetrics>({
    queryKey: ['/api/pharmacies/dashboard/metrics'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: pricingSlabs = [] } = useQuery<PricingSlab[]>({
    queryKey: ['/api/pricing-slabs'],
  });

  const createPharmacyMutation = useMutation({
    mutationFn: async (data: Partial<Pharmacy>) => {
      const code = `PHA${Date.now().toString().slice(-6)}`;
      const res = await apiRequest('POST', '/api/pharmacies', { ...data, code });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacies/dashboard/metrics'] });
      toast({ title: 'Pharmacy Created', description: 'New pharmacy has been added successfully' });
      setCreateDialogOpen(false);
      setNewPharmacy({ name: '', city: '', state: '', phone: '', email: '', doctorId: 0, pricingSlabId: 0, creditLimit: 30000, importance: 'Medium', latitude: '', longitude: '' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create pharmacy', variant: 'destructive' });
    },
  });

  const filteredAndSortedPharmacies = useMemo(() => {
    let result = pharmacies.filter((pharmacy: Pharmacy) => {
      const matchesSearch = pharmacy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pharmacy.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = cityFilter === 'all' || pharmacy.city === cityFilter;
      const matchesState = stateFilter === 'all' || pharmacy.state === stateFilter;
      const matchesImportance = importanceFilter === 'all' || pharmacy.importance === importanceFilter;
      return matchesSearch && matchesCity && matchesState && matchesImportance;
    });
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'lastOrderDate':
          const dateA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
          const dateB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'updatedAt':
          const updA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const updB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          comparison = updA - updB;
          break;
        case 'outstanding':
          comparison = Number(a.outstanding || 0) - Number(b.outstanding || 0);
          break;
        case 'creditLimit':
          comparison = Number(a.creditLimit || 0) - Number(b.creditLimit || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [pharmacies, searchQuery, cityFilter, stateFilter, importanceFilter, sortBy, sortOrder]);

  const cities = [...new Set(pharmacies.map((p: Pharmacy) => p.city).filter(Boolean))];
  const states = [...new Set(pharmacies.map((p: Pharmacy) => p.state).filter(Boolean))];

  const getDoctorName = (doctorId: number | null) => {
    if (!doctorId) return '—';
    return doctors.find(d => d.id === doctorId)?.name || '—';
  };

  const maskPhone = (phone: string | null | undefined) => {
    if (!phone) return '—';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 4) return `●●● ●●● ${digits.slice(-4)}`;
    return '●●●●●●●●●●';
  };

  const handleRevealPhone = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedPhoneId(prev => (prev === id ? null : id));
  };

  const handlePaymentReminder = (pharmacy: Pharmacy, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: 'Payment Reminder Sent',
      description: `Reminder triggered for ${pharmacy.name} — ₹${Number(pharmacy.outstanding || 0).toLocaleString()} outstanding.`,
    });
  };

  const handleSendMaterial = (pharmacy: Pharmacy, e: React.MouseEvent) => {
    e.stopPropagation();
    setMaterialPharmacy(pharmacy);
    setSendMaterialDialog(true);
  };

  const getPricingSlabName = (slabId: number | null) => {
    if (!slabId) return '-';
    return pricingSlabs.find(s => s.id === slabId)?.name || '-';
  };

  const totalOutstanding = pharmacies.reduce((sum: number, p: Pharmacy) => sum + Number(p.outstanding || 0), 0);
  const totalCreditLimit = pharmacies.reduce((sum: number, p: Pharmacy) => sum + Number(p.creditLimit || 0), 0);
  const creditUtilization = totalCreditLimit > 0 ? (totalOutstanding / totalCreditLimit * 100).toFixed(1) : 0;

  const exportColumns = [
    { key: 'code', label: 'Code', defaultSelected: true },
    { key: 'name', label: 'Name', defaultSelected: true },
    { key: 'city', label: 'City', defaultSelected: true },
    { key: 'state', label: 'State' },
    { key: 'phone', label: 'Phone' },
    { key: 'importance', label: 'Importance' },
    { key: 'creditLimit', label: 'Credit Limit' },
    { key: 'outstanding', label: 'Outstanding' },
  ];

  const handleCreate = () => {
    createPharmacyMutation.mutate({
      name: newPharmacy.name,
      city: newPharmacy.city,
      state: newPharmacy.state,
      phone: newPharmacy.phone,
      email: newPharmacy.email,
      doctorId: newPharmacy.doctorId || null,
      pricingSlabId: newPharmacy.pricingSlabId || null,
      creditLimit: String(newPharmacy.creditLimit),
      importance: newPharmacy.importance as 'High' | 'Medium' | 'Low',
      latitude: newPharmacy.latitude || null,
      longitude: newPharmacy.longitude || null,
    });
  };

  const getImportanceBadge = (importance: string | null) => {
    if (!importance) return null;
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'High': 'destructive',
      'Medium': 'secondary',
      'Low': 'outline',
    };
    return <Badge variant={variants[importance] || 'secondary'}>{importance}</Badge>;
  };

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatRelativeDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const columns: Column<Pharmacy>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground" data-testid={`id-${row.id}`}>{row.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Pharmacy Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium" data-testid={`name-${row.id}`}>{row.name}</p>
          <div className="mt-1">{getImportanceBadge(row.importance)}</div>
        </div>
      ),
    },
    {
      key: 'linkedDoctors',
      header: 'Linked Doctors',
      render: (row) => {
        const docName = getDoctorName(row.doctorId);
        return (
          <div className="flex items-center gap-1.5" data-testid={`doctor-${row.id}`}>
            {docName !== '—' ? (
              <>
                <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{docName}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Phone Number',
      render: (row) => {
        const isRevealed = revealedPhoneId === row.id;
        return (
          <div className="flex items-center gap-2" data-testid={`phone-cell-${row.id}`}>
            <span className={`text-sm font-mono ${isRevealed ? '' : 'tracking-wider text-muted-foreground'}`} data-testid={`phone-value-${row.id}`}>
              {isRevealed ? (row.phone || '—') : maskPhone(row.phone)}
            </span>
            {row.phone && (
              <button
                onClick={(e) => handleRevealPhone(row.id, e)}
                className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
                title={isRevealed ? 'Hide phone number' : 'Reveal phone number'}
                data-testid={`button-reveal-phone-${row.id}`}
              >
                {isRevealed
                  ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  : <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'city',
      header: 'City',
      render: (row) => <span className="text-sm" data-testid={`city-${row.id}`}>{row.city || '—'}</span>,
    },
    {
      key: 'state',
      header: 'State',
      render: (row) => <span className="text-sm" data-testid={`state-${row.id}`}>{row.state || '—'}</span>,
    },
    {
      key: 'lastOrderDate',
      header: 'Last Sales Date',
      sortable: true,
      render: (row) => (
        <div className="text-sm" data-testid={`last-order-${row.id}`}>
          <span className={`font-medium ${!row.lastOrderDate ? 'text-muted-foreground' : ''}`}>
            {formatRelativeDate(row.lastOrderDate)}
          </span>
          {row.lastOrderDate && (
            <span className="block text-xs text-muted-foreground/70">{formatDate(row.lastOrderDate)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Contacted',
      sortable: true,
      render: (row) => (
        <div className="text-sm" data-testid={`last-contacted-${row.id}`}>
          <span className="font-medium">{formatRelativeDate(row.updatedAt)}</span>
          {row.updatedAt && (
            <span className="block text-xs text-muted-foreground/70">{formatDate(row.updatedAt)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1" data-testid={`row-actions-${row.id}`}>
          {/* Inline quick-action buttons */}
          <button
            onClick={(e) => handlePaymentReminder(row, e)}
            className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-400 transition-colors text-muted-foreground"
            title="Trigger Payment Reminder"
            data-testid={`button-payment-reminder-${row.id}`}
          >
            <Bell className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => handleSendMaterial(row, e)}
            className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-muted-foreground"
            title="Send Brochure / PDF / Video"
            data-testid={`button-send-material-${row.id}`}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
          {/* Full actions menu */}
          <RowActionsMenu actions={[
            { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => { setSelectedPharmacy(row); setDetailDialogOpen(true); } },
            { label: 'View Full Profile', icon: <Building2 className="h-4 w-4" />, onClick: () => navigate(`/pharmacies/${row.id}`) },
            { label: 'Trigger Payment Reminder', icon: <Bell className="h-4 w-4" />, onClick: () => toast({ title: 'Payment Reminder Sent', description: `Reminder sent to ${row.name}.` }) },
            { label: 'Send Brochure / PDF / Video', icon: <Send className="h-4 w-4" />, onClick: () => { setMaterialPharmacy(row); setSendMaterialDialog(true); } },
          ]} />
        </div>
      ),
    },
  ];

  // Get pharmacies at risk
  const pharmaciesAtRisk = pharmacies.filter((p: Pharmacy) => {
    const utilization = Number(p.outstanding || 0) / Number(p.creditLimit || 1) * 100;
    const lowEngagement = (p.engagementScore || 50) < 30;
    const highCreditRisk = utilization >= 80;
    const conversionIssues = (p.conversionFailures || 0) >= 3;
    return lowEngagement || highCreditRisk || conversionIssues;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pharmacies" description="Manage pharmacy partners" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pharmacies" 
        description="Manage pharmacy partners and monitor commercial risk"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create">
              <Plus className="h-4 w-4 mr-2" /> Add Pharmacy
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <TrendingUp className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="list" data-testid="tab-list">
            <Building2 className="h-4 w-4 mr-2" />
            All Pharmacies
          </TabsTrigger>
          <TabsTrigger value="map" data-testid="tab-map">
            <Map className="h-4 w-4 mr-2" />
            Map View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard 
              title="Total Pharmacies" 
              value={dashboardMetrics?.totalPharmacies || pharmacies.length} 
              icon={<Building2 className="h-5 w-5" />} 
              data-testid="stat-total-pharmacies" 
            />
            <StatCard 
              title="New This Month" 
              value={dashboardMetrics?.newPharmacies || 0} 
              icon={<Calendar className="h-5 w-5" />} 
              trend={dashboardMetrics?.newPharmacies && dashboardMetrics.newPharmacies > 0 ? { value: dashboardMetrics.newPharmacies, label: 'this month' } : undefined}
              data-testid="stat-new-pharmacies" 
            />
            <StatCard 
              title="High Importance" 
              value={dashboardMetrics?.highImportancePharmacies || 0} 
              icon={<Star className="h-5 w-5 text-yellow-500" />} 
              data-testid="stat-high-importance" 
            />
            <StatCard 
              title="At Risk" 
              value={dashboardMetrics?.pharmaciesAtRisk || pharmaciesAtRisk.length} 
              icon={<AlertTriangle className="h-5 w-5 text-destructive" />} 
              data-testid="stat-at-risk" 
            />
            <StatCard 
              title="Orders (30 Days)" 
              value={dashboardMetrics?.ordersLast30Days || 0} 
              icon={<ShoppingCart className="h-5 w-5" />} 
              data-testid="stat-orders-30days" 
            />
            <StatCard 
              title="Invoices Due" 
              value={dashboardMetrics?.invoicesDueThisWeek || 0} 
              icon={<FileText className="h-5 w-5" />} 
              subtitle="This Week"
              data-testid="stat-invoices-due" 
            />
          </div>

          {/* Financial Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Total Credit Limit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" data-testid="text-total-credit">₹{(totalCreditLimit / 100000).toFixed(2)}L</p>
                <p className="text-xs text-muted-foreground">Across all pharmacies</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" data-testid="text-total-outstanding">₹{(totalOutstanding / 100000).toFixed(2)}L</p>
                <p className="text-xs text-muted-foreground">Pending collections</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Credit Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${Number(creditUtilization) >= 80 ? 'text-destructive' : Number(creditUtilization) >= 50 ? 'text-yellow-600' : 'text-green-600'}`} data-testid="text-utilization">
                  {creditUtilization}%
                </p>
                <p className="text-xs text-muted-foreground">Average across pharmacies</p>
              </CardContent>
            </Card>
          </div>

          {/* Pharmacies at Risk Section */}
          {pharmaciesAtRisk.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Pharmacies at Risk
                </CardTitle>
                <CardDescription>
                  Pharmacies with low engagement, high credit utilization, or repeated conversion failures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pharmaciesAtRisk.slice(0, 5).map((pharmacy) => {
                    const utilization = Number(pharmacy.outstanding || 0) / Number(pharmacy.creditLimit || 1) * 100;
                    return (
                      <div 
                        key={pharmacy.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => navigate(`/pharmacies/${pharmacy.id}`)}
                        data-testid={`risk-pharmacy-${pharmacy.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                          </div>
                          <div>
                            <p className="font-medium">{pharmacy.name}</p>
                            <p className="text-xs text-muted-foreground">{pharmacy.city} | {pharmacy.code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-destructive">{utilization.toFixed(0)}% utilized</p>
                          <p className="text-xs text-muted-foreground">₹{Number(pharmacy.outstanding || 0).toLocaleString()} outstanding</p>
                        </div>
                      </div>
                    );
                  })}
                  {pharmaciesAtRisk.length > 5 && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => { setImportanceFilter('all'); setActiveTab('list'); }}
                      data-testid="button-view-all-risk"
                    >
                      View All {pharmaciesAtRisk.length} At-Risk Pharmacies
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats by City */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Distribution by City
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {cities.slice(0, 12).map((city) => {
                  const cityPharmacies = pharmacies.filter(p => p.city === city);
                  const cityOutstanding = cityPharmacies.reduce((sum, p) => sum + Number(p.outstanding || 0), 0);
                  return (
                    <div 
                      key={city} 
                      className="p-3 border rounded-lg text-center hover-elevate cursor-pointer"
                      onClick={() => { setCityFilter(city!); setActiveTab('list'); }}
                      data-testid={`city-stat-${city}`}
                    >
                      <p className="font-medium">{city}</p>
                      <p className="text-2xl font-bold">{cityPharmacies.length}</p>
                      <p className="text-xs text-muted-foreground">₹{(cityOutstanding / 1000).toFixed(0)}K outstanding</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4">
            {/* First row: Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search pharmacies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search" />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[180px]" data-testid="select-sort-by">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="lastOrderDate">Last Sales Date</SelectItem>
                  <SelectItem value="updatedAt">Last Contacted</SelectItem>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                  <SelectItem value="creditLimit">Credit Limit</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger className="w-[140px]" data-testid="select-sort-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Second row: Filters */}
            <div className="flex flex-wrap gap-3">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-state">
                  <Map className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map(state => <SelectItem key={state} value={state!}>{state}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-city">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(city => <SelectItem key={city} value={city!}>{city}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={importanceFilter} onValueChange={setImportanceFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-importance">
                  <Star className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Importance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Importance</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              {(stateFilter !== 'all' || cityFilter !== 'all' || importanceFilter !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setStateFilter('all'); setCityFilter('all'); setImportanceFilter('all'); }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          <DataTable columns={columns} data={filteredAndSortedPharmacies} />
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Geographic Credit Exposure Heatmap
              </CardTitle>
              <CardDescription>
                Visualize pharmacy locations with credit exposure. Larger markers indicate higher outstanding amounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardMetrics?.pharmaciesWithCoords && dashboardMetrics.pharmaciesWithCoords.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                    <div className="text-center space-y-4">
                      <Map className="h-16 w-16 mx-auto text-muted-foreground" />
                      <div>
                        <p className="font-medium">Map Integration Ready</p>
                        <p className="text-sm text-muted-foreground">
                          {dashboardMetrics.pharmaciesWithCoords.length} pharmacies have coordinates configured
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          To enable the interactive map, add Google Maps API key
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* List of pharmacies with coordinates */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pharmacies with Coordinates:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dashboardMetrics.pharmaciesWithCoords.map((p) => (
                        <div 
                          key={p.id} 
                          className="p-3 border rounded-lg flex items-center justify-between hover-elevate cursor-pointer"
                          onClick={() => navigate(`/pharmacies/${p.id}`)}
                          data-testid={`map-pharmacy-${p.id}`}
                        >
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.city}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={p.importance === 'High' ? 'destructive' : p.importance === 'Medium' ? 'secondary' : 'outline'}>
                              {p.importance}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">₹{p.outstanding.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">No pharmacies with coordinates configured</p>
                    <p className="text-sm text-muted-foreground">Add latitude and longitude when creating pharmacies to see them on the map</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg sm:w-full">
          <DialogHeader>
            <DialogTitle>Add Pharmacy</DialogTitle>
            <DialogDescription>Create a new pharmacy partner</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Pharmacy Name *</Label>
              <Input value={newPharmacy.name} onChange={(e) => setNewPharmacy({ ...newPharmacy, name: e.target.value })} placeholder="e.g., MedPlus Pharmacy" data-testid="input-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City *</Label>
                <Input value={newPharmacy.city} onChange={(e) => setNewPharmacy({ ...newPharmacy, city: e.target.value })} data-testid="input-city" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={newPharmacy.state} onChange={(e) => setNewPharmacy({ ...newPharmacy, state: e.target.value })} data-testid="input-state" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={newPharmacy.phone} onChange={(e) => setNewPharmacy({ ...newPharmacy, phone: e.target.value })} data-testid="input-phone" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={newPharmacy.email} onChange={(e) => setNewPharmacy({ ...newPharmacy, email: e.target.value })} data-testid="input-email" />
              </div>
            </div>
            <div>
              <Label>Importance</Label>
              <Select value={newPharmacy.importance} onValueChange={(v) => setNewPharmacy({ ...newPharmacy, importance: v })}>
                <SelectTrigger data-testid="select-create-importance"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Linked Doctor</Label>
              <Select value={String(newPharmacy.doctorId)} onValueChange={(v) => setNewPharmacy({ ...newPharmacy, doctorId: Number(v) })}>
                <SelectTrigger data-testid="select-doctor"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {doctors.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit Limit (₹)</Label>
              <Input type="number" value={newPharmacy.creditLimit} onChange={(e) => setNewPharmacy({ ...newPharmacy, creditLimit: Number(e.target.value) })} data-testid="input-credit" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitude (for map)</Label>
                <Input value={newPharmacy.latitude} onChange={(e) => setNewPharmacy({ ...newPharmacy, latitude: e.target.value })} placeholder="e.g., 19.0760" data-testid="input-latitude" />
              </div>
              <div>
                <Label>Longitude (for map)</Label>
                <Input value={newPharmacy.longitude} onChange={(e) => setNewPharmacy({ ...newPharmacy, longitude: e.target.value })} placeholder="e.g., 72.8777" data-testid="input-longitude" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button onClick={handleCreate} disabled={!newPharmacy.name || !newPharmacy.city || createPharmacyMutation.isPending} data-testid="button-save">
              {createPharmacyMutation.isPending ? 'Creating...' : 'Add Pharmacy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full" data-testid="dialog-pharmacy-detail">
          <DialogHeader>
            <DialogTitle>{selectedPharmacy?.name}</DialogTitle>
            <DialogDescription>Pharmacy Details</DialogDescription>
          </DialogHeader>
          {selectedPharmacy && (
            <div className="space-y-4" data-testid="pharmacy-detail-content">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Code</Label><p className="font-medium" data-testid="text-pharmacy-code">{selectedPharmacy.code}</p></div>
                <div><Label className="text-muted-foreground">Importance</Label><div data-testid="text-pharmacy-importance" className="mt-1">{getImportanceBadge(selectedPharmacy.importance)}</div></div>
                <div><Label className="text-muted-foreground">City</Label><p className="font-medium" data-testid="text-pharmacy-city">{selectedPharmacy.city || '-'}</p></div>
                <div><Label className="text-muted-foreground">State</Label><p className="font-medium" data-testid="text-pharmacy-state">{selectedPharmacy.state || '-'}</p></div>
                <div><Label className="text-muted-foreground">Phone</Label><p className="font-medium" data-testid="text-pharmacy-phone">{selectedPharmacy.phone || '-'}</p></div>
                <div><Label className="text-muted-foreground">Linked Doctor</Label><p className="font-medium" data-testid="text-pharmacy-doctor">{getDoctorName(selectedPharmacy.doctorId)}</p></div>
                <div><Label className="text-muted-foreground">Pricing Slab</Label><p className="font-medium" data-testid="text-pharmacy-slab">{getPricingSlabName(selectedPharmacy.pricingSlabId)}</p></div>
                <div><Label className="text-muted-foreground">Credit Limit</Label><p className="font-medium" data-testid="text-pharmacy-credit">₹{Number(selectedPharmacy.creditLimit || 0).toLocaleString()}</p></div>
                <div><Label className="text-muted-foreground">Outstanding</Label><p className="font-medium" data-testid="text-pharmacy-outstanding">₹{Number(selectedPharmacy.outstanding || 0).toLocaleString()}</p></div>
                <div><Label className="text-muted-foreground">Engagement Score</Label><p className="font-medium" data-testid="text-pharmacy-engagement">{selectedPharmacy.engagementScore || 50}/100</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)} data-testid="button-close-detail">Close</Button>
            <Button onClick={() => { setDetailDialogOpen(false); navigate(`/pharmacies/${selectedPharmacy?.id}`); }} data-testid="button-view-full-profile">View Full Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} entityName="Pharmacies" columns={exportColumns} totalRecords={filteredAndSortedPharmacies.length} />

      {/* Send Material Dialog */}
      <Dialog open={sendMaterialDialog} onOpenChange={setSendMaterialDialog}>
        <DialogContent className="w-[95vw] max-w-sm sm:w-full" data-testid="dialog-send-material">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send Material
            </DialogTitle>
            <DialogDescription>
              Choose what to send to <span className="font-semibold">{materialPharmacy?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { icon: BookOpen, label: 'Product Brochure', sublabel: 'PDF — Latest product catalogue', color: 'hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300', testid: 'btn-send-brochure' },
              { icon: FileText, label: 'Price List / Slab Sheet', sublabel: 'PDF — Current pricing for this pharmacy', color: 'hover:bg-green-50 dark:hover:bg-green-950/30 hover:border-green-300', testid: 'btn-send-price-list' },
              { icon: FileVideo, label: 'Product Demo Video', sublabel: 'Video link — How to use / product features', color: 'hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-300', testid: 'btn-send-video' },
              { icon: PhoneCall, label: 'WhatsApp Message', sublabel: 'Send via WhatsApp Business', color: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300', testid: 'btn-send-whatsapp' },
            ].map(({ icon: Icon, label, sublabel, color, testid }) => (
              <button
                key={label}
                className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${color}`}
                data-testid={testid}
                onClick={() => {
                  setSendMaterialDialog(false);
                  toast({
                    title: `${label} Sent`,
                    description: `${label} has been sent to ${materialPharmacy?.name}.`,
                  });
                }}
              >
                <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{sublabel}</p>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendMaterialDialog(false)} data-testid="button-close-material">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
