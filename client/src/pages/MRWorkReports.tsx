import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Calendar, TrendingUp, Users, Target, BarChart3, Loader2, MapPin, Trophy, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import type { MR } from '@shared/schema';

function getPerformanceBucket(mr: MR): string {
  const conversionRate = mr.leadsAssigned > 0 ? (mr.conversions / mr.leadsAssigned) * 100 : 0;
  if (conversionRate >= 20) return 'Top Performer';
  if (conversionRate >= 10) return 'On Track';
  if (conversionRate >= 5) return 'At Risk';
  return 'Under Performing';
}

const ZONE_COLORS: Record<string, string> = {
  North: '#3b82f6',
  South: '#10b981',
  East: '#f59e0b',
  West: '#8b5cf6',
  Central: '#ef4444',
  Northeast: '#06b6d4',
  Northwest: '#ec4899',
};

const formatCurrency = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString()}`;
};

export default function MRWorkReports() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('this-month');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  const { data: allMRs = [], isLoading } = useQuery<MR[]>({
    queryKey: ['/api/mrs'],
  });

  const { data: territories = [] } = useQuery<string[]>({
    queryKey: ['/api/territories'],
  });

  const { data: trendResponse } = useQuery<{ source: string; activeMRCount: number; trend: { month: string; revenue: number; conversions: number }[] }>({
    queryKey: ['/api/mr-analytics/trend'],
  });

  // Derive unique zones from MR region field
  const zones = [...new Set(allMRs.map(mr => mr.region).filter(Boolean))].sort();

  // Filter MRs
  const filteredMRs = allMRs.filter(mr => {
    if (zoneFilter !== 'all' && mr.region !== zoneFilter) return false;
    if (territoryFilter !== 'all' && mr.territory !== territoryFilter) return false;
    if (managerFilter !== 'all' && mr.reportingManager !== managerFilter) return false;
    return true;
  });

  // Zone-level aggregation
  const zoneData = zones.map(zone => {
    const mrs = allMRs.filter(mr => mr.region === zone);
    const revenue = mrs.reduce((s, m) => s + Number(m.revenueAttributed), 0);
    const conversions = mrs.reduce((s, m) => s + m.conversions, 0);
    const visits = mrs.reduce((s, m) => s + m.visitsLogged, 0);
    const leads = mrs.reduce((s, m) => s + m.leadsAssigned, 0);
    const topPerformers = mrs.filter(m => getPerformanceBucket(m) === 'Top Performer').length;
    const convRate = leads > 0 ? Math.round((conversions / leads) * 100) : 0;
    return { zone, revenue, conversions, visits, leads, topPerformers, convRate, mrCount: mrs.length };
  }).sort((a, b) => b.revenue - a.revenue);

  // Radar data: normalised per-zone metrics
  const maxRevenue = Math.max(...zoneData.map(z => z.revenue), 1);
  const maxVisits  = Math.max(...zoneData.map(z => z.visits), 1);
  const maxConversions = Math.max(...zoneData.map(z => z.conversions), 1);
  const radarData  = zoneData.map(z => ({
    zone: z.zone,
    Revenue: Math.round((z.revenue / maxRevenue) * 100),
    Visits:  Math.round((z.visits  / maxVisits) * 100),
    Conversions: Math.round((z.conversions / maxConversions) * 100),
    'Conv Rate': z.convRate,
  }));

  // Calculate KPIs
  const totalLeadsAssigned = filteredMRs.reduce((sum, mr) => sum + mr.leadsAssigned, 0);
  const totalConversions = filteredMRs.reduce((sum, mr) => sum + mr.conversions, 0);
  const totalVisits = filteredMRs.reduce((sum, mr) => sum + mr.visitsLogged, 0);
  const totalRevenue = filteredMRs.reduce((sum, mr) => sum + Number(mr.revenueAttributed), 0);
  const avgConversionRate = totalLeadsAssigned > 0 ? (totalConversions / totalLeadsAssigned * 100).toFixed(1) : 0;

  // Chart data
  const performanceByMR = filteredMRs.map(mr => ({
    name: mr.name.split(' ')[0],
    revenue: Number(mr.revenueAttributed) / 1000,
    conversions: mr.conversions,
    visits: mr.visitsLogged,
  }));

  const bucketDistribution = [
    { name: 'Top Performer', value: filteredMRs.filter(mr => getPerformanceBucket(mr) === 'Top Performer').length, color: '#22c55e' },
    { name: 'On Track', value: filteredMRs.filter(mr => getPerformanceBucket(mr) === 'On Track').length, color: '#3b82f6' },
    { name: 'At Risk', value: filteredMRs.filter(mr => getPerformanceBucket(mr) === 'At Risk').length, color: '#f59e0b' },
    { name: 'Under Performing', value: filteredMRs.filter(mr => getPerformanceBucket(mr) === 'Under Performing').length, color: '#ef4444' },
  ].filter(b => b.value > 0);

  const trendData = trendResponse?.trend || [];

  const managers = [...new Set(allMRs.map(mr => mr.reportingManager))];

  // Table columns
  const columns = [
    {
      key: 'name',
      header: 'MR Name',
      render: (item: MR) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.territory}</p>
        </div>
      ),
    },
    {
      key: 'leadsAssigned',
      header: 'Leads',
      render: (item: MR) => <span className="font-mono">{item.leadsAssigned}</span>,
    },
    {
      key: 'conversions',
      header: 'Conversions',
      render: (item: MR) => <span className="font-mono">{item.conversions}</span>,
    },
    {
      key: 'conversionRate',
      header: 'Conv. Rate',
      render: (item: MR) => (
        <span className="font-mono">{item.leadsAssigned > 0 ? ((item.conversions / item.leadsAssigned) * 100).toFixed(1) : '0.0'}%</span>
      ),
    },
    {
      key: 'visits',
      header: 'Visits',
      render: (item: MR) => <span className="font-mono">{item.visitsLogged}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (item: MR) => <span className="font-mono">₹{(Number(item.revenueAttributed) / 1000).toFixed(0)}K</span>,
    },
    {
      key: 'bucket',
      header: 'Performance',
      render: (item: MR) => <StatusPill status={getPerformanceBucket(item)} />,
    },
  ];

  const handleExport = () => {
    toast({
      title: 'Export Started',
      description: 'MR Work Reports export has been queued. Check Export Center for progress.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="MR Work Reports"
        description="Performance analytics and work reports for Medical Representatives"
        actions={
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1">
          <MapPin className="h-3.5 w-3.5" /> Filters:
        </div>
        <Select value={dateRange} onValueChange={setDateRange} data-testid="select-date-range">
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-quarter">This Quarter</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={zoneFilter} onValueChange={setZoneFilter} data-testid="select-zone-filter">
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="All Zones / Regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones / Regions</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={territoryFilter} onValueChange={setTerritoryFilter} data-testid="select-territory-filter">
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Territories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Territories</SelectItem>
            {territories.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={managerFilter} onValueChange={setManagerFilter} data-testid="select-manager-filter">
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Managers</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(zoneFilter !== 'all' || territoryFilter !== 'all' || managerFilter !== 'all') && (
          <button
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground ml-auto"
            onClick={() => { setZoneFilter('all'); setTerritoryFilter('all'); setManagerFilter('all'); }}
            data-testid="btn-clear-filters"
          >
            Clear filters
          </button>
        )}

        {zoneFilter !== 'all' && (
          <Badge className="h-8 px-3 rounded-lg" style={{ backgroundColor: ZONE_COLORS[zoneFilter] || '#3b82f6', color: 'white' }}
            data-testid="badge-active-zone">
            <MapPin className="h-3 w-3 mr-1" /> {zoneFilter} Zone
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Active MRs"
          value={filteredMRs.filter(mr => mr.status === 'Active').length}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Total Leads"
          value={totalLeadsAssigned}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          title="Conversions"
          value={totalConversions}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{ value: Number(avgConversionRate), label: '% rate' }}
        />
        <StatCard
          title="Total Visits"
          value={totalVisits}
          icon={<Calendar className="h-5 w-5" />}
        />
        <StatCard
          title="Revenue"
          value={`₹${(totalRevenue / 100000).toFixed(1)}L`}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      {/* Zone Performance Summary Cards */}
      {zoneData.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Zone / Region Summary</h3>
            <Badge variant="secondary" className="text-[10px]">{zoneData.length} zones</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {zoneData.map((z, i) => {
              const isSelected = zoneFilter === z.zone;
              const zoneColor = ZONE_COLORS[z.zone] || '#6366f1';
              const rank = i + 1;
              return (
                <button
                  key={z.zone}
                  onClick={() => setZoneFilter(zoneFilter === z.zone ? 'all' : z.zone)}
                  className={[
                    'text-left p-4 rounded-xl border transition-all',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30',
                  ].join(' ')}
                  data-testid={`card-zone-${z.zone.toLowerCase()}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: zoneColor }} />
                      <span className="text-sm font-semibold">{z.zone}</span>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">#{rank}</span>
                  </div>
                  <p className="text-base font-bold mb-0.5">{formatCurrency(z.revenue)}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span>{z.mrCount} MRs</span>
                    <span>{z.conversions} conv.</span>
                    <span>{z.convRate}% rate</span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.round((z.revenue / (zoneData[0]?.revenue || 1)) * 100)}%`, backgroundColor: zoneColor }} />
                  </div>
                  {z.topPerformers > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">{z.topPerformers} top performer{z.topPerformers > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Zone vs Zone Comparison Charts */}
      {zoneData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Zone bar chart */}
          <Card data-testid="card-zone-revenue-chart">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Revenue by Zone
              </CardTitle>
              <CardDescription className="text-xs">Ranked zone-level revenue contribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={zoneData} layout="vertical" margin={{ right: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatCurrency} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="zone" tick={{ fontSize: 11 }} width={60} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, formatter: formatCurrency }}>
                    {zoneData.map((z) => (
                      <Cell key={z.zone} fill={ZONE_COLORS[z.zone] || 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Multi-metric Radar */}
          <Card data-testid="card-zone-radar-chart">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Multi-metric Zone Radar
              </CardTitle>
              <CardDescription className="text-xs">Relative performance across revenue, visits, conversions (normalised 0–100)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={[
                  { metric: 'Revenue',  ...Object.fromEntries(radarData.map(r => [r.zone, r.Revenue])) },
                  { metric: 'Visits',   ...Object.fromEntries(radarData.map(r => [r.zone, r.Visits])) },
                  { metric: 'Conv.',    ...Object.fromEntries(radarData.map(r => [r.zone, r.Conversions])) },
                  { metric: 'Conv Rate',...Object.fromEntries(radarData.map(r => [r.zone, r['Conv Rate']])) },
                ]}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  {radarData.slice(0, 5).map((r) => (
                    <Radar key={r.zone} name={r.zone} dataKey={r.zone}
                      stroke={ZONE_COLORS[r.zone] || 'hsl(var(--primary))'}
                      fill={ZONE_COLORS[r.zone] || 'hsl(var(--primary))'}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Zone Detail Table */}
      {zoneData.length > 0 && (
        <Card data-testid="card-zone-table">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Zone Performance Details</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Zone / Region</TableHead>
                  <TableHead className="text-right">MRs</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Top Performers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zoneData.map((z, i) => {
                  const prevRevenue = i > 0 ? zoneData[i - 1].revenue : z.revenue;
                  const diff = i === 0 ? null : z.revenue - prevRevenue;
                  return (
                    <TableRow key={z.zone} className={zoneFilter === z.zone ? 'bg-primary/5' : ''} data-testid={`row-zone-${z.zone.toLowerCase()}`}>
                      <TableCell>
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{i + 1}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ZONE_COLORS[z.zone] || '#6366f1' }} />
                          <span className="font-medium">{z.zone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{z.mrCount}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(z.revenue)}</TableCell>
                      <TableCell className="text-right">{z.conversions}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={z.convRate >= 20 ? 'outline' : z.convRate >= 10 ? 'secondary' : 'destructive'}>
                          {z.convRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{z.visits}</TableCell>
                      <TableCell className="text-right">
                        {z.topPerformers > 0
                          ? <span className="flex items-center gap-1 justify-end text-amber-600 dark:text-amber-400 font-medium">
                              <Trophy className="h-3 w-3" /> {z.topPerformers}
                            </span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by MR */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by MR (₹K)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceByMR}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Bucket Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bucketDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {bucketDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue (₹K)" />
              <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="hsl(var(--stat-green))" strokeWidth={2} name="Conversions" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drilldown Table */}
      <Card>
        <CardHeader>
          <CardTitle>MR Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={[...filteredMRs].sort((a, b) => Number(b.revenueAttributed) - Number(a.revenueAttributed))}
            columns={columns}
            emptyMessage="No MRs found"
          />
        </CardContent>
      </Card>
    </div>
  );
}
