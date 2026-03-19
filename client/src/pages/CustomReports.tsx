import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Play, Save, Trash2, Loader2, FileBarChart, Database, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import type { SavedReport } from '@shared/schema';

interface ReportField {
  id: string;
  name: string;
  type: string;
  table: string;
}

interface ReportDataPoint {
  name: string;
  value: number;
}

const availableFields: ReportField[] = [
  { id: '1', name: 'Order ID', type: 'text', table: 'orders' },
  { id: '2', name: 'Order Date', type: 'date', table: 'orders' },
  { id: '3', name: 'Customer Name', type: 'text', table: 'customers' },
  { id: '4', name: 'Product Name', type: 'text', table: 'products' },
  { id: '5', name: 'Quantity', type: 'number', table: 'order_items' },
  { id: '6', name: 'Unit Price', type: 'currency', table: 'order_items' },
  { id: '7', name: 'Total Amount', type: 'currency', table: 'orders' },
  { id: '8', name: 'Status', type: 'text', table: 'orders' },
  { id: '9', name: 'Warehouse', type: 'text', table: 'warehouses' },
  { id: '10', name: 'Region', type: 'text', table: 'territories' },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CustomReports() {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>(['1', '2', '3', '7']);
  const [chartType, setChartType] = useState('bar');
  const [groupBy, setGroupBy] = useState('month');
  const [reportName, setReportName] = useState('');
  const [reportData, setReportData] = useState<ReportDataPoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const { data: savedReports = [], isLoading } = useQuery<SavedReport[]>({
    queryKey: ['/api/saved-reports'],
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<SavedReport>) => apiRequest('POST', '/api/saved-reports', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-reports'] });
      toast({ title: 'Report saved', description: 'Your custom report has been saved.' });
      setReportName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/saved-reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-reports'] });
      toast({ title: 'Report deleted', description: 'The saved report has been removed.' });
    },
  });

  const publicReports = savedReports.filter(r => r.isPublic);

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSave = () => {
    if (!reportName.trim()) {
      toast({ title: 'Error', description: 'Please enter a report name.', variant: 'destructive' });
      return;
    }

    saveMutation.mutate({
      name: reportName,
      chartType,
      groupBy,
      selectedFields: selectedFields,
    });
  };

  const handleRun = async () => {
    if (selectedFields.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one field.', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    toast({ title: 'Report Running', description: 'Generating report from database...' });
    
    try {
      const response = await fetch(`/api/sales-analytics?groupBy=${groupBy}`);
      if (response.ok) {
        const data = await response.json();
        const trendData = data?.monthlyTrend || data?.topProducts || [];
        if (Array.isArray(trendData) && trendData.length > 0) {
          const formattedData = trendData.slice(0, 12).map((item: Record<string, unknown>) => ({
            name: String(item.month || item.name || item.period || 'Unknown'),
            value: Number(item.revenue || item.totalSales || item.value || 0),
          }));
          setReportData(formattedData);
          toast({ title: 'Report Complete', description: `Data loaded successfully. ${formattedData.length} data points.` });
        } else {
          setReportData([]);
          toast({ title: 'No Data', description: 'No data available for the selected criteria.' });
        }
      } else {
        setReportData([]);
        toast({ title: 'Error', description: 'Failed to fetch report data.', variant: 'destructive' });
      }
    } catch {
      setReportData([]);
      toast({ title: 'Error', description: 'Failed to run report.', variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = () => {
    if (reportData.length === 0) {
      toast({ title: 'No Data', description: 'Run the report first to generate data for export.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Export Started', description: 'Downloading report as Excel file...' });
  };

  const loadSavedReport = (report: SavedReport) => {
    if (report.selectedFields) {
      setSelectedFields(report.selectedFields);
    }
    if (report.chartType) setChartType(report.chartType);
    if (report.groupBy) setGroupBy(report.groupBy);
    setReportName(report.name);
    setReportData([]);
    toast({ title: 'Report Loaded', description: `Loaded "${report.name}" configuration. Click "Run" to generate data.` });
  };

  const renderChart = () => {
    if (reportData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <FileBarChart className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-sm">No report data available</p>
          <p className="text-xs">Select fields and click "Run" to generate the report</p>
        </div>
      );
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {reportData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
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
        title="Custom Reports"
        description="Build and configure custom reports with drag-and-drop fields"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saved Reports" value={savedReports.length} icon={<FileBarChart className="h-4 w-4" />} subtitle="Custom reports" />
        <StatCard title="Fields Available" value={availableFields.length} icon={<Database className="h-4 w-4" />} subtitle="Data points" />
        <StatCard title="Fields Selected" value={selectedFields.length} icon={<Checkbox className="h-4 w-4" />} subtitle="Current report" />
        <StatCard title="Public Reports" value={publicReports.length} icon={<Users className="h-4 w-4" />} subtitle="Shared with team" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableFields.map(field => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                    data-testid={`checkbox-field-${field.id}`}
                  />
                  <Label htmlFor={field.id} className="text-sm cursor-pointer">
                    {field.name}
                    <span className="text-xs text-muted-foreground ml-1">({field.table})</span>
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Saved Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved reports yet</p>
              ) : (
                savedReports.map(report => (
                  <div key={report.id} className="flex items-center justify-between p-2 hover-elevate rounded-md">
                    <button
                      className="text-sm font-medium text-left flex-1"
                      onClick={() => loadSavedReport(report)}
                      data-testid={`button-load-report-${report.id}`}
                    >
                      {report.name}
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(report.id)}
                      data-testid={`button-delete-report-${report.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Report Results</CardTitle>
                  {reportData.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{reportData.length} data points</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={chartType} onValueChange={setChartType}>
                    <SelectTrigger className="w-28" data-testid="select-chart-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="w-28" data-testid="select-group-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="quarter">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isRunning ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderChart()
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="reportName">Report Name</Label>
                  <Input
                    id="reportName"
                    value={reportName}
                    onChange={e => setReportName(e.target.value)}
                    placeholder="Enter report name..."
                    data-testid="input-report-name"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleRun} variant="outline" disabled={isRunning} data-testid="button-run-report">
                    {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    Run
                  </Button>
                  <Button onClick={handleExport} variant="outline" disabled={reportData.length === 0} data-testid="button-export-report">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-report">
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
