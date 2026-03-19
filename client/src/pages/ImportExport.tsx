import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileSpreadsheet, Database, Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { ImportJob, ExportTemplate } from '@shared/schema';

export default function ImportExport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEntity, setSelectedEntity] = useState('products');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: importJobs = [], isLoading: jobsLoading } = useQuery<ImportJob[]>({
    queryKey: ['/api/import-jobs'],
  });

  const { data: exportTemplates = [], isLoading: templatesLoading } = useQuery<ExportTemplate[]>({
    queryKey: ['/api/export-templates'],
  });

  const createImportMutation = useMutation({
    mutationFn: (data: { fileName: string; entity: string; fileContent: string }) => 
      apiRequest('POST', '/api/import-jobs/process', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/import-jobs'] });
      toast({ title: 'Import Complete', description: 'File processed successfully.' });
    },
    onError: () => {
      toast({ title: 'Import Failed', description: 'Failed to process file.', variant: 'destructive' });
    },
  });

  const importColumns: Column<ImportJob>[] = [
    { key: 'fileName', header: 'File Name', render: (item) => (
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{item.fileName}</span>
      </div>
    )},
    { key: 'entity', header: 'Entity', render: (item) => (
      <span className="capitalize">{item.entity}</span>
    )},
    { key: 'status', header: 'Status', render: (item) => (
      <StatusPill status={item.status} />
    )},
    { key: 'progress', header: 'Progress', render: (item) => (
      <div className="flex items-center gap-2 min-w-32">
        <Progress value={(item.totalRows ?? 0) > 0 ? ((item.processedRows ?? 0) / (item.totalRows ?? 1)) * 100 : 0} className="h-2" />
        <span className="text-xs text-muted-foreground">{item.processedRows ?? 0}/{item.totalRows ?? 0}</span>
      </div>
    )},
    { key: 'errorRows', header: 'Errors', render: (item) => (
      (item.errorRows ?? 0) > 0 
        ? <Badge variant="destructive" data-testid={`badge-errors-${item.id}`}>{item.errorRows} errors</Badge>
        : <span className="text-muted-foreground">-</span>
    )},
    { key: 'createdAt', header: 'Uploaded', render: (item) => (
      <span className="text-sm text-muted-foreground">
        {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
      </span>
    )},
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const fileContent = await file.text();
        createImportMutation.mutate({
          fileName: file.name,
          entity: selectedEntity,
          fileContent,
        });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to read file', variant: 'destructive' });
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleExport = (template: ExportTemplate) => {
    toast({ title: 'Export Started', description: `Generating ${template.name}...` });
  };

  const isLoading = jobsLoading || templatesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completedJobs = importJobs.filter(j => j.status === 'completed').length;
  const partialJobs = importJobs.filter(j => j.status === 'completed_with_errors').length;
  const failedJobs = importJobs.filter(j => j.status === 'failed').length;
  const processingJobs = importJobs.filter(j => j.status === 'processing' || j.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Import / Export"
        description="Bulk data import and export operations"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Import Jobs" value={importJobs.length} icon={<Database className="h-4 w-4" />} subtitle="Total imports" data-testid="stat-total-jobs" />
        <StatCard title="Completed" value={completedJobs} icon={<CheckCircle className="h-4 w-4" />} subtitle="Successful imports" data-testid="stat-completed" />
        <StatCard title="Partial Success" value={partialJobs} icon={<AlertTriangle className="h-4 w-4" />} subtitle="With some errors" data-testid="stat-partial" />
        <StatCard title="Failed" value={failedJobs} icon={<XCircle className="h-4 w-4" />} subtitle="Failed imports" data-testid="stat-failed" />
        <StatCard title="Processing" value={processingJobs} icon={<Clock className="h-4 w-4" />} subtitle="In progress" data-testid="stat-processing" />
      </div>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import" data-testid="tab-import">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </TabsTrigger>
          <TabsTrigger value="export" data-testid="tab-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Data File</CardTitle>
              <CardDescription>Upload CSV files to import data. First row should contain column headers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data Type</Label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger className="w-[200px]" data-testid="select-entity">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="products">Products</SelectItem>
                    <SelectItem value="doctors">Doctors</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Select a CSV file to import {selectedEntity}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isProcessing || createImportMutation.isPending}
                  data-testid="button-upload"
                >
                  {(isProcessing || createImportMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Select CSV File'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import History</CardTitle>
            </CardHeader>
            <CardContent>
              {importJobs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No import jobs yet</p>
              ) : (
                <DataTable data={importJobs} columns={importColumns} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exportTemplates.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No export templates configured yet
              </div>
            ) : (
              exportTemplates.map(template => (
                <Card key={template.id} className="hover-elevate">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-md">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs">{template.entity}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Format: {template.format?.toUpperCase() || 'CSV'}
                      </div>
                      <Button size="sm" onClick={() => handleExport(template)} data-testid={`button-export-${template.id}`}>
                        <Download className="h-3 w-3 mr-1" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
