import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, List, Grid, MapPin, Map, Layers, Info, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Territory, User, TerritoryBoundary } from '@shared/schema';

const Territories = () => {
  const { toast } = useToast();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [isBoundaryDrawerOpen, setIsBoundaryDrawerOpen] = useState(false);
  const [selectedBoundary, setSelectedBoundary] = useState<TerritoryBoundary | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boundaryToDelete, setBoundaryToDelete] = useState<TerritoryBoundary | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [regionFilter, setRegionFilter] = useState<string | null>(null);

  const { data: territories = [], isLoading } = useQuery<Territory[]>({
    queryKey: ['/api/territories-list'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: boundaries = [], isLoading: boundariesLoading } = useQuery<TerritoryBoundary[]>({
    queryKey: ['/api/territory-boundaries'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('POST', '/api/territories-list', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/territories-list'] });
      toast({ title: 'Territory Created', description: 'New territory has been added' });
      setIsDrawerOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create territory', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest('PATCH', `/api/territories-list/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/territories-list'] });
      toast({ title: 'Territory Updated' });
      setIsDrawerOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update territory', variant: 'destructive' });
    },
  });

  const createBoundaryMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('POST', '/api/territory-boundaries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/territory-boundaries'] });
      toast({ title: 'Boundary Created', description: 'New boundary has been added' });
      setIsBoundaryDrawerOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create boundary', variant: 'destructive' });
    },
  });

  const updateBoundaryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest('PATCH', `/api/territory-boundaries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/territory-boundaries'] });
      toast({ title: 'Boundary Updated' });
      setIsBoundaryDrawerOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update boundary', variant: 'destructive' });
    },
  });

  const deleteBoundaryMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/territory-boundaries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/territory-boundaries'] });
      toast({ title: 'Boundary Deleted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete boundary', variant: 'destructive' });
    },
  });

  const formFields: FormField[] = [
    { name: 'name', label: 'Territory Name', type: 'text', required: true },
    { name: 'code', label: 'Territory Code', type: 'text', required: true },
    { name: 'region', label: 'Region', type: 'select', required: true, options: [
      { value: 'North', label: 'North' },
      { value: 'South', label: 'South' },
      { value: 'East', label: 'East' },
      { value: 'West', label: 'West' },
      { value: 'Central', label: 'Central' },
    ]},
    { name: 'state', label: 'State', type: 'text', required: true },
    { name: 'managerId', label: 'Territory Manager', type: 'select', options: users.map(u => ({ value: String(u.id), label: u.name })) },
  ];

  const boundaryFormFields: FormField[] = [
    {
      name: 'territoryId',
      label: 'Territory',
      type: 'select',
      required: true,
      options: territories.map(t => ({ value: String(t.id), label: `${t.name} (${t.code})` })),
    },
    {
      name: 'boundaryType',
      label: 'Boundary Type',
      type: 'select',
      required: true,
      options: [
        { value: 'pincode_range', label: 'Pincode Range' },
        { value: 'city_list', label: 'City List' },
        { value: 'district_list', label: 'District List' },
        { value: 'custom', label: 'Custom' },
      ],
    },
    {
      name: 'label',
      label: 'Label',
      type: 'text',
      required: true,
      placeholder: 'e.g. Mumbai Pincodes 400001-400099',
    },
    {
      name: 'values',
      label: 'Values',
      type: 'textarea',
      required: true,
      placeholder: '["400001", "400002"] or [{"from": "400001", "to": "400099"}]',
      helpText: 'Enter a valid JSON array',
    },
  ];

  const columns: Column<Territory>[] = [
    { key: 'code', header: 'Code', sortable: true, render: (item) => <span className="font-mono font-medium" data-testid={`text-territory-${item.id}`}>{item.code}</span> },
    { key: 'name', header: 'Territory', sortable: true },
    { key: 'region', header: 'Region' },
    { key: 'state', header: 'State' },
    { key: 'managerId', header: 'Manager', render: (item) => {
      const manager = users.find(u => u.id === item.managerId);
      return manager?.name || '-';
    }},
    { key: 'isActive', header: 'Status', render: (item) => <StatusPill status={item.isActive ? 'active' : 'inactive'} /> },
  ];

  const boundaryTypeLabels: Record<string, string> = {
    pincode_range: 'Pincode Range',
    city_list: 'City List',
    district_list: 'District List',
    custom: 'Custom',
  };

  const boundaryColumns: Column<TerritoryBoundary>[] = [
    {
      key: 'territoryId',
      header: 'Territory',
      render: (item) => {
        const territory = territories.find(t => t.id === item.territoryId);
        return <span data-testid={`text-boundary-territory-${item.id}`}>{territory?.name || `ID: ${item.territoryId}`}</span>;
      },
    },
    {
      key: 'boundaryType',
      header: 'Type',
      render: (item) => (
        <Badge variant="secondary" data-testid={`badge-boundary-type-${item.id}`}>
          {boundaryTypeLabels[item.boundaryType] || item.boundaryType}
        </Badge>
      ),
    },
    { key: 'label', header: 'Label' },
    {
      key: 'values',
      header: 'Values',
      render: (item) => {
        const valStr = JSON.stringify(item.values);
        const truncated = valStr.length > 50 ? valStr.slice(0, 50) + '...' : valStr;
        return <span className="font-mono text-xs text-muted-foreground" data-testid={`text-boundary-values-${item.id}`}>{truncated}</span>;
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item) => <StatusPill status={item.isActive ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleEditBoundary(item); }}
            data-testid={`button-edit-boundary-${item.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); setBoundaryToDelete(item); setDeleteDialogOpen(true); }}
            data-testid={`button-delete-boundary-${item.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = [
    { title: 'Total Territories', value: territories.length.toString(), subtitle: 'Defined areas', color: 'blue' as const },
    { title: 'Active', value: territories.filter(t => t.isActive).length.toString(), subtitle: 'Operational', color: 'green' as const },
    { title: 'Regions Covered', value: [...new Set(territories.map(t => t.region).filter(Boolean))].length.toString(), subtitle: 'Unique regions', color: 'yellow' as const },
    { title: 'States Covered', value: [...new Set(territories.map(t => t.state).filter(Boolean))].length.toString(), subtitle: 'Unique states', color: 'purple' as const },
  ];

  const regionColors: Record<string, string> = {
    'North': 'bg-blue-500',
    'South': 'bg-green-500',
    'East': 'bg-purple-500',
    'West': 'bg-orange-500',
    'Central': 'bg-pink-500',
  };

  const regionLightColors: Record<string, string> = {
    'North': 'bg-blue-100 dark:bg-blue-900/30',
    'South': 'bg-green-100 dark:bg-green-900/30',
    'East': 'bg-purple-100 dark:bg-purple-900/30',
    'West': 'bg-orange-100 dark:bg-orange-900/30',
    'Central': 'bg-pink-100 dark:bg-pink-900/30',
  };

  const territoriesByRegion = territories.reduce((acc, t) => {
    const region = t.region || 'Unassigned';
    if (!acc[region]) acc[region] = [];
    acc[region].push(t);
    return acc;
  }, {} as Record<string, Territory[]>);

  const allRegions = ['North', 'South', 'East', 'West', 'Central'];

  const maxRegionCount = Math.max(...allRegions.map(r => (territoriesByRegion[r]?.length || 0)), 1);

  const mrUsers = users.filter(u => u.role?.includes('Medical Representative') || u.role?.includes('MR'));

  const filteredTerritories = regionFilter
    ? territories.filter(t => t.region === regionFilter)
    : territories;

  const handleCreate = () => {
    setSelectedTerritory(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (territory: Territory) => {
    setSelectedTerritory(territory);
    setIsDrawerOpen(true);
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    const payload = {
      code: data.code as string,
      name: data.name as string,
      region: data.region as string,
      state: data.state as string,
      managerId: data.managerId ? parseInt(data.managerId as string) : null,
      isActive: true,
    };

    if (selectedTerritory) {
      updateMutation.mutate({ id: selectedTerritory.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCreateBoundary = () => {
    setSelectedBoundary(null);
    setIsBoundaryDrawerOpen(true);
  };

  const handleEditBoundary = (boundary: TerritoryBoundary) => {
    setSelectedBoundary(boundary);
    setIsBoundaryDrawerOpen(true);
  };

  const handleBoundarySubmit = (data: Record<string, unknown>) => {
    let parsedValues: unknown;
    try {
      parsedValues = typeof data.values === 'string' ? JSON.parse(data.values as string) : data.values;
    } catch {
      toast({ title: 'Invalid JSON', description: 'Please enter valid JSON for values', variant: 'destructive' });
      return;
    }

    const payload = {
      territoryId: parseInt(data.territoryId as string),
      boundaryType: data.boundaryType as string,
      label: data.label as string,
      values: parsedValues,
      isActive: true,
    };

    if (selectedBoundary) {
      updateBoundaryMutation.mutate({ id: selectedBoundary.id, data: payload });
    } else {
      createBoundaryMutation.mutate(payload);
    }
  };

  const handleDeleteBoundary = () => {
    if (boundaryToDelete) {
      deleteBoundaryMutation.mutate(boundaryToDelete.id);
      setBoundaryToDelete(null);
    }
  };

  const handleRegionClick = (region: string) => {
    if (regionFilter === region) {
      setRegionFilter(null);
    } else {
      setRegionFilter(region);
      setActiveTab('list');
    }
  };

  const rowActions = [
    { label: 'Edit', onClick: handleEdit },
    { label: 'Deactivate', onClick: (territory: Territory) => updateMutation.mutate({ id: territory.id, data: { isActive: !territory.isActive } }) },
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
        title="Territories"
        description="Manage sales territories and regions"
        actions={
          <Button onClick={handleCreate} data-testid="button-create-territory">
            <Plus className="h-4 w-4 mr-2" />
            Add Territory
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== 'list') setRegionFilter(null); }}>
        <TabsList>
          <TabsTrigger value="list" data-testid="tab-list">
            <List className="h-4 w-4 mr-2" /> List View
          </TabsTrigger>
          <TabsTrigger value="heatmap" data-testid="tab-heatmap">
            <Grid className="h-4 w-4 mr-2" /> Region Heatmap
          </TabsTrigger>
          <TabsTrigger value="boundaries" data-testid="tab-boundaries">
            <Layers className="h-4 w-4 mr-2" /> Boundaries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          {regionFilter && (
            <div className="flex items-center gap-2" data-testid="region-filter-indicator">
              <Badge variant="secondary">
                <Map className="h-3 w-3 mr-1" />
                Filtered by: {regionFilter}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setRegionFilter(null)} data-testid="button-clear-region-filter">
                Clear filter
              </Button>
            </div>
          )}

          <Card data-testid="config-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid="config-auto-assign">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Auto-assign leads based on pincode</p>
                    <p className="text-xs text-muted-foreground">Leads are automatically routed to the matching territory based on pincode boundaries</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid="config-mr-coverage">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">MR coverage requirement: minimum 1 per territory</p>
                    <p className="text-xs text-muted-foreground">Each territory must have at least one Medical Representative assigned</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DataTable
            columns={columns}
            data={filteredTerritories}
            rowActions={rowActions}
            onRowClick={handleEdit}
            emptyMessage="No territories found. Add your first territory to get started."
          />
        </TabsContent>

        <TabsContent value="heatmap" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Region Coverage Heatmap</CardTitle>
              <CardDescription>Visual overview of territory distribution across regions. Click a region to filter the list view.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                {allRegions.map(region => (
                  <div key={region} className="flex items-center gap-2" data-testid={`legend-${region.toLowerCase()}`}>
                    <div className={`w-4 h-4 rounded ${regionColors[region]}`} />
                    <span className="text-sm">{region}</span>
                    <Badge variant="secondary" className="text-xs">{territoriesByRegion[region]?.length || 0}</Badge>
                  </div>
                ))}
              </div>

              <div className="mb-6 space-y-2" data-testid="density-indicator">
                <p className="text-sm font-medium text-muted-foreground">Density</p>
                {allRegions.map(region => {
                  const count = territoriesByRegion[region]?.length || 0;
                  const pct = maxRegionCount > 0 ? (count / maxRegionCount) * 100 : 0;
                  return (
                    <div key={region} className="flex items-center gap-3" data-testid={`density-bar-${region.toLowerCase()}`}>
                      <span className="text-xs w-16 text-muted-foreground">{region}</span>
                      <div className="flex-1 h-3 rounded bg-muted overflow-visible">
                        <div
                          className={`h-full rounded ${regionColors[region]} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs w-6 text-right font-mono">{count}</span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allRegions.map(region => {
                  const regionTerritories = territoriesByRegion[region] || [];
                  const intensity = regionTerritories.length;
                  const opacityClass = intensity === 0 ? 'opacity-30' : intensity >= maxRegionCount * 0.7 ? 'opacity-100' : intensity >= maxRegionCount * 0.4 ? 'opacity-70' : 'opacity-50';
                  
                  return (
                    <Card
                      key={region}
                      className={`${regionLightColors[region]} ${opacityClass} transition-opacity cursor-pointer`}
                      data-testid={`heatmap-region-${region.toLowerCase()}`}
                      onClick={() => handleRegionClick(region)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <CardTitle className="text-base flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${regionColors[region]}`} />
                            {region}
                          </CardTitle>
                          <Badge variant={intensity > 0 ? 'default' : 'secondary'}>
                            {intensity} {intensity === 1 ? 'territory' : 'territories'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {regionTerritories.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No territories in this region</p>
                        ) : (
                          <div className="space-y-2">
                            {regionTerritories.slice(0, 5).map(t => (
                              <div 
                                key={t.id} 
                                className="flex items-center justify-between gap-2 p-2 rounded bg-background/50 cursor-pointer hover:bg-background transition-colors flex-wrap"
                                onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                                data-testid={`heatmap-territory-${t.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm font-medium">{t.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{t.state}</span>
                              </div>
                            ))}
                            {regionTerritories.length > 5 && (
                              <p className="text-xs text-muted-foreground text-center pt-1">
                                +{regionTerritories.length - 5} more territories
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="mt-6" data-testid="heatmap-summary">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div data-testid="summary-total-territories">
                      <p className="text-2xl font-bold">{territories.length}</p>
                      <p className="text-sm text-muted-foreground">Total Territories</p>
                    </div>
                    <div data-testid="summary-total-mrs">
                      <p className="text-2xl font-bold">{mrUsers.length}</p>
                      <p className="text-sm text-muted-foreground">MRs Assigned</p>
                    </div>
                    <div data-testid="summary-avg-doctors">
                      <p className="text-2xl font-bold">--</p>
                      <p className="text-sm text-muted-foreground">Avg Doctors / Territory</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boundaries" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold" data-testid="text-boundaries-title">Territory Boundaries</h3>
              <p className="text-sm text-muted-foreground">Define geographic boundaries for each territory</p>
            </div>
            <Button onClick={handleCreateBoundary} data-testid="button-add-boundary">
              <Plus className="h-4 w-4 mr-2" />
              Add Boundary
            </Button>
          </div>

          <DataTable
            columns={boundaryColumns}
            data={boundaries}
            onRowClick={handleEditBoundary}
            isLoading={boundariesLoading}
            emptyMessage="No boundaries defined yet. Add a boundary to define territory coverage areas."
          />
        </TabsContent>
      </Tabs>

      <CreateEditDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedTerritory ? 'Edit Territory' : 'Add Territory'}
        fields={formFields}
        initialData={selectedTerritory ? {
          ...selectedTerritory,
          managerId: selectedTerritory.managerId ? String(selectedTerritory.managerId) : '',
        } : undefined}
        onSubmit={handleSubmit}
      />

      <CreateEditDrawer
        open={isBoundaryDrawerOpen}
        onClose={() => setIsBoundaryDrawerOpen(false)}
        title={selectedBoundary ? 'Edit Boundary' : 'Add Boundary'}
        fields={boundaryFormFields}
        initialData={selectedBoundary ? {
          ...selectedBoundary,
          territoryId: String(selectedBoundary.territoryId),
          values: JSON.stringify(selectedBoundary.values, null, 2),
        } : undefined}
        onSubmit={handleBoundarySubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Boundary"
        description={`Are you sure you want to delete the boundary "${boundaryToDelete?.label}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteBoundary}
      />
    </div>
  );
};

export default Territories;
