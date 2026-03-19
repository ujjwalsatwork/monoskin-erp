import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SalesDataPoint {
  month: string;
  revenue: number;
  orders: number;
  units?: number;
}

interface SalesChartProps {
  data: SalesDataPoint[];
  title?: string;
  chartType?: 'line' | 'area' | 'bar';
  showControls?: boolean;
  height?: number;
}

export function SalesChart({ 
  data, 
  title = 'Sales Performance',
  chartType: initialChartType = 'area',
  showControls = true,
  height = 250
}: SalesChartProps) {
  const [chartType, setChartType] = useState(initialChartType);
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  const currentTotal = data.slice(-3).reduce((sum, d) => sum + d.revenue, 0);
  const previousTotal = data.slice(-6, -3).reduce((sum, d) => sum + d.revenue, 0);
  const growthPercent = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1) : 0;
  const trend = currentTotal > previousTotal ? 'up' : currentTotal < previousTotal ? 'down' : 'flat';

  const renderChart = () => {
    const dataKey = metric;
    const color = 'hsl(var(--primary))';

    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" tick={{ fill: 'currentColor' }} />
            <YAxis className="text-xs" tick={{ fill: 'currentColor' }} tickFormatter={metric === 'revenue' ? formatCurrency : undefined} />
            <Tooltip 
              formatter={(value: number) => metric === 'revenue' ? formatCurrency(value) : value}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ fill: color }} />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" tick={{ fill: 'currentColor' }} />
            <YAxis className="text-xs" tick={{ fill: 'currentColor' }} tickFormatter={metric === 'revenue' ? formatCurrency : undefined} />
            <Tooltip 
              formatter={(value: number) => metric === 'revenue' ? formatCurrency(value) : value}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      default:
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" tick={{ fill: 'currentColor' }} />
            <YAxis className="text-xs" tick={{ fill: 'currentColor' }} tickFormatter={metric === 'revenue' ? formatCurrency : undefined} />
            <Tooltip 
              formatter={(value: number) => metric === 'revenue' ? formatCurrency(value) : value}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`${color}30`} strokeWidth={2} />
          </AreaChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-display font-semibold">
              {formatCurrency(currentTotal)}
            </span>
            <span className={`flex items-center text-sm ${
              trend === 'up' ? 'text-primary' : 
              trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {trend === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
              {trend === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
              {trend === 'flat' && <Minus className="h-4 w-4 mr-1" />}
              {growthPercent}%
            </span>
          </div>
        </div>
        {showControls && (
          <div className="flex gap-2">
            <Select value={metric} onValueChange={(v) => setMetric(v as 'revenue' | 'orders')}>
              <SelectTrigger className="w-[100px]" data-testid="select-chart-metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="orders">Orders</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={(v) => setChartType(v as 'line' | 'area' | 'bar')}>
              <SelectTrigger className="w-[80px]" data-testid="select-chart-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
