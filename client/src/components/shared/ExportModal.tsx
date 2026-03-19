import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ExportJob, InsertExportJob } from '@shared/schema';

interface ExportColumn {
  key: string;
  label: string;
  defaultSelected?: boolean;
}

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  columns: ExportColumn[];
  totalRecords: number;
  onExport?: (format: string, columns: string[]) => void;
}

export function ExportModal({
  open,
  onOpenChange,
  entityName,
  columns,
  totalRecords,
  onExport,
}: ExportModalProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState('xlsx');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.filter(c => c.defaultSelected !== false).map(c => c.key)
  );

  const formats = [
    { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
    { value: 'csv', label: 'CSV (.csv)', icon: FileText },
    { value: 'json', label: 'JSON (.json)', icon: FileJson },
  ];

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelectedColumns(columns.map(c => c.key));
  const deselectAll = () => setSelectedColumns([]);

  const createExportMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await apiRequest('POST', '/api/export-jobs', data);
      return response as unknown as ExportJob;
    },
    onSuccess: (job) => {
      toast({
        title: 'Export Started',
        description: `Your ${entityName.toLowerCase()} export has been queued. Preparing download...`,
      });
      onExport?.(format, selectedColumns);
      
      // Poll for completion and trigger download
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/export-jobs/${job.id}`);
          const updatedJob = await response.json() as ExportJob;
          
          if (updatedJob.status === 'completed') {
            clearInterval(pollInterval);
            // Trigger download
            window.open(`/api/export-jobs/${job.id}/download`, '_blank');
            toast({
              title: 'Export Complete',
              description: 'Your file is ready for download.',
            });
            onOpenChange(false);
          } else if (updatedJob.status === 'failed') {
            clearInterval(pollInterval);
            toast({
              title: 'Export Failed',
              description: 'Export job failed. Please try again.',
              variant: 'destructive',
            });
          }
        } catch {
          clearInterval(pollInterval);
        }
      }, 1000);
      
      // Timeout after 30 seconds
      setTimeout(() => clearInterval(pollInterval), 30000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to start export job.',
        variant: 'destructive',
      });
    },
  });

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: 'No columns selected',
        description: 'Please select at least one column to export.',
        variant: 'destructive',
      });
      return;
    }

    createExportMutation.mutate({
      name: `${entityName} Export - ${new Date().toLocaleDateString()}`,
      entityType: entityName.toLowerCase(),
      format,
      status: 'queued',
      progress: 0,
      recordCount: totalRecords,
      columns: selectedColumns.join(','),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {entityName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Record count */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm">
              <span className="font-medium">{totalRecords.toLocaleString()}</span> records will be exported
            </p>
          </div>

          {/* Format selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={setFormat} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {formats.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.value}>
                    <RadioGroupItem value={f.value} id={f.value} className="peer sr-only" />
                    <Label
                      htmlFor={f.value}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-xs">{f.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Column selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Columns to Export</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>Deselect All</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1">
              {columns.map((col) => (
                <div key={col.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`col-${col.key}`}
                    checked={selectedColumns.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  <Label htmlFor={`col-${col.key}`} className="text-sm font-normal cursor-pointer">
                    {col.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedColumns.length} of {columns.length} columns selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={createExportMutation.isPending || selectedColumns.length === 0}>
            {createExportMutation.isPending ? 'Starting Export...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
