import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { DollarSign, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface AgeingBucket {
  range: string;
  amount: number;
  count: number;
  percentage?: number;
}

interface ARAgeingChartProps {
  data: AgeingBucket[];
  totalOutstanding: number;
  overdueAmount?: number;
  title?: string;
  chartType?: 'bar' | 'pie' | 'combined';
}

const bucketColors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

export function ARAgeingChart({
  data,
  totalOutstanding,
  overdueAmount = 0,
  title = 'AR Ageing Analysis',
  chartType = 'bar',
}: ARAgeingChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString()}`;
  };

  const overduePercentage = totalOutstanding > 0 ? ((overdueAmount / totalOutstanding) * 100).toFixed(1) : 0;
  
  const pieData = data.map((bucket, index) => ({
    name: bucket.range,
    value: bucket.amount,
    color: bucketColors[index] || bucketColors[bucketColors.length - 1],
  }));

  if (chartType === 'pie') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-display font-semibold">{formatCurrency(totalOutstanding)}</p>
            </div>
            {overdueAmount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {overduePercentage}% Overdue
              </Badge>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {data.map((bucket, index) => (
              <div key={bucket.range} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: bucketColors[index] }} 
                />
                <span className="text-muted-foreground">{bucket.range}:</span>
                <span className="font-medium">{formatCurrency(bucket.amount)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartType === 'combined') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-display font-semibold">{formatCurrency(totalOutstanding)}</span>
            {overdueAmount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {overduePercentage}% Overdue
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {data.map((bucket, index) => (
              <div 
                key={bucket.range} 
                className="text-center p-3 rounded-lg"
                style={{ backgroundColor: `${bucketColors[index]}20` }}
              >
                <p className="text-xs text-muted-foreground">{bucket.range}</p>
                <p className="font-semibold" style={{ color: bucketColors[index] }}>
                  {formatCurrency(bucket.amount)}
                </p>
                <p className="text-xs text-muted-foreground">{bucket.count} invoices</p>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="range" tick={{ fill: 'currentColor', fontSize: 11 }} />
              <YAxis tick={{ fill: 'currentColor' }} tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={bucketColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {title}
          </CardTitle>
          <p className="text-2xl font-display font-semibold mt-1">{formatCurrency(totalOutstanding)}</p>
        </div>
        {overdueAmount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {formatCurrency(overdueAmount)} Overdue
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="range" tick={{ fill: 'currentColor', fontSize: 12 }} />
            <YAxis tick={{ fill: 'currentColor' }} tickFormatter={formatCurrency} />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={bucketColors[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
