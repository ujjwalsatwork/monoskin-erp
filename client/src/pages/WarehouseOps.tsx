import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, Truck, Clock, CheckCircle, AlertTriangle, Box, Zap, Loader2, Camera, Upload, FileText, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useUpload } from '@/hooks/use-upload';
import type { PickingTask, PackingTask, DispatchTask } from '@shared/schema';

interface DisplayPickingTask {
  id: number;
  taskNumber: string;
  orderId: number | null;
  items: number;
  zone: string | null;
  pickerId: number | null;
  status: string;
  priority: string;
  startedAt: Date | null;
  completedAt: Date | null;
}

interface DisplayPackingTask {
  id: number;
  taskNumber: string;
  orderId: number | null;
  items: number;
  packerId: number | null;
  status: string;
  priority: string;
  startedAt: Date | null;
  completedAt: Date | null;
}

interface DisplayDispatchTask {
  id: number;
  taskNumber: string;
  orderId: number | null;
  items: number;
  destination: string | null;
  dispatcherId: number | null;
  packingTaskId: number | null;
  status: string;
  priority: string;
  scheduledAt: Date | null;
  dispatchedAt: Date | null;
}

export default function WarehouseOps() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('picking');
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [selectedPackingTask, setSelectedPackingTask] = useState<DisplayPackingTask | null>(null);
  const [proofData, setProofData] = useState({
    photoUrl: '',
    videoUrl: '',
    remarks: '',
    inspectorRemarks: '',
  });
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile: uploadPhoto, isUploading: isUploadingPhoto } = useUpload({
    onSuccess: (response) => {
      setProofData(prev => ({ ...prev, photoUrl: response.objectPath }));
      toast({ title: 'Photo uploaded successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to upload photo', variant: 'destructive' });
    },
  });

  const { uploadFile: uploadVideo, isUploading: isUploadingVideo } = useUpload({
    onSuccess: (response) => {
      setProofData(prev => ({ ...prev, videoUrl: response.objectPath }));
      toast({ title: 'Video uploaded successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to upload video', variant: 'destructive' });
    },
  });

  const { data: pickingTasks = [], isLoading: loadingPicking } = useQuery<PickingTask[]>({
    queryKey: ['/api/picking-tasks'],
  });

  const { data: packingTasks = [], isLoading: loadingPacking } = useQuery<PackingTask[]>({
    queryKey: ['/api/packing-tasks'],
  });

  const { data: dispatchTasks = [], isLoading: loadingDispatch } = useQuery<DispatchTask[]>({
    queryKey: ['/api/dispatch-tasks'],
  });

  const updatePickingMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PickingTask> }) =>
      apiRequest('PATCH', `/api/picking-tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/picking-tasks'] });
    },
  });

  const updatePackingMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PackingTask> }) =>
      apiRequest('PATCH', `/api/packing-tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packing-tasks'] });
    },
  });

  const updateDispatchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DispatchTask> }) =>
      apiRequest('PATCH', `/api/dispatch-tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dispatch-tasks'] });
    },
  });

  const picking: DisplayPickingTask[] = pickingTasks.map(t => ({
    id: t.id,
    taskNumber: t.taskNumber,
    orderId: t.orderId,
    items: t.items,
    zone: t.zone,
    pickerId: t.pickerId,
    status: t.status,
    priority: t.priority,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
  }));

  const packing: DisplayPackingTask[] = packingTasks.map(t => ({
    id: t.id,
    taskNumber: t.taskNumber,
    orderId: t.orderId,
    items: t.items,
    packerId: t.packerId,
    status: t.status,
    priority: t.priority,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
  }));

  const dispatch: DisplayDispatchTask[] = dispatchTasks.map(t => ({
    id: t.id,
    taskNumber: t.taskNumber,
    orderId: t.orderId,
    items: t.items,
    destination: t.destination,
    dispatcherId: t.dispatcherId,
    packingTaskId: t.packingTaskId,
    status: t.status,
    priority: t.priority,
    scheduledAt: t.scheduledAt,
    dispatchedAt: t.dispatchedAt,
  }));

  const pickingColumns: Column<DisplayPickingTask>[] = [
    { key: 'taskNumber', header: 'Task #', render: (task) => <span className="font-mono text-sm" data-testid={`text-picking-task-${task.id}`}>{task.taskNumber}</span> },
    { key: 'items', header: 'Items', render: (task) => <Badge variant="outline" data-testid={`badge-picking-items-${task.id}`}>{task.items} items</Badge> },
    { key: 'zone', header: 'Zone', render: (task) => task.zone ? <Badge variant="secondary" data-testid={`badge-picking-zone-${task.id}`}>{task.zone}</Badge> : '-' },
    { key: 'pickerId', header: 'Picker', render: (task) => (
      <span className={!task.pickerId ? 'text-muted-foreground italic' : ''}>{task.pickerId ? `Picker #${task.pickerId}` : 'Unassigned'}</span>
    )},
    { key: 'priority', header: 'Priority', render: (task) => {
      const colors = { normal: 'outline', high: 'default', urgent: 'destructive', low: 'secondary' } as const;
      return <Badge variant={colors[task.priority as keyof typeof colors] || 'outline'}>{task.priority}</Badge>;
    }},
    { key: 'status', header: 'Status', render: (task) => {
      const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
        pending: { variant: 'secondary', icon: Clock },
        'in-progress': { variant: 'default', icon: Zap },
        completed: { variant: 'outline', icon: CheckCircle },
        cancelled: { variant: 'destructive', icon: AlertTriangle },
      };
      const c = config[task.status] || config.pending;
      return <Badge variant={c.variant} data-testid={`badge-picking-status-${task.id}`}><c.icon className="h-3 w-3 mr-1" />{task.status}</Badge>;
    }},
  ];

  const packingColumns: Column<DisplayPackingTask>[] = [
    { key: 'taskNumber', header: 'Task #', render: (task) => <span className="font-mono text-sm" data-testid={`text-packing-task-${task.id}`}>{task.taskNumber}</span> },
    { key: 'items', header: 'Items', render: (task) => <Badge variant="outline" data-testid={`badge-packing-items-${task.id}`}>{task.items} items</Badge> },
    { key: 'packerId', header: 'Packer', render: (task) => (
      <span className={!task.packerId ? 'text-muted-foreground italic' : ''} data-testid={`text-packer-${task.id}`}>{task.packerId ? `Packer #${task.packerId}` : 'Unassigned'}</span>
    )},
    { key: 'priority', header: 'Priority', render: (task) => {
      const colors = { normal: 'outline', high: 'default', urgent: 'destructive', low: 'secondary' } as const;
      return <Badge variant={colors[task.priority as keyof typeof colors] || 'outline'} data-testid={`badge-packing-priority-${task.id}`}>{task.priority}</Badge>;
    }},
    { key: 'status', header: 'Status', render: (task) => {
      const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
        pending: { variant: 'secondary', icon: Clock },
        'in-progress': { variant: 'default', icon: Box },
        completed: { variant: 'outline', icon: CheckCircle },
        cancelled: { variant: 'destructive', icon: AlertTriangle },
      };
      const c = config[task.status] || config.pending;
      return <Badge variant={c.variant} data-testid={`badge-packing-status-${task.id}`}><c.icon className="h-3 w-3 mr-1" />{task.status}</Badge>;
    }},
  ];

  const dispatchColumns: Column<DisplayDispatchTask>[] = [
    { key: 'taskNumber', header: 'Task #', render: (task) => <span className="font-mono text-sm" data-testid={`text-dispatch-task-${task.id}`}>{task.taskNumber}</span> },
    { key: 'items', header: 'Items', render: (task) => <Badge variant="outline" data-testid={`badge-dispatch-items-${task.id}`}>{task.items} items</Badge> },
    { key: 'destination', header: 'Destination', render: (task) => <span data-testid={`text-destination-${task.id}`}>{task.destination || '-'}</span> },
    { key: 'dispatcherId', header: 'Dispatcher', render: (task) => (
      <span className={!task.dispatcherId ? 'text-muted-foreground italic' : ''} data-testid={`text-dispatcher-${task.id}`}>{task.dispatcherId ? `Dispatcher #${task.dispatcherId}` : 'Unassigned'}</span>
    )},
    { key: 'status', header: 'Status', render: (task) => {
      const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
        pending: { variant: 'secondary', icon: Clock },
        'in-progress': { variant: 'default', icon: Package },
        completed: { variant: 'outline', icon: Truck },
        cancelled: { variant: 'destructive', icon: AlertTriangle },
      };
      const c = config[task.status] || config.pending;
      return <Badge variant={c.variant} data-testid={`badge-dispatch-status-${task.id}`}><c.icon className="h-3 w-3 mr-1" />{task.status}</Badge>;
    }},
  ];

  const handleStartPicking = (task: DisplayPickingTask) => {
    updatePickingMutation.mutate({
      id: task.id,
      data: { status: 'in-progress', startedAt: new Date() },
    });
    toast({ title: 'Picking started' });
  };

  const handleCompletePicking = (task: DisplayPickingTask) => {
    updatePickingMutation.mutate({
      id: task.id,
      data: { status: 'completed', completedAt: new Date() },
    });
    toast({ title: 'Picking completed' });
  };

  const handleStartPacking = (task: DisplayPackingTask) => {
    updatePackingMutation.mutate({
      id: task.id,
      data: { status: 'in-progress', startedAt: new Date() },
    });
    toast({ title: 'Packing started' });
  };

  const handleCompletePacking = (task: DisplayPackingTask) => {
    updatePackingMutation.mutate({
      id: task.id,
      data: { status: 'completed', completedAt: new Date() },
    });
    toast({ title: 'Packing completed' });
  };

  const handleOpenProofDialog = (task: DisplayPackingTask) => {
    setSelectedPackingTask(task);
    setProofData({ photoUrl: '', videoUrl: '', remarks: '', inspectorRemarks: '' });
    setProofDialogOpen(true);
  };

  const handleSubmitProof = () => {
    if (!selectedPackingTask) return;
    
    if (!proofData.photoUrl && !proofData.videoUrl) {
      toast({ title: 'Please upload at least one photo or video as proof', variant: 'destructive' });
      return;
    }

    updatePackingMutation.mutate({
      id: selectedPackingTask.id,
      data: { 
        status: 'completed', 
        completedAt: new Date(),
        proofPhotoUrl: proofData.photoUrl || null,
        proofVideoUrl: proofData.videoUrl || null,
        proofRemarks: proofData.remarks || null,
      },
    });
    
    const relatedDispatch = dispatch.find(d => d.packingTaskId === selectedPackingTask.id);
    if (relatedDispatch) {
      updateDispatchMutation.mutate({
        id: relatedDispatch.id,
        data: {
          proofPhotoUrl: proofData.photoUrl || null,
          proofVideoUrl: proofData.videoUrl || null,
          proofRemarks: proofData.remarks || null,
        },
      });
    }
    
    toast({ title: 'Packing completed with proof uploaded' });
    setProofDialogOpen(false);
    setSelectedPackingTask(null);
  };

  const handleDispatch = (task: DisplayDispatchTask) => {
    updateDispatchMutation.mutate({
      id: task.id,
      data: { status: 'completed', dispatchedAt: new Date() },
    });
    toast({ title: 'Dispatched successfully' });
  };

  const stats = {
    pendingPicks: picking.filter(p => p.status === 'pending').length,
    inProgressPicks: picking.filter(p => p.status === 'in-progress').length,
    pendingPacks: packing.filter(p => p.status === 'pending' || p.status === 'in-progress').length,
    readyDispatch: dispatch.filter(d => d.status === 'pending' || d.status === 'in-progress').length,
  };

  const isLoading = loadingPicking || loadingPacking || loadingDispatch;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Operations"
        description="Real-time picking, packing, and dispatch management"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Picks</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-picks">{stats.pendingPicks}</div>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-in-progress">{stats.inProgressPicks}</div>
            <p className="text-xs text-muted-foreground">Being picked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packing Queue</CardTitle>
            <Box className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-packing-queue">{stats.pendingPacks}</div>
            <p className="text-xs text-muted-foreground">Ready to pack</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for Dispatch</CardTitle>
            <Truck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-ready-dispatch">{stats.readyDispatch}</div>
            <p className="text-xs text-muted-foreground">Shipments ready</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="picking" data-testid="tab-picking">Picking ({picking.length})</TabsTrigger>
          <TabsTrigger value="packing" data-testid="tab-packing">Packing ({packing.length})</TabsTrigger>
          <TabsTrigger value="dispatch" data-testid="tab-dispatch">Dispatch ({dispatch.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="picking" className="mt-4">
          {picking.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No picking tasks</p>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              data={picking}
              columns={pickingColumns}
              rowActions={[
                { label: 'Start Picking', onClick: handleStartPicking },
                { label: 'Mark Complete', onClick: handleCompletePicking },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="packing" className="mt-4">
          {packing.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Box className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No packing tasks</p>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              data={packing}
              columns={packingColumns}
              rowActions={[
                { label: 'Start Packing', onClick: handleStartPacking },
                { label: 'Mark Complete', onClick: handleCompletePacking },
                { label: 'Complete with Proof', onClick: handleOpenProofDialog },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="dispatch" className="mt-4">
          {dispatch.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No dispatch tasks</p>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              data={dispatch}
              columns={dispatchColumns}
              rowActions={[
                { label: 'Dispatch', onClick: handleDispatch },
              ]}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Photo/Video Proof Upload Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Upload Packaging Proof
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="photo-upload">Photo Proof</Label>
              <div className="flex gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(file);
                  }}
                />
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  data-testid="button-upload-photo"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {proofData.photoUrl ? 'Change Photo' : 'Upload Photo'}
                </Button>
              </div>
              {proofData.photoUrl && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Image className="h-4 w-4" />
                  Photo uploaded: {proofData.photoUrl.split('/').pop()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-upload">Video Proof (Optional)</Label>
              <div className="flex gap-2">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadVideo(file);
                  }}
                />
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isUploadingVideo}
                  data-testid="button-upload-video"
                >
                  {isUploadingVideo ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {proofData.videoUrl ? 'Change Video' : 'Upload Video'}
                </Button>
              </div>
              {proofData.videoUrl && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Video uploaded: {proofData.videoUrl.split('/').pop()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Packer Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Add any notes about the packaging..."
                value={proofData.remarks}
                onChange={(e) => setProofData(prev => ({ ...prev, remarks: e.target.value }))}
                data-testid="textarea-packer-remarks"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspector-remarks" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Inspector Remarks (for returns)
              </Label>
              <Textarea
                id="inspector-remarks"
                placeholder="Inspector notes if this is a return..."
                value={proofData.inspectorRemarks}
                onChange={(e) => setProofData(prev => ({ ...prev, inspectorRemarks: e.target.value }))}
                data-testid="textarea-inspector-remarks"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProofDialogOpen(false)} data-testid="button-cancel-proof">
              Cancel
            </Button>
            <Button onClick={handleSubmitProof} data-testid="button-submit-proof">
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete with Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
