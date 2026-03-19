import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Calendar, TrendingUp, Package, Users, DollarSign, BarChart3, Search, Loader2, Plus, Clock, Eye, Bookmark, Star, History, Trash2, Database, Columns, Filter, Save, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { ReportTemplate, ReportUsageLog, RegulatoryAuditLog } from '@shared/schema';

const DATA_SOURCES = [
  { id: 'orders', name: 'Orders', columns: ['orderNumber', 'doctorName', 'status', 'total', 'createdAt', 'warehouseName'] },
  { id: 'leads', name: 'Leads', columns: ['name', 'company', 'email', 'phone', 'status', 'source', 'assignedMR', 'createdAt'] },
  { id: 'doctors', name: 'Doctors/Pharmacies', columns: ['name', 'type', 'specialty', 'city', 'state', 'creditLimit', 'outstanding'] },
  { id: 'products', name: 'Products', columns: ['name', 'sku', 'category', 'mrp', 'ptr', 'pts', 'stockLevel'] },
  { id: 'inventory', name: 'Inventory', columns: ['productName', 'warehouseName', 'batch', 'quantity', 'available', 'expiryDate'] },
  { id: 'invoices', name: 'Invoices', columns: ['invoiceNumber', 'customerName', 'amount', 'status', 'dueDate', 'paidAmount'] },
  { id: 'mrs', name: 'MRs', columns: ['name', 'region', 'targetValue', 'achievedValue', 'visitsCount', 'conversionRate'] },
];

const SAMPLE_DATA: Record<string, Record<string, string | number>[]> = {
  orders: [
    { orderNumber: 'ORD-001', doctorName: 'Dr. Sharma', status: 'Delivered', total: 12500, createdAt: '2026-02-10', warehouseName: 'Mumbai Central' },
    { orderNumber: 'ORD-002', doctorName: 'Dr. Patel', status: 'Processing', total: 8700, createdAt: '2026-02-12', warehouseName: 'Delhi North' },
    { orderNumber: 'ORD-003', doctorName: 'Dr. Kumar', status: 'Shipped', total: 15300, createdAt: '2026-02-14', warehouseName: 'Mumbai Central' },
  ],
  leads: [
    { name: 'City Hospital', company: 'City Corp', email: 'admin@city.com', phone: '9876543210', status: 'Qualified', source: 'Website', assignedMR: 'Rahul S.', createdAt: '2026-02-08' },
    { name: 'Metro Clinic', company: 'Metro Health', email: 'info@metro.com', phone: '9876543211', status: 'New', source: 'Referral', assignedMR: 'Priya M.', createdAt: '2026-02-11' },
  ],
  doctors: [
    { name: 'Dr. Sharma', type: 'Doctor', specialty: 'Dermatology', city: 'Mumbai', state: 'Maharashtra', creditLimit: 50000, outstanding: 12500 },
    { name: 'Dr. Patel', type: 'Doctor', specialty: 'General', city: 'Delhi', state: 'Delhi', creditLimit: 30000, outstanding: 8700 },
  ],
  products: [
    { name: 'Monoskin Cream 50g', sku: 'MSC-050', category: 'Topical', mrp: 450, ptr: 380, pts: 350, stockLevel: 1200 },
    { name: 'Monoskin Gel 30g', sku: 'MSG-030', category: 'Topical', mrp: 320, ptr: 270, pts: 250, stockLevel: 800 },
  ],
  inventory: [
    { productName: 'Monoskin Cream 50g', warehouseName: 'Mumbai Central', batch: 'B2026-001', quantity: 500, available: 480, expiryDate: '2027-06-30' },
  ],
  invoices: [
    { invoiceNumber: 'INV-001', customerName: 'Dr. Sharma', amount: 12500, status: 'Paid', dueDate: '2026-03-10', paidAmount: 12500 },
    { invoiceNumber: 'INV-002', customerName: 'Dr. Patel', amount: 8700, status: 'Pending', dueDate: '2026-03-15', paidAmount: 0 },
  ],
  mrs: [
    { name: 'Rahul S.', region: 'West', targetValue: 500000, achievedValue: 380000, visitsCount: 45, conversionRate: 32 },
  ],
};

const getIconComponent = (iconName: string | null) => {
  switch (iconName) {
    case 'TrendingUp': return TrendingUp;
    case 'Package': return Package;
    case 'DollarSign': return DollarSign;
    case 'Users': return Users;
    case 'BarChart3': return BarChart3;
    default: return FileText;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'sales': return TrendingUp;
    case 'inventory': return Package;
    case 'finance': return DollarSign;
    case 'operations': return BarChart3;
    case 'crm': return Users;
    case 'hr': return Users;
    default: return FileText;
  }
};

interface SavedView {
  id: string;
  name: string;
  filters: { category: string; search: string };
  createdAt: Date;
  isFavorite: boolean;
}

const getRiskLevelVariant = (level: string) => {
  switch (level) {
    case 'critical': return 'destructive' as const;
    case 'high': return 'destructive' as const;
    case 'medium': return 'secondary' as const;
    default: return 'outline' as const;
  }
};

const getComplianceVariant = (status: string) => {
  switch (status) {
    case 'compliant': return 'outline' as const;
    case 'non_compliant': return 'destructive' as const;
    case 'under_review': return 'secondary' as const;
    default: return 'outline' as const;
  }
};

export default function Reports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFrequency, setActiveFrequency] = useState('all');
  const [activeTab, setActiveTab] = useState('library');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportTemplate | null>(null);
  const [newViewName, setNewViewName] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleRecipients, setScheduleRecipients] = useState('');
  const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState(1);
  const [builderDataSource, setBuilderDataSource] = useState('');
  const [builderSelectedColumns, setBuilderSelectedColumns] = useState<string[]>([]);
  const [builderReportName, setBuilderReportName] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderCategory, setBuilderCategory] = useState('sales');
  const [builderFrequency, setBuilderFrequency] = useState('on-demand');
  
  const [savedViews, setSavedViews] = useState<SavedView[]>([
    { id: '1', name: 'Sales Reports Only', filters: { category: 'sales', search: '' }, createdAt: new Date('2026-01-15'), isFavorite: true },
    { id: '2', name: 'Finance Daily', filters: { category: 'finance', search: 'daily' }, createdAt: new Date('2026-01-10'), isFavorite: false },
  ]);

  const { data: reportTemplates = [], isLoading } = useQuery<ReportTemplate[]>({
    queryKey: ['/api/report-templates'],
  });

  const { data: usageLogs = [] } = useQuery<ReportUsageLog[]>({
    queryKey: ['/api/report-usage-logs'],
  });

  const { data: auditLogs = [], isLoading: auditLogsLoading } = useQuery<RegulatoryAuditLog[]>({
    queryKey: ['/api/regulatory-audit-logs'],
  });

  const generateMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest('PATCH', `/api/report-templates/${id}`, { lastGeneratedAt: new Date() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-templates'] });
    },
  });

  const logUsageMutation = useMutation({
    mutationFn: (data: { reportName: string; format: string }) =>
      apiRequest('POST', '/api/report-usage-logs', {
        reportName: data.reportName,
        generatedByEmail: 'current-user@monoskin.com',
        format: data.format,
        status: 'completed',
        rowCount: Math.floor(Math.random() * 500) + 10,
        durationMs: Math.floor(Math.random() * 5000) + 500,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-usage-logs'] });
    },
  });

  const handleGenerateReport = (report: ReportTemplate) => {
    generateMutation.mutate(report.id);
    logUsageMutation.mutate({ reportName: report.name, format: 'PDF' });
    toast.success(`Generating ${report.name}...`);
  };

  const handleScheduleReport = (report: ReportTemplate) => {
    setSelectedReport(report);
    setScheduleDialogOpen(true);
  };

  const handlePreviewReport = (report: ReportTemplate) => {
    setSelectedReport(report);
    setPreviewDialogOpen(true);
  };

  const handleSaveSchedule = () => {
    if (!selectedReport) return;
    toast.success(`Schedule saved for ${selectedReport.name}: ${scheduleFrequency} at ${scheduleTime}`);
    setScheduleDialogOpen(false);
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      toast.error('Please enter a view name');
      return;
    }
    const newView: SavedView = {
      id: Date.now().toString(),
      name: newViewName,
      filters: { category: activeCategory, search: searchQuery },
      createdAt: new Date(),
      isFavorite: false,
    };
    setSavedViews(prev => [...prev, newView]);
    setNewViewName('');
    setSaveViewDialogOpen(false);
    toast.success('View saved successfully');
  };

  const handleApplyView = (view: SavedView) => {
    setActiveCategory(view.filters.category);
    setSearchQuery(view.filters.search);
    setActiveTab('library');
    toast.info(`Applied view: ${view.name}`);
  };

  const handleToggleFavorite = (viewId: string) => {
    setSavedViews(prev => prev.map(v => 
      v.id === viewId ? { ...v, isFavorite: !v.isFavorite } : v
    ));
  };

  const handleDeleteView = (viewId: string) => {
    setSavedViews(prev => prev.filter(v => v.id !== viewId));
    toast.success('View deleted');
  };

  const createTemplateMutation = useMutation({
    mutationFn: (data: { name: string; description: string; category: string; frequency: string; dataSource: string; columns: string[] }) =>
      apiRequest('POST', '/api/report-templates', {
        name: data.name,
        description: data.description,
        category: data.category,
        frequency: data.frequency,
        icon: getCategoryIcon(data.category).name || 'FileText',
        dataSource: data.dataSource,
        columns: data.columns,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-templates'] });
      toast.success('Report template created successfully');
      setReportBuilderOpen(false);
      resetBuilderForm();
    },
    onError: () => {
      toast.error('Failed to create report template');
    },
  });

  const resetBuilderForm = () => {
    setBuilderStep(1);
    setBuilderDataSource('');
    setBuilderSelectedColumns([]);
    setBuilderReportName('');
    setBuilderDescription('');
    setBuilderCategory('sales');
    setBuilderFrequency('on-demand');
  };

  const handleCreateTemplate = () => {
    resetBuilderForm();
    setReportBuilderOpen(true);
  };

  const handleBuilderNext = () => {
    if (builderStep < 3) {
      setBuilderStep(builderStep + 1);
    }
  };

  const handleBuilderBack = () => {
    if (builderStep > 1) {
      setBuilderStep(builderStep - 1);
    }
  };

  const handleBuilderSave = () => {
    if (!builderReportName || !builderDataSource || builderSelectedColumns.length === 0) {
      toast.error('Please complete all required fields');
      return;
    }
    createTemplateMutation.mutate({
      name: builderReportName,
      description: builderDescription,
      category: builderCategory,
      frequency: builderFrequency,
      dataSource: builderDataSource,
      columns: builderSelectedColumns,
    });
  };

  const toggleColumn = (column: string) => {
    setBuilderSelectedColumns(prev => 
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    );
  };

  const selectedDataSource = DATA_SOURCES.find(ds => ds.id === builderDataSource);

  const filteredReports = reportTemplates.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = activeCategory === 'all' || report.category === activeCategory;
    const matchesFrequency = activeFrequency === 'all' || report.frequency === activeFrequency;
    return matchesSearch && matchesCategory && matchesFrequency;
  });

  const scheduledReports = reportTemplates.filter(r => r.frequency !== 'on-demand');

  const stats = [
    { title: 'Available Reports', value: reportTemplates.length.toString(), subtitle: 'Templates', color: 'blue' as const },
    { title: 'Generated Today', value: usageLogs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length.toString(), subtitle: 'Reports', color: 'green' as const },
    { title: 'Scheduled', value: scheduledReports.length.toString(), subtitle: 'Automated reports', color: 'yellow' as const },
    { title: 'Saved Views', value: savedViews.length.toString(), subtitle: 'Custom filters', color: 'purple' as const },
  ];

  const getPreviewData = () => {
    if (!selectedReport) return { columns: [] as string[], rows: [] as Record<string, string | number>[] };
    const ds = selectedReport.dataSource || 'orders';
    const cols = selectedReport.columns || DATA_SOURCES.find(d => d.id === ds)?.columns || [];
    const rows = SAMPLE_DATA[ds] || SAMPLE_DATA['orders'];
    return { columns: cols as string[], rows };
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
        title="Reports Library"
        description="Generate, schedule, and manage business reports"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setSaveViewDialogOpen(true)} data-testid="button-save-view">
              <Bookmark className="h-4 w-4 mr-2" />
              Save View
            </Button>
            <Button onClick={handleCreateTemplate} data-testid="button-create-report">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-reports-main">
          <TabsTrigger value="library" data-testid="tab-library">
            <FileText className="h-4 w-4 mr-1" />
            Library
          </TabsTrigger>
          <TabsTrigger value="saved" data-testid="tab-saved-views">
            <Bookmark className="h-4 w-4 mr-1" />
            Saved Views
          </TabsTrigger>
          <TabsTrigger value="usage" data-testid="tab-usage-logs">
            <History className="h-4 w-4 mr-1" />
            Usage Logs
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit-logs">
            <Shield className="h-4 w-4 mr-1" />
            Regulatory Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-reports"
              />
            </div>
            <Select value={activeCategory} onValueChange={setActiveCategory}>
              <SelectTrigger className="w-[160px]" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="crm">CRM</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activeFrequency} onValueChange={setActiveFrequency}>
              <SelectTrigger className="w-[160px]" data-testid="select-frequency-filter">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="on-demand">On Demand</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredReports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No report templates found</p>
                <p className="text-xs text-muted-foreground mt-1">Create a new template to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report) => {
                const Icon = report.icon ? getIconComponent(report.icon) : getCategoryIcon(report.category);
                return (
                  <Card key={report.id} className="hover:shadow-md transition-shadow" data-testid={`card-report-${report.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent rounded-lg">
                            <Icon className="h-5 w-5 text-accent-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-base" data-testid={`text-report-name-${report.id}`}>{report.name}</CardTitle>
                            <span className="text-xs px-2 py-0.5 bg-muted rounded capitalize">{report.frequency}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4" data-testid={`text-report-desc-${report.id}`}>{report.description || 'No description'}</CardDescription>
                      {report.lastGeneratedAt && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Last generated: {new Date(report.lastGeneratedAt).toLocaleDateString()}
                        </p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          onClick={() => handleGenerateReport(report)}
                          disabled={generateMutation.isPending}
                          data-testid={`button-generate-${report.id}`}
                        >
                          {generateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          Generate
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handlePreviewReport(report)}
                          data-testid={`button-preview-${report.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleScheduleReport(report)}
                          data-testid={`button-schedule-${report.id}`}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          {savedViews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No saved views yet</p>
                <p className="text-xs text-muted-foreground mt-1">Save your current filters to create a view</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedViews.map((view) => (
                <Card key={view.id} className="hover:shadow-md transition-shadow" data-testid={`card-saved-view-${view.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base" data-testid={`text-view-name-${view.id}`}>{view.name}</CardTitle>
                        {view.isFavorite && <Star className="h-4 w-4 text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleToggleFavorite(view.id)}
                          data-testid={`button-favorite-${view.id}`}
                        >
                          <Star className={`h-4 w-4 ${view.isFavorite ? 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400' : ''}`} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteView(view.id)}
                          data-testid={`button-delete-view-${view.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex gap-2">
                        <Badge variant="outline">{view.filters.category === 'all' ? 'All Categories' : view.filters.category}</Badge>
                        {view.filters.search && <Badge variant="secondary">Search: {view.filters.search}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(view.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleApplyView(view)} data-testid={`button-apply-view-${view.id}`}>
                      Apply View
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Generation History</CardTitle>
              <CardDescription>Track all report generation activity (persisted)</CardDescription>
            </CardHeader>
            <CardContent>
              {usageLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No reports generated yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {usageLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border" data-testid={`usage-log-${log.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm" data-testid={`text-log-report-${log.id}`}>{log.reportName}</p>
                          <p className="text-xs text-muted-foreground">
                            By {log.generatedByEmail || 'System'}
                            {log.rowCount ? ` | ${log.rowCount} rows` : ''}
                            {log.durationMs ? ` | ${(log.durationMs / 1000).toFixed(1)}s` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.format || 'PDF'}</Badge>
                          <Badge variant={log.status === 'completed' ? 'outline' : 'secondary'}>
                            {log.status || 'completed'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Regulatory Audit Trail
                  </CardTitle>
                  <CardDescription>Compliance monitoring and regulatory audit logs</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {auditLogs.length} entries
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {auditLogsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No audit entries recorded</p>
                  <p className="text-xs text-muted-foreground mt-1">Regulatory actions will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Compliance</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Performed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`audit-log-${log.id}`}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">{log.category}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{log.action}</TableCell>
                          <TableCell className="text-sm">
                            {log.entityType}
                            {log.entityId ? ` #${log.entityId}` : ''}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{log.description}</TableCell>
                          <TableCell>
                            <Badge variant={getComplianceVariant(log.complianceStatus || 'pending')} className="text-xs capitalize">
                              {(log.complianceStatus || 'pending').replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRiskLevelVariant(log.riskLevel || 'low')} className="text-xs capitalize">
                              {log.riskLevel || 'low'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{log.performedByEmail || 'System'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Report: {selectedReport?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                <SelectTrigger data-testid="select-schedule-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input 
                type="time" 
                value={scheduleTime} 
                onChange={(e) => setScheduleTime(e.target.value)}
                data-testid="input-schedule-time"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Recipients (comma separated)</Label>
              <Input 
                placeholder="email@example.com, another@example.com"
                value={scheduleRecipients}
                onChange={(e) => setScheduleRecipients(e.target.value)}
                data-testid="input-schedule-recipients"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSchedule} data-testid="button-save-schedule">Save Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview: {selectedReport?.name}</DialogTitle>
            <DialogDescription>
              Showing sample data from {selectedReport?.dataSource || 'orders'} data source
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto border rounded-lg">
            {(() => {
              const preview = getPreviewData();
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.columns.map((col) => (
                        <TableHead key={col} className="capitalize whitespace-nowrap">
                          {col.replace(/([A-Z])/g, ' $1').trim()}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, i) => (
                      <TableRow key={i} data-testid={`preview-row-${i}`}>
                        {preview.columns.map((col) => (
                          <TableCell key={col} className="whitespace-nowrap text-sm">
                            {typeof row[col] === 'number' && col.includes('total') || col.includes('amount') || col.includes('mrp') || col.includes('ptr') || col.includes('pts') || col.includes('creditLimit') || col.includes('outstanding') || col.includes('paidAmount') || col.includes('targetValue') || col.includes('achievedValue')
                              ? `₹${Number(row[col]).toLocaleString()}`
                              : String(row[col] ?? '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              );
            })()}
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {getPreviewData().rows.length} sample rows. Full report will include all matching records.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>Close</Button>
            {selectedReport && (
              <Button onClick={() => { handleGenerateReport(selectedReport); setPreviewDialogOpen(false); }} data-testid="button-generate-from-preview">
                <Download className="h-4 w-4 mr-2" />
                Generate Full Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>View Name</Label>
              <Input 
                placeholder="My Custom View"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                data-testid="input-view-name"
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Current Filters:</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{activeCategory === 'all' ? 'All Categories' : activeCategory}</Badge>
                {searchQuery && <Badge variant="secondary">Search: {searchQuery}</Badge>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveViewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveView} data-testid="button-confirm-save-view">Save View</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportBuilderOpen} onOpenChange={setReportBuilderOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Custom Report Builder
            </DialogTitle>
            <DialogDescription>
              Create a custom report template by selecting data source and columns
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  builderStep === step ? 'bg-primary text-primary-foreground' : 
                  builderStep > step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {step}
                </div>
                <span className={`ml-2 text-sm ${builderStep === step ? 'font-medium' : 'text-muted-foreground'}`}>
                  {step === 1 ? 'Data Source' : step === 2 ? 'Columns' : 'Details'}
                </span>
                {step < 3 && <div className="w-8 h-px bg-border mx-2" />}
              </div>
            ))}
          </div>

          {builderStep === 1 && (
            <div className="space-y-4">
              <Label>Select Data Source</Label>
              <div className="grid grid-cols-2 gap-3">
                {DATA_SOURCES.map((ds) => (
                  <div
                    key={ds.id}
                    onClick={() => {
                      setBuilderDataSource(ds.id);
                      setBuilderSelectedColumns([]);
                    }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      builderDataSource === ds.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    data-testid={`datasource-${ds.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span className="font-medium">{ds.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ds.columns.length} available columns
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {builderStep === 2 && selectedDataSource && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Columns</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setBuilderSelectedColumns(selectedDataSource.columns)}
                  data-testid="button-select-all-columns"
                >
                  Select All
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {selectedDataSource.columns.map((column) => (
                  <div
                    key={column}
                    onClick={() => toggleColumn(column)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center gap-2 ${
                      builderSelectedColumns.includes(column)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    data-testid={`column-${column}`}
                  >
                    <Checkbox 
                      checked={builderSelectedColumns.includes(column)}
                      onCheckedChange={() => toggleColumn(column)}
                    />
                    <span className="text-sm capitalize">{column.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {builderSelectedColumns.length} columns selected
              </p>
            </div>
          )}

          {builderStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Report Name *</Label>
                <Input
                  value={builderReportName}
                  onChange={(e) => setBuilderReportName(e.target.value)}
                  placeholder="My Custom Report"
                  data-testid="input-report-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={builderDescription}
                  onChange={(e) => setBuilderDescription(e.target.value)}
                  placeholder="Describe what this report shows..."
                  rows={2}
                  data-testid="input-report-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={builderCategory} onValueChange={setBuilderCategory}>
                    <SelectTrigger data-testid="select-builder-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="crm">CRM</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={builderFrequency} onValueChange={setBuilderFrequency}>
                    <SelectTrigger data-testid="select-builder-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-demand">On Demand</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Summary</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Data Source: {DATA_SOURCES.find(ds => ds.id === builderDataSource)?.name}</p>
                  <p>Columns: {builderSelectedColumns.join(', ')}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReportBuilderOpen(false)}>
              Cancel
            </Button>
            {builderStep > 1 && (
              <Button variant="outline" onClick={handleBuilderBack} data-testid="button-builder-back">
                Back
              </Button>
            )}
            {builderStep < 3 ? (
              <Button 
                onClick={handleBuilderNext} 
                disabled={builderStep === 1 ? !builderDataSource : builderSelectedColumns.length === 0}
                data-testid="button-builder-next"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleBuilderSave}
                disabled={!builderReportName || createTemplateMutation.isPending}
                data-testid="button-builder-save"
              >
                {createTemplateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Create Template
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
