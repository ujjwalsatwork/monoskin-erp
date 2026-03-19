import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, TrendingUp, Loader2, MapPin, Users, Target, BarChart3, ArrowUpRight, ArrowDownRight, Layers, Trophy, Flame, Zap, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

interface DetailedAnalytics {
  segments: { segment: string; revenue: number; orders: number; growth: number }[];
  areas: { area: string; revenue: number; orders: number; doctors: number; penetration: number }[];
  timeComparison: {
    mtd: { revenue: number; orders: number; label: string };
    qtd: { revenue: number; orders: number; label: string };
    ytd: { revenue: number; orders: number; label: string };
    lastYtd: { revenue: number; orders: number; label: string };
    ytdGrowth: number;
  };
  geoHeatmap: { region: string; revenue: number; orders: number; intensity: number }[];
  productLifecycle: { name: string; sku: string; stage: string; totalOrders: number; recentOrders: number; revenue: number }[];
  mrFunnel: { stage: string; count: number; value: number }[];
  mrLeaderboard: { id: number; name: string; region: string; visits: number; orders: number; revenue: number; target: number; achievement: number; conversion: number }[];
}

interface BasicAnalytics {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalProducts: number;
    totalCustomers: number;
  };
  monthlyTrend: { month: string; revenue: number; orders: number }[];
  topProducts: { name: string; revenue: number; quantity: number }[];
  topCustomers: { name: string; revenue: number; orders: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8b5cf6', '#ec4899', '#06b6d4'];
const STAGE_COLORS: Record<string, string> = { Launch: '#3b82f6', Growth: '#10b981', Maturity: '#f59e0b', Decline: '#ef4444' };

const formatCurrency = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString()}`;
};

// Penetration band helpers
function getPenetrationBand(pct: number): { label: string; color: string; bg: string; icon: typeof Flame } {
  if (pct >= 70) return { label: 'Strong', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-950/40 border-green-200 dark:border-green-800', icon: Flame };
  if (pct >= 40) return { label: 'Medium', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', icon: Zap };
  return { label: 'Weak', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950/40 border-red-200 dark:border-red-800', icon: AlertCircle };
}

function getIntensityGradient(intensity: number): string {
  if (intensity >= 80) return 'from-green-500 to-green-600';
  if (intensity >= 60) return 'from-emerald-400 to-green-500';
  if (intensity >= 40) return 'from-amber-400 to-amber-500';
  if (intensity >= 20) return 'from-orange-400 to-orange-500';
  return 'from-red-400 to-red-500';
}

const SalesAnalytics = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [geoRegionFilter, setGeoRegionFilter] = useState<string>('all');
  const [geoMetric, setGeoMetric] = useState<'revenue' | 'orders' | 'penetration'>('revenue');

  const { data: basic, isLoading: basicLoading } = useQuery<BasicAnalytics>({
    queryKey: ['/api/sales-analytics'],
  });

  const { data: detailed, isLoading: detailedLoading } = useQuery<DetailedAnalytics>({
    queryKey: ['/api/sales-analytics/detailed'],
  });

  const handleExport = () => {
    toast({ title: 'Export Started', description: 'Generating sales analytics report...' });
  };

  if (basicLoading || detailedLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const summary = basic?.summary || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalProducts: 0, totalCustomers: 0 };
  const monthlyTrend = basic?.monthlyTrend || [];
  const topProducts = basic?.topProducts || [];
  const topCustomers = basic?.topCustomers || [];
  const tc = detailed?.timeComparison;

  const stats = [
    { title: 'Total Revenue', value: formatCurrency(summary.totalRevenue), subtitle: 'Last 12 months', color: 'blue' as const, trend: tc ? { value: tc.ytdGrowth, isPositive: tc.ytdGrowth >= 0 } : undefined },
    { title: 'Total Orders', value: summary.totalOrders.toLocaleString(), subtitle: 'Last 12 months', color: 'green' as const },
    { title: 'Avg Order Value', value: formatCurrency(summary.avgOrderValue), subtitle: 'Per order', color: 'yellow' as const },
    { title: 'Total Customers', value: summary.totalCustomers.toString(), subtitle: 'Active', color: 'purple' as const },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Sales Analytics"
        description="Comprehensive sales performance insights"
        actions={
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-sales-analytics">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="segments" data-testid="tab-segments">
            <Layers className="h-4 w-4 mr-1" />
            Segments
          </TabsTrigger>
          <TabsTrigger value="geography" data-testid="tab-geography">
            <MapPin className="h-4 w-4 mr-1" />
            Geography
          </TabsTrigger>
          <TabsTrigger value="lifecycle" data-testid="tab-lifecycle">
            <TrendingUp className="h-4 w-4 mr-1" />
            Product Lifecycle
          </TabsTrigger>
          <TabsTrigger value="mr-performance" data-testid="tab-mr-performance">
            <Trophy className="h-4 w-4 mr-1" />
            MR Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {tc && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { ...tc.mtd, key: 'mtd' },
                { ...tc.qtd, key: 'qtd' },
                { ...tc.ytd, key: 'ytd' },
                { ...tc.lastYtd, key: 'lastYtd' },
              ].map((period) => (
                <Card key={period.key} data-testid={`card-time-${period.key}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">{period.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-mono" data-testid={`text-revenue-${period.key}`}>{formatCurrency(period.revenue)}</p>
                    <p className="text-sm text-muted-foreground">{period.orders} orders</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {tc && tc.ytdGrowth !== 0 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {tc.ytdGrowth >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <span className="text-sm">
                    YTD Growth: <span className={`font-bold ${tc.ytdGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{tc.ytdGrowth}%</span> vs Last Year Same Period
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Monthly Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Products by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts.slice(0, 7)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topCustomers.slice(0, 8).map((customer, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="font-medium text-sm">{customer.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold text-sm">{formatCurrency(customer.revenue)}</div>
                        <div className="text-xs text-muted-foreground">{customer.orders} orders</div>
                      </div>
                    </div>
                  ))}
                  {topCustomers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No customer data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Segment Revenue Comparison</CardTitle>
                <CardDescription>Revenue by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={detailed?.segments || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="segment" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(value: number, name: string) => name === 'revenue' ? formatCurrency(value) : value} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Segment Distribution</CardTitle>
                <CardDescription>Order volume per segment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={detailed?.segments || []}
                        dataKey="orders"
                        nameKey="segment"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ segment, percent }) => `${segment} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(detailed?.segments || []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Segment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Growth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detailed?.segments || []).map((seg, i) => (
                    <TableRow key={i} data-testid={`row-segment-${i}`}>
                      <TableCell className="font-medium">{seg.segment}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(seg.revenue)}</TableCell>
                      <TableCell className="text-right">{seg.orders}</TableCell>
                      <TableCell className="text-right">
                        <span className={seg.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {seg.growth >= 0 ? '+' : ''}{seg.growth}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-6">
          {/* ── Geo filter bar ── */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Region Filters:
            </div>
            <Select value={geoRegionFilter} onValueChange={setGeoRegionFilter} data-testid="select-geo-region">
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {(detailed?.geoHeatmap || []).map(r => (
                  <SelectItem key={r.region} value={r.region}>{r.region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={geoMetric} onValueChange={(v) => setGeoMetric(v as typeof geoMetric)} data-testid="select-geo-metric">
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="orders">Orders</SelectItem>
                <SelectItem value="penetration">Penetration %</SelectItem>
              </SelectContent>
            </Select>
            {geoRegionFilter !== 'all' && (
              <button className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => setGeoRegionFilter('all')} data-testid="btn-clear-geo">
                Clear
              </button>
            )}
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-green-500" /> Strong ≥70%</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> Medium 40–70%</span>
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-500" /> Weak &lt;40%</span>
            </div>
          </div>

          {/* ── Heatmap KPI summary row ── */}
          {(detailed?.geoHeatmap || []).length > 0 && (() => {
            const hm = detailed!.geoHeatmap;
            const best  = [...hm].sort((a, b) => b.intensity - a.intensity)[0];
            const weak  = [...hm].sort((a, b) => a.intensity - b.intensity)[0];
            const topRev = [...hm].sort((a, b) => b.revenue - a.revenue)[0];
            const avgPen = Math.round(hm.reduce((s, r) => s + r.intensity, 0) / hm.length);
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Strongest Zone', value: best.region, sub: `${best.intensity}% intensity`, Icon: Flame, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/20' },
                  { label: 'Top Revenue Zone', value: topRev.region, sub: formatCurrency(topRev.revenue), Icon: Trophy, color: 'text-primary', bg: 'bg-primary/5' },
                  { label: 'Weakest Zone', value: weak.region, sub: `${weak.intensity}% intensity`, Icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20' },
                  { label: 'Avg Penetration', value: `${avgPen}%`, sub: `${hm.length} regions`, Icon: MapPin, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20' },
                ].map(({ label, value, sub, Icon, color, bg }) => (
                  <Card key={label} className={bg} data-testid={`card-geo-kpi-${label.toLowerCase().replace(/ /g, '-')}`}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                      <p className={`text-base font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}

          {/* ── Color-coded heatmap tiles ── */}
          <Card data-testid="card-region-heatmap">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Regional Sales Heatmap
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Showing {geoMetric === 'revenue' ? 'revenue contribution' : geoMetric === 'orders' ? 'order volume' : 'market penetration'} — click a region to highlight
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const hm = (detailed?.geoHeatmap || []).filter(r => geoRegionFilter === 'all' || r.region === geoRegionFilter);
                const maxRev = Math.max(...hm.map(r => r.revenue), 1);
                const maxOrd = Math.max(...hm.map(r => r.orders), 1);
                if (!hm.length) return <p className="text-sm text-muted-foreground text-center py-8">No data for selected region.</p>;
                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {hm.sort((a, b) => b.intensity - a.intensity).map((r, i) => {
                      const band = getPenetrationBand(r.intensity);
                      const BandIcon = band.icon;
                      const metricVal = geoMetric === 'revenue' ? r.revenue : geoMetric === 'orders' ? r.orders : r.intensity;
                      const metricMax  = geoMetric === 'revenue' ? maxRev : geoMetric === 'orders' ? maxOrd : 100;
                      const fillPct    = Math.max(5, Math.round((metricVal / metricMax) * 100));
                      const gradClass  = getIntensityGradient(r.intensity);
                      return (
                        <div key={r.region}
                          className={`relative overflow-hidden rounded-xl border p-4 transition-all cursor-default ${band.bg}`}
                          data-testid={`heatmap-tile-${i}`}
                        >
                          {/* Intensity fill strip at bottom */}
                          <div className="absolute inset-x-0 bottom-0 h-1">
                            <div className={`h-full bg-gradient-to-r ${gradClass} transition-all`} style={{ width: `${r.intensity}%` }} />
                          </div>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold leading-tight">{r.region}</p>
                              <p className="text-xs text-muted-foreground">#{i + 1} ranked</p>
                            </div>
                            <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${band.color} bg-white/60 dark:bg-black/30`}>
                              <BandIcon className="h-2.5 w-2.5" />
                              {band.label}
                            </span>
                          </div>
                          <p className="text-lg font-bold tabular-nums">
                            {geoMetric === 'revenue' ? formatCurrency(r.revenue) : geoMetric === 'orders' ? r.orders : `${r.intensity}%`}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                            <span>{r.orders} orders</span>
                            <span>·</span>
                            <span className={band.color}>{r.intensity}% intensity</span>
                          </div>
                          {/* Mini bar */}
                          <div className="mt-2 h-1 rounded-full bg-white/40 dark:bg-black/20 overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${gradClass}`} style={{ width: `${fillPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* ── Multi-axis radar ── */}
          {(detailed?.geoHeatmap || []).length > 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-geo-radar">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Multi-axis Region Radar
                  </CardTitle>
                  <CardDescription className="text-xs">Revenue, orders, and penetration compared across zones</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const hm = detailed!.geoHeatmap;
                    const maxRev = Math.max(...hm.map(r => r.revenue), 1);
                    const maxOrd = Math.max(...hm.map(r => r.orders), 1);
                    const radarRows = [
                      { metric: 'Revenue',     ...Object.fromEntries(hm.map(r => [r.region, Math.round((r.revenue / maxRev) * 100)])) },
                      { metric: 'Orders',      ...Object.fromEntries(hm.map(r => [r.region, Math.round((r.orders  / maxOrd) * 100)])) },
                      { metric: 'Penetration', ...Object.fromEntries(hm.map(r => [r.region, r.intensity])) },
                    ];
                    const RADAR_COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
                    return (
                      <ResponsiveContainer width="100%" height={260}>
                        <RadarChart data={radarRows}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                          {hm.slice(0, 5).map((r, i) => (
                            <Radar key={r.region} name={r.region} dataKey={r.region}
                              stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                              fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                              fillOpacity={0.1} strokeWidth={2}
                            />
                          ))}
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Area-wise revenue bar (existing, now in 2-col grid) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Area-wise Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={detailed?.areas || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatCurrency} />
                        <YAxis type="category" dataKey="area" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Area performance table ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Area Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Area</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Doctors</TableHead>
                    <TableHead className="text-right">Penetration</TableHead>
                    <TableHead className="text-right">Strength</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detailed?.areas || [])
                    .filter(a => geoRegionFilter === 'all' || a.area.toLowerCase().includes(geoRegionFilter.toLowerCase()))
                    .map((area, i) => {
                      const band = getPenetrationBand(area.penetration);
                      const BandIcon = band.icon;
                      return (
                        <TableRow key={i} data-testid={`row-area-${i}`}>
                          <TableCell className="font-medium">{area.area}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(area.revenue)}</TableCell>
                          <TableCell className="text-right">{area.orders}</TableCell>
                          <TableCell className="text-right">{area.doctors}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full bg-gradient-to-r ${getIntensityGradient(area.penetration)}`}
                                  style={{ width: `${area.penetration}%` }} />
                              </div>
                              <span className="text-xs font-mono">{area.penetration}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={`${band.color} text-[10px]`}>
                              <BandIcon className="h-2.5 w-2.5 mr-1" />{band.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Launch', 'Growth', 'Maturity', 'Decline'].map((stage) => {
              const count = (detailed?.productLifecycle || []).filter(p => p.stage === stage).length;
              return (
                <Card key={stage} data-testid={`card-lifecycle-${stage.toLowerCase()}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                      <span className="text-sm font-medium">{stage}</span>
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">products</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product Lifecycle Tracking</CardTitle>
              <CardDescription>Product stage classification based on order patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Total Orders</TableHead>
                    <TableHead className="text-right">Recent (3mo)</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detailed?.productLifecycle || []).map((product, i) => (
                    <TableRow key={i} data-testid={`row-product-lifecycle-${i}`}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{product.sku}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="gap-1"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[product.stage] }} />
                          {product.stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{product.totalOrders}</TableCell>
                      <TableCell className="text-right">{product.recentOrders}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(product.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  {(detailed?.productLifecycle || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No product lifecycle data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mr-performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  MR Sales Funnel
                </CardTitle>
                <CardDescription>Lead to revenue conversion pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(detailed?.mrFunnel || []).map((stage, i) => {
                    const maxVal = Math.max(...(detailed?.mrFunnel || []).map(s => s.count)) || 1;
                    const width = Math.max(20, (stage.count / maxVal) * 100);
                    return (
                      <div key={i} className="space-y-1" data-testid={`funnel-stage-${i}`}>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium">{stage.stage}</span>
                          <span className="text-sm font-mono">
                            {stage.stage === 'Revenue' ? formatCurrency(stage.value * 1000) : stage.count.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-8 rounded-md overflow-hidden bg-muted flex items-center">
                          <div
                            className="h-full rounded-md flex items-center justify-center text-xs font-medium text-primary-foreground"
                            style={{
                              width: `${width}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          >
                            {stage.stage === 'Revenue' ? formatCurrency(stage.value * 1000) : stage.count}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Top MRs by Achievement
                </CardTitle>
                <CardDescription>Target achievement percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(detailed?.mrLeaderboard || []).slice(0, 5).map((mr, i) => (
                    <div key={mr.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50" data-testid={`leaderboard-mr-${mr.id}`}>
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{mr.name}</p>
                        <p className="text-xs text-muted-foreground">{mr.region}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold">{mr.achievement}%</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(mr.revenue)}</p>
                      </div>
                    </div>
                  ))}
                  {(detailed?.mrLeaderboard || []).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No MR data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                MR Leaderboard
              </CardTitle>
              <CardDescription>Complete performance metrics for all medical representatives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Visits</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Achievement</TableHead>
                      <TableHead className="text-right">Conversion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailed?.mrLeaderboard || []).map((mr, i) => (
                      <TableRow key={mr.id} data-testid={`row-mr-${mr.id}`}>
                        <TableCell>
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {i + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{mr.name}</TableCell>
                        <TableCell className="text-muted-foreground">{mr.region}</TableCell>
                        <TableCell className="text-right">{mr.visits}</TableCell>
                        <TableCell className="text-right">{mr.orders}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(mr.revenue)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(mr.target)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={mr.achievement >= 80 ? 'outline' : mr.achievement >= 50 ? 'secondary' : 'destructive'}>
                            {mr.achievement}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{mr.conversion}%</TableCell>
                      </TableRow>
                    ))}
                    {(detailed?.mrLeaderboard || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No MR performance data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesAnalytics;
